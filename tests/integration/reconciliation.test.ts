import { afterAll,describe,expect,it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { createDatabase } from '../../src/db/client.js';
import { loadConfig } from '../../src/config/env.js';
import { buildApp } from '../../src/app.js';
import { createProfileRepository } from '../../src/modules/profile/repository.js';
import { createFinanceRepository } from '../../src/modules/finance/repository.js';
import { createInboxRepository } from '../../src/modules/finance/inbox-repository.js';
import { createFileImportRepository } from '../../src/modules/finance/import-repository.js';
import { createReconciliationRepository } from '../../src/modules/finance/reconciliation-repository.js';
import { createBudgetRepository } from '../../src/modules/finance/budget-repository.js';
import { createSafeSpendRepository } from '../../src/modules/finance/safe-spend-repository.js';
import { createNetWorthRepository } from '../../src/modules/finance/net-worth-repository.js';
import { signingFixture,testEnv } from '../helpers.js';

const config=loadConfig({...testEnv,TEST_DATABASE_URL:process.env.TEST_DATABASE_URL}),database=createDatabase(config);
let now=new Date('2026-10-19T12:00:00Z');
const finance=createFinanceRepository(database,()=>now),inbox=createInboxRepository(database),imports=createFileImportRepository(database,()=>now),reconciliation=createReconciliationRepository(database,()=>now);
const safe=createSafeSpendRepository(database),worth=createNetWorthRepository(database),budget=createBudgetRepository(database),fixture=await signingFixture();
const app=await buildApp({...config,rateLimitMax:10000},{jwks:fixture.resolver,dependencies:{profiles:createProfileRepository(database),finance,inbox,fileImports:imports,reconciliation,ping:database.ping,close:database.close}});
afterAll(()=>app.close());
const base='/api/v1/finance/reconciliation';
const csv='date;description;amount;type;currency;id\n16/10/2026;Synthetic retained evidence;-10,00;EXPENSE;BRL;external-one\n';
const columns={date:0,description:1,amount:2,type:3,currency:4,externalId:5};
async function context(){const owner=randomUUID(),headers={authorization:`Bearer ${await fixture.token({sub:owner})}`},account=await finance.createAccount(owner,{name:'Synthetic reconciliation cash',type:'checking',currency:'BRL',initialBalanceMinor:'100000'});return {owner,headers,account};}
type Context=Awaited<ReturnType<typeof context>>;
async function batch(c:Context,text=csv){const b=await imports.analyze(c.owner,{fileName:'synthetic.csv',format:'CSV',dataBase64:Buffer.from(text).toString('base64'),idempotencyKey:randomUUID(),encoding:'UTF8',delimiter:';'});return imports.map(c.owner,b.id,{accountId:c.account.id,columns,dateFormat:'DMY',numberFormat:'BR',amountMode:'SIGNED',expectedVersion:b.version});}
async function captured(c:Context,text=csv){const b=await batch(c,text),result=await reconciliation.capture(c.owner,{batchId:b.id,expectedVersion:b.version,rowNumbers:[1]});return {b,id:result.evidenceIds[0]!};}
const post=(c:Context,change:Partial<Parameters<typeof finance.createTransaction>[1]>={})=>finance.createTransaction(c.owner,{accountId:c.account.id,currency:'BRL',type:'EXPENSE',amountMinor:'1000',description:'Synthetic existing ledger',occurredAt:'2026-10-16T12:00:00Z',...change});
const query=(c:Context)=>({accountId:c.account.id,from:'2026-10-01T00:00:00Z',to:'2026-11-01T00:00:00Z'});
async function snapshot(owner:string){const names=(await database.pool.query<{table_name:string}>("select table_name from information_schema.columns where table_schema='app' and column_name='auth_user_id' and table_name not in ('financial_statement_evidence','financial_evidence_origins','financial_reconciliations') order by table_name")).rows;const out:Record<string,string>={};for(const {table_name} of names){if(!/^[a-z_]+$/.test(table_name))throw Error('unexpected identifier');out[table_name]=(await database.pool.query(`select md5(coalesce(string_agg(to_jsonb(t)::text,',' order by to_jsonb(t)::text),'')) digest from app.${table_name} t where auth_user_id=$1`,[owner])).rows[0].digest;}return out;}
describe('MDL13 real PostgreSQL17 evidence, reconciliation and financial isolation',()=>{
  it.each(['OFX','PDF'] as const)('captures supported %s evidence through the unchanged MDL12 parser/normalizer',async format=>{
    const c=await context(),ofx='<OFX><BANKMSGSRSV1><STMTTRNRS><STMTRS><CURDEF>BRL</CURDEF><BANKACCTFROM><ACCTID>12345678</ACCTID></BANKACCTFROM><BANKTRANLIST><STMTTRN><TRNTYPE>DEBIT</TRNTYPE><DTPOSTED>20261016120000[-3:BRT]</DTPOSTED><TRNAMT>-12.34</TRNAMT><FITID>synthetic-native-evidence</FITID><MEMO>Synthetic native</MEMO></STMTTRN></BANKTRANLIST></STMTRS></STMTTRNRS></BANKMSGSRSV1></OFX>';
    const dataBase64=format==='PDF'?(await readFile(new URL('../fixtures/imports/synthetic-statement.pdf',import.meta.url))).toString('base64'):Buffer.from(ofx).toString('base64');
    const b=await imports.analyze(c.owner,{fileName:'synthetic.'+format.toLowerCase(),format,dataBase64,idempotencyKey:randomUUID(),encoding:'UTF8',delimiter:';'});
    const mapped=await imports.map(c.owner,b.id,{accountId:c.account.id,columns,dateFormat:format==='OFX'?'ISO':'DMY',numberFormat:format==='OFX'?'INT':'BR',amountMode:'SIGNED',expectedVersion:b.version});
    const before=await snapshot(c.owner),r=await reconciliation.capture(c.owner,{batchId:b.id,expectedVersion:mapped.version,rowNumbers:[1]}),review=await reconciliation.review(c.owner,r.evidenceIds[0]!);
    expect(review.origins[0]!.format).toBe(format);expect(review.evidence.amountMinor).toBeTruthy();expect(await snapshot(c.owner)).toEqual(before);
  });
  it('captures only explicitly selected normalized evidence, without changing imports/Inbox/ledger or read models',async()=>{
    const c=await context(),b=await batch(c);await post(c);await safe.put(c.owner,{currency:'BRL',accountIds:[c.account.id],safetyBufferMinor:'0',respectBudget:true,reserveRecurrences:true,reserveGoalPlans:true});
    const read=async()=>({balance:await finance.getAccount(c.owner,c.account.id),budget:await budget.snapshot(c.owner,'2026-10','BRL','UTC'),worth:await worth.components(c.owner,'2026-10-19','UTC'),safe:await safe.read(c.owner,'BRL',now)});
    const before=await snapshot(c.owner),values=await read(),capture=await reconciliation.capture(c.owner,{batchId:b.id,expectedVersion:b.version,rowNumbers:[1]});
    expect(capture.evidenceIds).toHaveLength(1);expect(await snapshot(c.owner)).toEqual(before);expect(await read()).toEqual(values);
    expect((await reconciliation.listEvidence(c.owner,query(c))).items[0]).toMatchObject({amountMinor:'1000',type:'EXPENSE',match:null});expect((await inbox.list(c.owner,{})).items).toHaveLength(0);
  });
  it('requires explicit manual confirmation even for an exact proven receipt→candidate→transaction link',async()=>{
    const c=await context(),{b,id}=await captured(c),selected=await imports.select(c.owner,b.id,{expectedVersion:b.version,rowNumbers:[1],acknowledgePossibleDuplicates:false});
    let review=await reconciliation.review(c.owner,id);expect(review.classification).toBe('NO_MATCH');expect(review.origins[0]).toMatchObject({candidateStatus:'PENDING',transactionId:null});
    const pending=(await inbox.review(c.owner,selected.items[0]!.candidateId)).candidate,posted=await inbox.confirm(c.owner,pending.id,{expectedVersion:pending.version,acknowledgeDuplicates:false});
    review=await reconciliation.review(c.owner,id);expect(review.classification).toBe('PROVEN_LINK');expect(review.evidence.match).toBeNull();expect(review.suggestions[0]).toMatchObject({provenLink:true});
    const result=await reconciliation.confirm(c.owner,{evidenceId:id,transactionId:posted.transactionId!,idempotencyKey:randomUUID(),acknowledgeDateDifference:false});expect(result.valid).toBe(true);
  });
  it('serializes concurrent confirmation retries to one record, preserving every pre-existing table and calculated balance',async()=>{
    const c=await context(),{id}=await captured(c),t=await post(c),input={evidenceId:id,transactionId:t.id,idempotencyKey:randomUUID(),acknowledgeDateDifference:false},before=await snapshot(c.owner);
    const result=await Promise.all(Array.from({length:6},()=>reconciliation.confirm(c.owner,input)));expect(new Set(result.map(r=>r.id)).size).toBe(1);expect(await snapshot(c.owner)).toEqual(before);
    expect((await reconciliation.history(c.owner,query(c))).items).toHaveLength(1);expect((await reconciliation.movements(c.owner,query(c))).items[0]!.match?.valid).toBe(true);
    await expect(reconciliation.confirm(c.owner,{...input,acknowledgeDateDifference:true})).rejects.toMatchObject({code:'CONFLICT'});
  });
  it('detects ambiguous suggestions and blocks competing active use of an evidence or transaction',async()=>{
    const c=await context(),a=await captured(c),t1=await post(c),t2=await post(c);expect((await reconciliation.review(c.owner,a.id)).classification).toBe('AMBIGUOUS');
    const inputs=[t1,t2].map(t=>({evidenceId:a.id,transactionId:t.id,idempotencyKey:randomUUID(),acknowledgeDateDifference:false}));
    const result=await Promise.allSettled(inputs.map(input=>reconciliation.confirm(c.owner,input)));expect(result.filter(r=>r.status==='fulfilled')).toHaveLength(1);
    const second=await captured(c,csv.replace('external-one','external-two')),winner=result.find(r=>r.status==='fulfilled')!;if(winner.status!=='fulfilled')throw Error('missing result');
    await expect(reconciliation.confirm(c.owner,{...inputs[0]!,evidenceId:second.id,transactionId:winner.value.transactionId,idempotencyKey:randomUUID()})).rejects.toBeDefined();
  });
  it('reverses once with audit identity; old retries cannot reverse a later reconciliation',async()=>{
    const c=await context(),{id}=await captured(c),t=await post(c),input={evidenceId:id,transactionId:t.id,idempotencyKey:randomUUID(),acknowledgeDateDifference:false},m=await reconciliation.confirm(c.owner,input),before=await snapshot(c.owner),key=randomUUID();
    const reversed=await Promise.all(Array.from({length:4},()=>reconciliation.reverse(c.owner,m.id,{idempotencyKey:key})));expect(reversed.every(r=>!!r.reversedAt)).toBe(true);
    expect((await reconciliation.confirm(c.owner,input)).reversedAt).toBeTruthy();const second=await reconciliation.confirm(c.owner,{...input,idempotencyKey:randomUUID()});expect(second.id).not.toBe(m.id);
    await reconciliation.reverse(c.owner,m.id,{idempotencyKey:key});expect((await reconciliation.review(c.owner,id)).evidence.match?.id).toBe(second.id);expect(await snapshot(c.owner)).toEqual(before);
    expect((await reconciliation.history(c.owner,query(c))).items).toHaveLength(2);
    expect((await reconciliation.history(c.owner,{...query(c),status:'RECONCILED'})).items).toHaveLength(1);expect((await reconciliation.history(c.owner,{...query(c),status:'UNRECONCILED'})).items).toHaveLength(1);
  });
  it('distinguishes date/amount differences, cancellation and incompatible accounts/currencies/types',async()=>{
    const c=await context(),{id}=await captured(c),amount=await post(c,{amountMinor:'1001'}),date=await post(c,{occurredAt:'2026-10-17T12:00:00Z'}),cancelled=await post(c);await finance.patchTransaction(c.owner,cancelled.id,{isCancelled:true});
    const review=await reconciliation.review(c.owner,id);expect(review.suggestions.find(s=>s.transaction.id===amount.id)).toMatchObject({amountDifference:true,compatible:false});expect(review.suggestions.find(s=>s.transaction.id===cancelled.id)).toMatchObject({cancelled:true,compatible:false});
    const confirm=(transactionId:string,acknowledgeDateDifference=false)=>reconciliation.confirm(c.owner,{evidenceId:id,transactionId,idempotencyKey:randomUUID(),acknowledgeDateDifference});
    await expect(confirm(amount.id)).rejects.toMatchObject({code:'CONFLICT'});await expect(confirm(cancelled.id)).rejects.toMatchObject({code:'CONFLICT'});await expect(confirm(date.id)).rejects.toMatchObject({code:'CONFLICT'});
    const other=await finance.createAccount(c.owner,{name:'Synthetic USD',type:'checking',currency:'USD',initialBalanceMinor:'0'}),foreignCurrency=await post(c,{accountId:other.id,currency:'USD'}),income=await post(c,{type:'INCOME'});
    await expect(confirm(foreignCurrency.id)).rejects.toMatchObject({code:'CONFLICT'});await expect(confirm(income.id)).rejects.toMatchObject({code:'CONFLICT'});expect((await confirm(date.id,true)).valid).toBe(true);
  });
  it('reports later edits/cancellation as invalid links without altering their original movement',async()=>{
    const c=await context(),{id}=await captured(c),t=await post(c);await reconciliation.confirm(c.owner,{evidenceId:id,transactionId:t.id,idempotencyKey:randomUUID(),acknowledgeDateDifference:true});
    await database.pool.query("update app.financial_transactions set occurred_at='2026-10-17T12:00:00Z' where auth_user_id=$1 and id=$2",[c.owner,t.id]);expect((await reconciliation.review(c.owner,id)).evidence.match?.valid).toBe(false);
    await finance.patchTransaction(c.owner,t.id,{isCancelled:true});expect((await reconciliation.movements(c.owner,query(c))).items[0]!.match?.valid).toBe(false);
  });
  it('preserves evidence after preview expiry, but never recovers uncaptured original rows from receipts/edited candidates',async()=>{
    const c=await context(),{b,id}=await captured(c),other=await batch(c,csv.replace('external-one','not-captured'));const selected=await imports.select(c.owner,other.id,{expectedVersion:other.version,rowNumbers:[1],acknowledgePossibleDuplicates:true});
    const old=now;try{now=new Date(now.getTime()+86400001);await imports.preview(c.owner,b.id);await imports.preview(c.owner,other.id);
      expect((await reconciliation.review(c.owner,id)).evidence.amountMinor).toBe('1000');expect((await reconciliation.capture(c.owner,{batchId:b.id,expectedVersion:1,rowNumbers:[1]})).evidenceIds).toEqual([id]);
      await expect(reconciliation.capture(c.owner,{batchId:other.id,expectedVersion:other.version,rowNumbers:[1]})).rejects.toMatchObject({code:'CONFLICT'});
      expect((await reconciliation.proposals(c.owner,query(c))).items.some(r=>r.candidate.id===selected.items[0]!.candidateId)).toBe(true);
    }finally{now=old;}
  });
  it('deduplicates reliable external identities across files while retaining every source occurrence and rejecting changed input',async()=>{
    const c=await context(),one=await captured(c),two=await captured(c,csv+'\n');expect(two.id).toBe(one.id);expect((await reconciliation.review(c.owner,one.id)).origins).toHaveLength(2);
    const changed=await batch(c,csv.replace('-10,00','-99,00'));await expect(reconciliation.capture(c.owner,{batchId:changed.id,expectedVersion:changed.version,rowNumbers:[1]})).rejects.toMatchObject({code:'CONFLICT'});
    expect((await reconciliation.listEvidence(c.owner,query(c))).items).toHaveLength(1);
  });
  it('never silently reinterprets a captured origin if a still-editable MDL12 mapping changes',async()=>{
    const c=await context(),{b,id}=await captured(c),mapped=await imports.map(c.owner,b.id,{...b.mapping!,columns:{...columns,description:5,externalId:1},expectedVersion:b.version});
    await expect(reconciliation.capture(c.owner,{batchId:b.id,expectedVersion:mapped.version,rowNumbers:[1]})).rejects.toMatchObject({code:'CONFLICT'});expect((await reconciliation.review(c.owner,id)).evidence.description).toBe('Synthetic retained evidence');
  });
  it('does not deduplicate independent same-value/date rows without trusted external identity',async()=>{
    const c=await context(),text=csv.replace('external-one','')+csv.split('\n')[1]!.replace('external-one','')+'\n',b=await batch(c,text),r=await reconciliation.capture(c.owner,{batchId:b.id,expectedVersion:b.version,rowNumbers:[1,2]});expect(new Set(r.evidenceIds).size).toBe(2);
  });
  it('rolls back evidence and source together on a forced source insert failure',async()=>{
    const c=await context(),b=await batch(c);await database.pool.query(`create function app.reconciliation_test_failure() returns trigger language plpgsql as $$begin if NEW.auth_user_id='${c.owner}'::uuid then raise exception 'synthetic rollback'; end if; return NEW;end$$;create trigger reconciliation_test_failure before insert on app.financial_evidence_origins for each row execute function app.reconciliation_test_failure()`);
    try{await expect(reconciliation.capture(c.owner,{batchId:b.id,expectedVersion:b.version,rowNumbers:[1]})).rejects.toBeDefined();expect((await reconciliation.listEvidence(c.owner,query(c))).items).toHaveLength(0);}finally{await database.pool.query('drop trigger reconciliation_test_failure on app.financial_evidence_origins;drop function app.reconciliation_test_failure()');}
  });
  it('rejects direct SQL history rewrites/deletes and preserves original rows',async()=>{
    const c=await context(),{id}=await captured(c),t=await post(c),m=await reconciliation.confirm(c.owner,{evidenceId:id,transactionId:t.id,idempotencyKey:randomUUID(),acknowledgeDateDifference:false});
    for(const sql of ['update app.financial_statement_evidence set amount_minor=9 where id=$1','delete from app.financial_statement_evidence where id=$1','delete from app.financial_evidence_origins where evidence_id=$1'])await expect(database.pool.query(sql,[id])).rejects.toMatchObject({code:'23514'});
    await expect(database.pool.query('update app.financial_reconciliations set transaction_id=$1 where id=$2',[randomUUID(),m.id])).rejects.toMatchObject({code:'23514'});await expect(database.pool.query('delete from app.financial_reconciliations where id=$1',[m.id])).rejects.toMatchObject({code:'23514'});
  });
  it('enforces real RLS and ownership across evidence, origins, matches and HTTP',async()=>{
    const a=await context(),b=await context(),one=await captured(a),two=await captured(b),t=await post(a),m=await reconciliation.confirm(a.owner,{evidenceId:one.id,transactionId:t.id,idempotencyKey:randomUUID(),acknowledgeDateDifference:false});
    for(const work of [()=>reconciliation.review(b.owner,one.id),()=>reconciliation.reverse(b.owner,m.id,{idempotencyKey:randomUUID()}),()=>reconciliation.listEvidence(b.owner,query(a))])await expect(work()).rejects.toMatchObject({code:'NOT_FOUND'});
    const client=await database.pool.connect();try{await client.query('begin');await client.query('set local role authenticated');await client.query("select set_config('request.jwt.claim.sub',$1,true)",[a.owner]);
      expect((await client.query('select id from app.financial_statement_evidence')).rows.map(r=>r.id)).toEqual([one.id]);expect((await client.query('select evidence_id from app.financial_evidence_origins')).rows.map(r=>r.evidence_id)).toEqual([one.id]);expect((await client.query('select id from app.financial_reconciliations')).rows.map(r=>r.id)).toEqual([m.id]);
      expect((await client.query('delete from app.financial_reconciliations where id=$1',[m.id])).rowCount).toBe(0);await expect(client.query('insert into app.financial_statement_evidence select * from app.financial_statement_evidence where id=$1',[one.id])).rejects.toMatchObject({code:'42501'});await client.query('rollback');
      await client.query('begin');await client.query('set local role anon');expect((await client.query('select id from app.financial_statement_evidence')).rowCount).toBe(0);await client.query('rollback');
    }finally{await client.query('rollback');client.release();}
    expect((await app.inject({url:base+'/evidence/'+one.id,headers:b.headers})).statusCode).toBe(404);expect((await app.inject({url:base+'/evidence/'+two.id})).statusCode).toBe(401);
    expect((await app.inject({method:'POST',url:base+'/matches',headers:a.headers,payload:{evidenceId:one.id,transactionId:t.id,idempotencyKey:randomUUID(),acknowledgeDateDifference:false,ownerId:a.owner}})).statusCode).toBe(400);
    const response=await app.inject({url:base+'/evidence/'+one.id,headers:a.headers});expect(response.statusCode,response.body).toBe(200);expect(response.body).not.toMatch(/fingerprint|sourceKey|authUserId|idempotency_key/);
  });
  it('shows transfers as transfers, never suggests them as income/expense evidence',async()=>{
    const c=await context(),{id}=await captured(c),other=await finance.createAccount(c.owner,{name:'Synthetic transfer peer',type:'checking',currency:'BRL',initialBalanceMinor:'0'}),transfer=await finance.createTransfer(c.owner,{sourceAccountId:c.account.id,destinationAccountId:other.id,currency:'BRL',amountMinor:'1000',occurredAt:'2026-10-16T12:00:00Z',description:'Synthetic transfer',idempotencyKey:randomUUID()});
    expect((await reconciliation.movements(c.owner,query(c))).items[0]!.transaction.type).toBe('TRANSFER');expect((await reconciliation.review(c.owner,id)).suggestions).toHaveLength(0);
    await expect(reconciliation.confirm(c.owner,{evidenceId:id,transactionId:transfer.id,idempotencyKey:randomUUID(),acknowledgeDateDifference:false})).rejects.toMatchObject({code:'NOT_FOUND'});
  });
  it('bounds period/cursors and preserves stable evidence pagination',async()=>{
    const c=await context(),text='date;description;amount;type;currency;id\n'+Array.from({length:30},(_,n)=>`16/10/2026;Synthetic ${n};-10,00;EXPENSE;BRL;page-${n}`).join('\n'),b=await batch(c,text);await reconciliation.capture(c.owner,{batchId:b.id,expectedVersion:b.version,rowNumbers:Array.from({length:30},(_,n)=>n+1)});
    const first=await reconciliation.listEvidence(c.owner,query(c));expect(first.items).toHaveLength(25);expect(first.nextCursor).not.toBeNull();const second=await reconciliation.listEvidence(c.owner,{...query(c),cursorAt:first.nextCursor!.createdAt,cursorId:first.nextCursor!.id});expect(second.items).toHaveLength(5);expect(new Set([...first.items,...second.items].map(e=>e.id)).size).toBe(30);
    await expect(reconciliation.listEvidence(c.owner,{...query(c),to:'2028-01-01T00:00:00Z'})).rejects.toMatchObject({code:'VALIDATION_ERROR'});
  });
  it('keeps managed card tracking dates and debt boundaries, without turning managed entries into ordinary bank matches',async()=>{
    const c=await context(),{id}=await captured(c),current=await post(c),legacy=await post(c,{occurredAt:'2026-10-14T12:00:00Z'});
    await finance.patchAccount(c.owner,c.account.id,{type:'credit'});
    await database.pool.query("insert into app.financial_credit_cards(auth_user_id,account_id,currency,display_name,tracking_start_date) values($1,$2,'BRL','Synthetic managed card','2026-10-15')",[c.owner,c.account.id]);
    const r=await reconciliation.review(c.owner,id);expect(r.suggestions.find(s=>s.transaction.id===current.id)).toMatchObject({managed:true,compatible:false});expect(r.suggestions.find(s=>s.transaction.id===legacy.id)).toMatchObject({managed:false,compatible:true});
    await expect(reconciliation.confirm(c.owner,{evidenceId:id,transactionId:current.id,idempotencyKey:randomUUID(),acknowledgeDateDifference:false})).rejects.toMatchObject({code:'CONFLICT'});
    expect((await reconciliation.confirm(c.owner,{evidenceId:id,transactionId:legacy.id,idempotencyKey:randomUUID(),acknowledgeDateDifference:true})).valid).toBe(true);
    const d=await context(),de=await captured(d),dt=await post(d);await finance.patchAccount(d.owner,d.account.id,{type:'debt'});
    await database.pool.query("insert into app.financial_debts(auth_user_id,account_id,currency,name,debt_type,tracking_start_date) values($1,$2,'BRL','Synthetic managed debt','OTHER','2026-10-01')",[d.owner,d.account.id]);
    await expect(reconciliation.confirm(d.owner,{evidenceId:de.id,transactionId:dt.id,idempotencyKey:randomUUID(),acknowledgeDateDifference:false})).rejects.toMatchObject({code:'CONFLICT'});
  });
  it('returns HTTP409 for incompatible concurrent reuse and rolls a failed confirmation back without ledger writes',async()=>{
    const c=await context(),{id}=await captured(c),t=await post(c),input={evidenceId:id,transactionId:t.id,idempotencyKey:randomUUID(),acknowledgeDateDifference:false},before=await snapshot(c.owner);
    await database.pool.query(`create function app.reconciliation_confirm_failure() returns trigger language plpgsql as $$begin if NEW.auth_user_id='${c.owner}'::uuid then raise exception 'synthetic rollback'; end if;return NEW;end$$;create trigger reconciliation_confirm_failure after insert on app.financial_reconciliations for each row execute function app.reconciliation_confirm_failure()`);
    try{await expect(reconciliation.confirm(c.owner,input)).rejects.toBeDefined();expect((await reconciliation.history(c.owner,query(c))).items).toHaveLength(0);expect(await snapshot(c.owner)).toEqual(before);}finally{await database.pool.query('drop trigger reconciliation_confirm_failure on app.financial_reconciliations;drop function app.reconciliation_confirm_failure()');}
    const response=await app.inject({method:'POST',url:base+'/matches',headers:c.headers,payload:input});expect(response.statusCode,response.body).toBe(200);
    expect((await app.inject({method:'POST',url:base+'/matches',headers:c.headers,payload:{...input,idempotencyKey:randomUUID()}})).statusCode).toBe(409);
    expect(await snapshot(c.owner)).toEqual(before);
  });
  it('meets predeclared synthetic volume limits and keeps finance read models unchanged',async()=>{
    const c=await context(),text='date;description;amount;type;currency;id\n'+Array.from({length:1000},(_,n)=>`16/10/2026;Synthetic volume ${n};-${n+1},00;EXPENSE;BRL;volume-${n}`).join('\n'),b=await batch(c,text);
    for(let group=0;group<10;group++){const start=performance.now();await reconciliation.capture(c.owner,{batchId:b.id,expectedVersion:b.version,rowNumbers:Array.from({length:100},(_,n)=>group*100+n+1)});expect(performance.now()-start).toBeLessThan(5000);}
    await database.pool.query("insert into app.financial_transactions(auth_user_id,account_id,type,currency,amount_minor,description,occurred_at) select $1,$2,'EXPENSE','BRL',n,'Synthetic volume',timestamptz '2026-10-16 12:00:00Z' from generate_series(1,1000) n",[c.owner,c.account.id]);
    let start=performance.now();const rows=await reconciliation.listEvidence(c.owner,query(c));expect(performance.now()-start).toBeLessThan(2500);start=performance.now();await reconciliation.review(c.owner,rows.items[0]!.id);expect(performance.now()-start).toBeLessThan(2500);
  },30000);
});
