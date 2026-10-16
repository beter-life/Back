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
import type { ImportBatch,ImportMapping,ImportPreview,ImportResult,ImportUpload } from '../../src/modules/finance/import-contracts.js';
import { signingFixture,testEnv } from '../helpers.js';

const config=loadConfig({...testEnv,TEST_DATABASE_URL:process.env.TEST_DATABASE_URL}),database=createDatabase(config);
let now=new Date('2026-10-16T12:00:00Z');
const finance=createFinanceRepository(database),inbox=createInboxRepository(database),imports=createFileImportRepository(database,()=>now),fixture=await signingFixture();
const app=await buildApp({...config,rateLimitMax:10000},{jwks:fixture.resolver,dependencies:{profiles:createProfileRepository(database),finance,inbox,fileImports:imports,ping:database.ping,close:database.close}});
afterAll(()=>app.close());
const base='/api/v1/finance/imports';
const csv='data;descricao;valor;tipo;moeda;id\n16/10/2026;Synthetic cafe;-12,34;EXPENSE;BRL;synthetic-1\n';
const upload=(text=csv,extra:Partial<ImportUpload>={}):ImportUpload=>({fileName:'synthetic.csv',format:'CSV',dataBase64:Buffer.from(text).toString('base64'),idempotencyKey:randomUUID(),encoding:'UTF8',delimiter:';',...extra});
const columns={date:0,description:1,amount:2,type:3,currency:4,externalId:5};
async function context(){const owner=randomUUID(),headers={authorization:`Bearer ${await fixture.token({sub:owner})}`},account=await finance.createAccount(owner,{name:'Synthetic import cash',type:'checking',currency:'BRL',initialBalanceMinor:'100000'});return {owner,headers,account};}
async function ready(c:Awaited<ReturnType<typeof context>>,text=csv,extra:Partial<ImportUpload>={}){const batch=await imports.analyze(c.owner,upload(text,extra));const mapping:ImportMapping={accountId:c.account.id,columns,dateFormat:'DMY',numberFormat:'BR',amountMode:'SIGNED'};return imports.map(c.owner,batch.id,{...mapping,expectedVersion:batch.version});}
const select=(owner:string,batch:ImportBatch,rowNumbers=[1],acknowledgePossibleDuplicates=false)=>imports.select(owner,batch.id,{expectedVersion:batch.version,rowNumbers,acknowledgePossibleDuplicates});
async function moneySnapshot(owner:string){const names=await database.pool.query<{table_name:string}>("select table_name from information_schema.columns where table_schema='app' and column_name='auth_user_id' and table_name not like 'financial_import_%' and table_name<>'financial_inbox_candidates' order by table_name");const result:Record<string,string>={};for(const {table_name} of names.rows){if(!/^[a-z_]+$/.test(table_name))throw Error('unexpected table');result[table_name]=(await database.pool.query(`select md5(coalesce(string_agg(to_jsonb(t)::text,',' order by to_jsonb(t)::text),'')) digest from app.${table_name} t where auth_user_id=$1`,[owner])).rows[0].digest;}return result;}

describe('MDL12 real PostgreSQL17, RLS, HTTP and pending-only adapter',()=>{
  it.each(['OFX','PDF'] as const)('adapts supported %s into the same pending Inbox with no financial impact',async format=>{
    const c=await context(),text='<OFX><BANKMSGSRSV1><STMTTRNRS><STMTRS><CURDEF>BRL</CURDEF><BANKACCTFROM><ACCTID>12345678</ACCTID></BANKACCTFROM><BANKTRANLIST><STMTTRN><TRNTYPE>DEBIT</TRNTYPE><DTPOSTED>20261016120000[-3:BRT]</DTPOSTED><TRNAMT>-12.34</TRNAMT><FITID>synthetic-native</FITID><MEMO>Synthetic native</MEMO></STMTTRN></BANKTRANLIST></STMTRS></STMTTRNRS></BANKMSGSRSV1></OFX>';
    const input=upload(text,{format,fileName:'synthetic.'+format.toLowerCase()});if(format==='PDF')input.dataBase64=(await readFile(new URL('../fixtures/imports/synthetic-statement.pdf',import.meta.url))).toString('base64');
    const analyzed=await imports.analyze(c.owner,input);expect(analyzed.issues).toEqual([]);
    const batch=await imports.map(c.owner,analyzed.id,{accountId:c.account.id,columns,dateFormat:format==='OFX'?'ISO':'DMY',numberFormat:format==='OFX'?'INT':'BR',amountMode:'SIGNED',expectedVersion:analyzed.version});
    const result=await select(c.owner,batch);expect((await inbox.review(c.owner,result.items[0]!.candidateId)).candidate).toMatchObject({source:'FILE_'+format,status:'PENDING',amountMinor:'1234'});expect((await finance.listTransactions(c.owner,{})).items).toHaveLength(0);
  });
  it('analyzes/maps/previews/selects without touching any financial table; existing confirmation posts exactly once',async()=>{
    const c=await context(),before=await moneySnapshot(c.owner),batch=await ready(c),preview=await imports.preview(c.owner,batch.id);
    expect(preview.rows[0]).toMatchObject({duplicate:'NONE',draft:{amountMinor:'1234',type:'EXPENSE',categoryId:null,accountId:c.account.id}});
    const result=await select(c.owner,batch),candidate=(await inbox.review(c.owner,result.items[0]!.candidateId)).candidate;
    expect(candidate).toMatchObject({status:'PENDING',source:'FILE_CSV'});expect(await moneySnapshot(c.owner)).toEqual(before);
    const posted=await inbox.confirm(c.owner,candidate.id,{expectedVersion:1,acknowledgeDuplicates:false});
    expect((await inbox.confirm(c.owner,candidate.id,{expectedVersion:1,acknowledgeDuplicates:false})).transactionId).toBe(posted.transactionId);
    expect((await finance.getAccount(c.owner,c.account.id))!.balanceMinor).toBe('98766');expect((await finance.listTransactions(c.owner,{})).items).toHaveLength(1);
  });
  it('serializes concurrent upload and selection retries, including stale replay after confirmation',async()=>{
    const c=await context(),input=upload(),results=await Promise.all(Array.from({length:2},()=>imports.analyze(c.owner,input)));
    expect(new Set(results.map(r=>r.id)).size).toBe(1);
    const batch=await imports.map(c.owner,results[0]!.id,{accountId:c.account.id,columns,dateFormat:'DMY',numberFormat:'BR',amountMode:'SIGNED',expectedVersion:1});
    const selected=await Promise.all(Array.from({length:5},()=>select(c.owner,batch)));
    expect(new Set(selected.map(r=>r.items[0]!.candidateId)).size).toBe(1);expect((await inbox.list(c.owner,{})).items).toHaveLength(1);
    await inbox.confirm(c.owner,selected[0]!.items[0]!.candidateId,{expectedVersion:1,acknowledgeDuplicates:false});
    expect((await select(c.owner,batch)).items[0]).toMatchObject({reused:true,candidateId:selected[0]!.items[0]!.candidateId});
    await expect(imports.analyze(c.owner,{...input,dataBase64:Buffer.from(csv+'\n').toString('base64')})).rejects.toMatchObject({code:'CONFLICT'});
    expect((await imports.analyze(c.owner,upload())).id).toBe(batch.id);
  });
  it('reuses proven external identities across files and blocks conflicting values',async()=>{
    const c=await context(),first=await ready(c),one=await select(c.owner,first),second=await ready(c,csv+'\n');
    expect((await imports.preview(c.owner,second.id)).rows[0]).toMatchObject({duplicate:'PROVEN',candidateId:one.items[0]!.candidateId});
    expect((await select(c.owner,second)).items[0]).toMatchObject({reused:true,candidateId:one.items[0]!.candidateId});
    const conflict=await ready(c,csv.replace('-12,34','-99,00'));
    expect((await imports.preview(c.owner,conflict.id)).rows[0]).toMatchObject({duplicate:'CONFLICT',issues:['EXTERNAL_ID_CONFLICT']});
    await expect(select(c.owner,conflict)).rejects.toMatchObject({code:'VALIDATION_ERROR'});expect((await inbox.list(c.owner,{})).items).toHaveLength(1);
  });
  it('reuses repeated identical external IDs within one file while blocking local ID conflicts',async()=>{
    const c=await context(),batch=await ready(c,csv+csv.split('\n')[1]+'\n');expect((await imports.preview(c.owner,batch.id)).rows.map(r=>r.duplicate)).toEqual(['PROVEN','PROVEN']);const result=await select(c.owner,batch,[1,2]);expect(new Set(result.items.map(r=>r.candidateId)).size).toBe(1);expect(result.items.map(r=>r.reused)).toEqual([false,true]);
    const conflict=await ready(c,csv.replace('synthetic-1','new-id')+csv.split('\n')[1]!.replace('synthetic-1','new-id').replace('-12,34','-15,00')+'\n');expect((await imports.preview(c.owner,conflict.id)).rows.every(r=>r.duplicate==='CONFLICT')).toBe(true);await expect(select(c.owner,conflict,[1,2],true)).rejects.toMatchObject({code:'VALIDATION_ERROR'});
  });
  it('keeps distinct same-date/amount rows selectable with explicit possible-duplicate acknowledgement',async()=>{
    const c=await context(),text=csv.replace('synthetic-1','')+'16/10/2026;Synthetic second;-12,34;EXPENSE;BRL;\n',batch=await ready(c,text);
    expect((await imports.preview(c.owner,batch.id)).rows.map(r=>r.duplicate)).toEqual(['POSSIBLE','POSSIBLE']);
    await expect(select(c.owner,batch,[1,2])).rejects.toMatchObject({code:'INBOX_POSSIBLE_DUPLICATE'});
    const result=await select(c.owner,batch,[1,2],true);expect(new Set(result.items.map(r=>r.candidateId)).size).toBe(2);
    expect((await finance.listTransactions(c.owner,{})).items).toHaveLength(0);
  });
  it('detects ledger and pending proposals created after preview and excludes other owners',async()=>{
    const c=await context(),batch=await ready(c,csv.replace('synthetic-1',''));
    expect((await imports.preview(c.owner,batch.id)).rows[0]!.duplicate).toBe('NONE');
    await inbox.create(c.owner,{description:'Synthetic competing',type:'EXPENSE',currency:'BRL',accountId:c.account.id,categoryId:null,amountMinor:'1234',occurredAt:'2026-10-16T12:00:00Z',idempotencyKey:randomUUID()});
    await expect(select(c.owner,batch)).rejects.toMatchObject({code:'INBOX_POSSIBLE_DUPLICATE'});
    const other=await context(),otherBatch=await ready(other);expect((await imports.preview(other.owner,otherBatch.id)).rows[0]!.duplicate).toBe('NONE');
  });
  it('rolls back candidates and receipts together when a receipt insertion fails',async()=>{
    const c=await context(),batch=await ready(c);
    await database.pool.query(`create function app.import_test_failure() returns trigger language plpgsql as $$ begin if NEW.auth_user_id='${c.owner}'::uuid then raise exception 'synthetic rollback'; end if; return NEW; end $$; create trigger import_test_failure before insert on app.financial_import_rows for each row execute function app.import_test_failure()`);
    try{await expect(select(c.owner,batch)).rejects.toBeDefined();expect((await inbox.list(c.owner,{})).items).toHaveLength(0);expect((await imports.preview(c.owner,batch.id)).batch.importedCount).toBe(0);}finally{await database.pool.query('drop trigger import_test_failure on app.financial_import_rows; drop function app.import_test_failure()');}
    expect((await select(c.owner,batch)).items).toHaveLength(1);
  });
  it('expires raw preview after 24h while keeping receipts, replay and recovery without duplication',async()=>{
    const c=await context(),batch=await ready(c),one=await select(c.owner,batch),oldNow=now;
    try{now=new Date(now.getTime()+86400001);const preview=await imports.preview(c.owner,batch.id);expect(preview.batch.status).toBe('EXPIRED');expect(preview.rows).toEqual([{rowNumber:1,cells:[],draft:null,issues:[],candidateId:one.items[0]!.candidateId,duplicate:'PROVEN'}]);
      const stored=await database.pool.query('select parsed,parsed_bytes from app.financial_import_batches where id=$1',[batch.id]);expect(stored.rows[0]).toEqual({parsed:null,parsed_bytes:0});
      expect((await select(c.owner,batch)).items[0]!.candidateId).toBe(one.items[0]!.candidateId);
      const recovered=await imports.analyze(c.owner,upload());expect(recovered.id).toBe(batch.id);expect((await imports.preview(c.owner,batch.id)).rows[0]!.duplicate).toBe('PROVEN');
    }finally{now=oldNow;}
  });
  it('locks mapping/options after selection, rejects stale map and invalid native remapping',async()=>{
    const c=await context(),batch=await ready(c);await expect(imports.map(c.owner,batch.id,{...batch.mapping!,expectedVersion:1})).rejects.toMatchObject({code:'CONFLICT'});await select(c.owner,batch);
    await expect(imports.map(c.owner,batch.id,{...batch.mapping!,expectedVersion:3})).rejects.toMatchObject({code:'CONFLICT'});
    await expect(imports.analyze(c.owner,upload(csv,{encoding:'WINDOWS1252'}))).rejects.toMatchObject({code:'CONFLICT'});
    const ofx='<OFX><BANKMSGSRSV1><STMTTRNRS><STMTRS><CURDEF>BRL</CURDEF><BANKACCTFROM><ACCTID>12345678</ACCTID></BANKACCTFROM><BANKTRANLIST><STMTTRN><TRNTYPE>XFER</TRNTYPE><DTPOSTED>20261016</DTPOSTED><TRNAMT>-12.34</TRNAMT><FITID>syn-transfer</FITID><MEMO>Synthetic</MEMO></STMTTRN></BANKTRANLIST></STMTRS></STMTTRNRS></BANKMSGSRSV1></OFX>';
    const native=await imports.analyze(c.owner,upload(ofx,{format:'OFX',fileName:'synthetic.ofx'}));
    await expect(imports.map(c.owner,native.id,{accountId:c.account.id,columns:{...columns,type:null},dateFormat:'ISO',numberFormat:'INT',amountMode:'SIGNED',expectedVersion:native.version})).rejects.toMatchObject({code:'VALIDATION_ERROR'});
    const mapped=await imports.map(c.owner,native.id,{accountId:c.account.id,columns,dateFormat:'ISO',numberFormat:'INT',amountMode:'SIGNED',expectedVersion:native.version});
    expect((await imports.preview(c.owner,mapped.id)).rows[0]!.issues).toContain('TYPE_UNSUPPORTED');await expect(select(c.owner,mapped)).rejects.toMatchObject({code:'VALIDATION_ERROR'});
  });
  it('isolates HTTP ownership, strict payloads, history and private response fields',async()=>{
    const a=await context(),b=await context(),response=await app.inject({method:'POST',url:base,headers:a.headers,payload:upload()});expect(response.statusCode,response.body).toBe(201);const batch=response.json<ImportBatch>();
    expect((await app.inject({url:base+'/'+batch.id,headers:b.headers})).statusCode).toBe(404);
    expect((await app.inject({url:base,headers:b.headers})).json().items).toEqual([]);
    expect((await app.inject({url:base})).statusCode).toBe(401);
    for(const extra of [{ownerId:b.owner},{auth_user_id:b.owner},{source:'MANUAL'}])expect((await app.inject({method:'POST',url:base,headers:a.headers,payload:{...upload(),...extra}})).statusCode).toBe(400);
    expect((await app.inject({url:base+'?cursorId='+randomUUID(),headers:a.headers})).statusCode).toBe(400);
    const preview=await app.inject({url:base+'/'+batch.id,headers:a.headers});expect(preview.json<ImportPreview>().rows).toHaveLength(1);expect(preview.body).not.toMatch(/fileHash|authUserId|dataBase64|fingerprint|parserOptions/);
    const mapped=await app.inject({method:'PUT',url:base+'/'+batch.id+'/mapping',headers:a.headers,payload:{accountId:a.account.id,columns,dateFormat:'DMY',numberFormat:'BR',amountMode:'SIGNED',expectedVersion:batch.version}});expect(mapped.statusCode,mapped.body).toBe(200);
    const selected=await app.inject({method:'POST',url:base+'/'+batch.id+'/inbox',headers:a.headers,payload:{expectedVersion:mapped.json<ImportBatch>().version,rowNumbers:[1],acknowledgePossibleDuplicates:false}});expect(selected.statusCode,selected.body).toBe(200);expect(selected.json<ImportResult>().items).toHaveLength(1);
  });
  it('refuses foreign, inactive, managed accounts and row currency mismatch',async()=>{
    const a=await context(),b=await context(),batch=await imports.analyze(a.owner,upload()),input={accountId:b.account.id,columns,dateFormat:'DMY',numberFormat:'BR',amountMode:'SIGNED',expectedVersion:batch.version} as const;
    await expect(imports.map(a.owner,batch.id,input)).rejects.toMatchObject({code:'NOT_FOUND'});
    await finance.patchAccount(a.owner,a.account.id,{isActive:false});await expect(imports.map(a.owner,batch.id,{...input,accountId:a.account.id})).rejects.toMatchObject({code:'CONFLICT'});
    const credit=await finance.createAccount(a.owner,{name:'Synthetic credit',type:'credit',currency:'BRL',initialBalanceMinor:'0'});await expect(imports.map(a.owner,batch.id,{...input,accountId:credit.id})).rejects.toMatchObject({code:'VALIDATION_ERROR'});
    const mismatch=await ready(b,csv.replace(';BRL;',';USD;'));expect((await imports.preview(b.owner,mismatch.id)).rows[0]!.issues).toContain('CURRENCY_MISMATCH');await expect(select(b.owner,mismatch)).rejects.toMatchObject({code:'VALIDATION_ERROR'});
  });
  it('enforces real SELECT-only RLS, compound ownership and immutable receipts/batch identity',async()=>{
    const a=await context(),b=await context(),batch=await ready(a),other=await ready(b);await select(a.owner,batch);await select(b.owner,other);
    const client=await database.pool.connect();try{await client.query('begin');await client.query('set local role authenticated');await client.query("select set_config('request.jwt.claim.sub',$1,true)",[a.owner]);
      expect((await client.query('select id from app.financial_import_batches')).rows.map(r=>r.id)).toEqual([batch.id]);expect((await client.query('select batch_id from app.financial_import_rows')).rows.map(r=>r.batch_id)).toEqual([batch.id]);
      for(const table of ['financial_import_batches','financial_import_rows']){expect((await client.query(`delete from app.${table} where auth_user_id=$1`,[a.owner])).rowCount).toBe(0);}
      expect((await client.query('update app.financial_import_batches set version=version+1 where id=$1',[batch.id])).rowCount).toBe(0);
      await expect(client.query('insert into app.financial_import_rows(auth_user_id,batch_id,row_number,candidate_id,fingerprint) select auth_user_id,batch_id,2,candidate_id,fingerprint from app.financial_import_rows where batch_id=$1',[batch.id])).rejects.toMatchObject({code:'42501'});await client.query('rollback');
      await client.query('begin');await client.query('set local role anon');expect((await client.query('select id from app.financial_import_batches')).rowCount).toBe(0);expect((await client.query('select id from app.financial_import_rows')).rowCount).toBe(0);await client.query('rollback');
    }finally{await client.query('rollback');client.release();}
    await expect(database.pool.query('update app.financial_import_batches set auth_user_id=$1,version=version+1 where id=$2',[b.owner,batch.id])).rejects.toMatchObject({code:'23514'});
    await expect(database.pool.query('delete from app.financial_import_rows where batch_id=$1',[batch.id])).rejects.toMatchObject({code:'23514'});
    await expect(database.pool.query('update app.financial_import_rows set row_number=2 where batch_id=$1',[batch.id])).rejects.toMatchObject({code:'23514'});
    await expect(database.pool.query('update app.financial_import_batches set mapping=null,account_id=null,currency=null,version=version+1 where id=$1',[batch.id])).rejects.toMatchObject({code:'23514'});
    const ownCandidate=(await inbox.list(a.owner,{})).items[0]!;
    await expect(database.pool.query("insert into app.financial_import_rows(auth_user_id,batch_id,row_number,candidate_id,fingerprint) values($1,$2,2,$3,repeat('a',64))",[b.owner,other.id,ownCandidate.id])).rejects.toMatchObject({code:'23503'});
  });
  it('meets declared local bounds for 1000 rows, 50-row preview and 100 selected proposals',async()=>{
    const c=await context(),text='data;descricao;valor;tipo;moeda;id\n'+Array.from({length:1000},(_,n)=>`16/10/2026;Synthetic ${n};-${n+1},01;EXPENSE;BRL;load-${n}`).join('\n');
    let start=performance.now();const batch=await ready(c,text);expect(performance.now()-start).toBeLessThan(5000);
    start=performance.now();const page=await imports.preview(c.owner,batch.id);expect(page.rows).toHaveLength(50);expect(page.nextOffset).toBe(50);expect(performance.now()-start).toBeLessThan(2500);
    start=performance.now();expect((await select(c.owner,batch,Array.from({length:100},(_,n)=>n+1))).items).toHaveLength(100);expect(performance.now()-start).toBeLessThan(5000);
    expect((await finance.getAccount(c.owner,c.account.id))!.balanceMinor).toBe('100000');
  });
});
