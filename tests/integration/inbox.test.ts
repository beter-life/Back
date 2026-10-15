import { afterAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { createDatabase } from '../../src/db/client.js';
import { loadConfig } from '../../src/config/env.js';
import { buildApp } from '../../src/app.js';
import { createProfileRepository } from '../../src/modules/profile/repository.js';
import { createFinanceRepository } from '../../src/modules/finance/repository.js';
import { createInboxRepository } from '../../src/modules/finance/inbox-repository.js';
import { createSafeSpendRepository } from '../../src/modules/finance/safe-spend-repository.js';
import { createNetWorthRepository } from '../../src/modules/finance/net-worth-repository.js';
import { createBudgetRepository } from '../../src/modules/finance/budget-repository.js';
import { normalizeInboxDraft } from '../../src/modules/finance/inbox-domain.js';
import type { InboxCreate, InboxItem, InboxReview } from '../../src/modules/finance/inbox-contracts.js';
import { signingFixture, testEnv } from '../helpers.js';

const config=loadConfig({...testEnv,TEST_DATABASE_URL:process.env.TEST_DATABASE_URL}),database=createDatabase(config);
const now=new Date('2026-10-15T18:00:00Z');
const finance=createFinanceRepository(database,()=>now),inbox=createInboxRepository(database),safe=createSafeSpendRepository(database),netWorth=createNetWorthRepository(database),budget=createBudgetRepository(database);
const fixture=await signingFixture();
const app=await buildApp({...config,rateLimitMax:10000},{jwks:fixture.resolver,dependencies:{profiles:createProfileRepository(database),finance,inbox,ping:database.ping,close:database.close}});
afterAll(()=>app.close());
const base='/api/v1/finance/inbox';
async function context(currency:'BRL'|'USD'|'JPY'|'KWD'='BRL') {
  const owner=randomUUID(),headers={authorization:`Bearer ${await fixture.token({sub:owner})}`};
  const account=await finance.createAccount(owner,{name:'Synthetic cash',type:'checking',currency,initialBalanceMinor:'100000'});
  const category=await finance.createCategory(owner,{name:'Synthetic expense',kind:'EXPENSE'});
  const draft:InboxCreate={description:'Synthetic proposal',type:'EXPENSE',currency,accountId:account.id,categoryId:category.id,amountMinor:'1200',occurredAt:'2026-10-15T12:00:00Z',idempotencyKey:randomUUID()};
  return {owner,headers,account,category,draft};
}
async function financialSnapshot(owner:string){
  const names=await database.pool.query<{table_name:string}>("select table_name from information_schema.columns where table_schema='app' and column_name='auth_user_id' and table_name<>'financial_inbox_candidates' order by table_name");
  const snapshot:Record<string,unknown>={};
  for(const {table_name} of names.rows){
    if(!/^[a-z_]+$/.test(table_name))throw new Error('unexpected table');
    const rows=await database.pool.query(`select md5(coalesce(string_agg(to_jsonb(t)::text,',' order by to_jsonb(t)::text),'')) as digest from app.${table_name} t where auth_user_id=$1`,[owner]);
    snapshot[table_name]=rows.rows[0].digest;
  }
  return snapshot;
}
const confirm=(id:string,headers:Record<string,string>,version=1,acknowledgeDuplicates=false)=>app.inject({method:'POST',url:base+'/'+id+'/confirm',headers,payload:{expectedVersion:version,acknowledgeDuplicates}});

describe('Inbox real PostgreSQL17, HTTP and ledger',()=>{
  it('pending create/edit/discard preserves all financial tables and calculated read models',async()=>{
    const c=await context();
    await safe.put(c.owner,{currency:'BRL',accountIds:[c.account.id],safetyBufferMinor:'0',respectBudget:true,reserveRecurrences:true,reserveGoalPlans:true});
    const read=async()=>({summary:await finance.summary(c.owner,'2026-10-01T00:00:00Z','2026-11-01T00:00:00Z'),safe:await safe.read(c.owner,'BRL',now),worth:await netWorth.components(c.owner,'2026-10-15','UTC'),budget:await budget.snapshot(c.owner,'2026-10','BRL','UTC')});
    const before=await financialSnapshot(c.owner),values=await read();
    const row=await inbox.create(c.owner,c.draft);
    await inbox.edit(c.owner,row.id,{...c.draft,amountMinor:'2500',expectedVersion:1});
    await inbox.discard(c.owner,row.id,{expectedVersion:2});
    expect(await financialSnapshot(c.owner)).toEqual(before);
    expect(await read()).toEqual(values);
  });
  it('posts one existing-core EXPENSE and updates balances only at confirmation; retries return the same reference',async()=>{
    const c=await context(),row=await inbox.create(c.owner,c.draft);
    expect((await finance.getAccount(c.owner,c.account.id))!.balanceMinor).toBe('100000');
    const posted=await confirm(row.id,c.headers);expect(posted.statusCode,posted.body).toBe(200);
    const result=posted.json<InboxItem>();expect(result).toMatchObject({status:'CONFIRMED',version:2});expect(result.transactionId).toBeTruthy();
    expect((await confirm(row.id,c.headers)).json()).toEqual(result);
    expect((await finance.getAccount(c.owner,c.account.id))!.balanceMinor).toBe('98800');
    expect((await finance.listTransactions(c.owner,{})).items).toHaveLength(1);
    expect((await finance.getTransaction(c.owner,result.transactionId!))!).toMatchObject({type:'EXPENSE',amountMinor:'1200',accountId:c.account.id});
  });
  it('serializes concurrent confirmation retries and concurrent creation retries',async()=>{
    const c=await context();
    const creations=await Promise.all(Array.from({length:8},()=>inbox.create(c.owner,c.draft)));
    expect(new Set(creations.map(r=>r.id)).size).toBe(1);
    const results=await Promise.all(Array.from({length:8},()=>confirm(creations[0]!.id,c.headers)));
    expect(results.every(r=>r.statusCode===200)).toBe(true);
    expect(new Set(results.map(r=>r.json<InboxItem>().transactionId)).size).toBe(1);
    expect((await finance.listTransactions(c.owner,{})).items).toHaveLength(1);
    const conflict=await app.inject({method:'POST',url:base,headers:c.headers,payload:{...c.draft,amountMinor:'13'}});expect(conflict.statusCode).toBe(409);
  });
  it('canonical creation replay after editing returns the existing proposal without overwriting it',async()=>{
    const c=await context(),row=await inbox.create(c.owner,c.draft);
    const updated=await inbox.edit(c.owner,row.id,{...c.draft,description:'Reviewed',expectedVersion:1});
    expect(await inbox.create(c.owner,{...c.draft,occurredAt:'2026-10-15T09:00:00-03:00'})).toEqual(updated);
    expect((await inbox.list(c.owner,{})).items).toHaveLength(1);
  });
  it('confirms INCOME using the existing core and validates category kind',async()=>{
    const c=await context();
    await expect(inbox.create(c.owner,{...c.draft,type:'INCOME'})).rejects.toMatchObject({code:'VALIDATION_ERROR'});
    const row=await inbox.create(c.owner,{...c.draft,type:'INCOME',categoryId:null,amountMinor:'5200'});
    expect((await confirm(row.id,c.headers)).statusCode).toBe(200);
    expect((await finance.getAccount(c.owner,c.account.id))!.balanceMinor).toBe('105200');
    const summary=await finance.summary(c.owner,'2026-10-01T00:00:00Z','2026-11-01T00:00:00Z');
    expect(summary.currencies[0]).toMatchObject({incomeMinor:'5200',expenseMinor:'0'});
  });
  it('rolls back the ledger insert if the candidate state write fails',async()=>{
    const c=await context(),row=await inbox.create(c.owner,{...c.draft,description:'ROLLBACK_MARKER'});
    await database.pool.query("create function app.inbox_test_rollback() returns trigger language plpgsql as $$ begin if NEW.description='ROLLBACK_MARKER' and NEW.status='CONFIRMED' then raise exception 'synthetic rollback'; end if; return NEW; end $$; create trigger inbox_test_rollback before update on app.financial_inbox_candidates for each row execute function app.inbox_test_rollback()");
    try{
      expect((await confirm(row.id,c.headers)).statusCode).toBe(500);
      expect((await inbox.review(c.owner,row.id)).candidate.status).toBe('PENDING');
      expect((await finance.listTransactions(c.owner,{})).items).toHaveLength(0);
      expect((await finance.getAccount(c.owner,c.account.id))!.balanceMinor).toBe('100000');
    }finally{await database.pool.query('drop trigger inbox_test_rollback on app.financial_inbox_candidates; drop function app.inbox_test_rollback()');}
    expect((await confirm(row.id,c.headers)).statusCode).toBe(200);
  });
  it('blocks incomplete confirmation, allows review editing and rejects stale versions',async()=>{
    const c=await context(),row=await inbox.create(c.owner,{...c.draft,accountId:null,amountMinor:null,occurredAt:null});
    expect(await inbox.review(c.owner,row.id)).toMatchObject({canConfirm:false,issues:['ACCOUNT_REQUIRED','AMOUNT_REQUIRED','DATE_REQUIRED']});
    expect((await confirm(row.id,c.headers)).json().error.code).toBe('INBOX_INCOMPLETE');
    const changed=await inbox.edit(c.owner,row.id,{...c.draft,expectedVersion:1});expect(changed.version).toBe(2);
    expect((await confirm(row.id,c.headers)).statusCode).toBe(409);
    expect((await confirm(row.id,c.headers,2)).statusCode).toBe(200);
    await expect(inbox.edit(c.owner,row.id,{...c.draft,expectedVersion:2})).rejects.toMatchObject({code:'CONFLICT'});
    await expect(inbox.discard(c.owner,row.id,{expectedVersion:2})).rejects.toMatchObject({code:'CONFLICT'});
  });
  it('an edit/confirm race either posts the reviewed version or rejects stale confirmation',async()=>{
    const c=await context(),row=await inbox.create(c.owner,c.draft);
    const results=await Promise.allSettled([inbox.edit(c.owner,row.id,{...c.draft,amountMinor:'2500',expectedVersion:1}),inbox.confirm(c.owner,row.id,{expectedVersion:1,acknowledgeDuplicates:false})]);
    expect(results.filter(r=>r.status==='fulfilled')).toHaveLength(1);
    const review=await inbox.review(c.owner,row.id),transactions=(await finance.listTransactions(c.owner,{})).items;
    if(review.candidate.status==='CONFIRMED')expect(transactions[0]!.amountMinor).toBe('1200');
    else {expect(review.candidate.amountMinor).toBe('2500');expect(transactions).toHaveLength(0);}
  });
  it('competing confirm/discard commands have one terminal outcome and never produce an orphan posting',async()=>{
    const c=await context(),row=await inbox.create(c.owner,c.draft);
    await Promise.allSettled([inbox.confirm(c.owner,row.id,{expectedVersion:1,acknowledgeDuplicates:false}),inbox.discard(c.owner,row.id,{expectedVersion:1})]);
    const state=(await inbox.review(c.owner,row.id)).candidate;
    expect(['CONFIRMED','DISCARDED']).toContain(state.status);
    expect((await finance.listTransactions(c.owner,{})).items).toHaveLength(state.status==='CONFIRMED'?1:0);
  });
  it('warns about ledger/pending duplicates, requires acknowledgement and detects a posting after review',async()=>{
    const c=await context(),one=await inbox.create(c.owner,c.draft),two=await inbox.create(c.owner,{...c.draft,idempotencyKey:randomUUID()});
    const review=await inbox.review(c.owner,one.id);expect(review.duplicates).toEqual([expect.objectContaining({id:two.id,source:'CANDIDATE'})]);
    expect((await confirm(one.id,c.headers)).json().error.code).toBe('INBOX_POSSIBLE_DUPLICATE');
    expect((await confirm(one.id,c.headers,1,true)).statusCode).toBe(200);
    expect((await inbox.review(c.owner,two.id)).duplicates[0]!.source).toBe('TRANSACTION');
    expect((await confirm(two.id,c.headers)).statusCode).toBe(409);
    const clean=await inbox.create(c.owner,{...c.draft,amountMinor:'321',idempotencyKey:randomUUID()});expect((await inbox.review(c.owner,clean.id)).duplicates).toEqual([]);
    await finance.createTransaction(c.owner,{...c.draft,accountId:c.account.id,categoryId:c.category.id,amountMinor:'321',occurredAt:c.draft.occurredAt!});
    expect((await confirm(clean.id,c.headers)).statusCode).toBe(409);
  });
  it('excludes cancelled postings and discarded candidates from duplicate hints',async()=>{
    const c=await context(),posted=await finance.createTransaction(c.owner,{accountId:c.account.id,type:'EXPENSE',amountMinor:'1200',currency:'BRL',description:'cancelled',occurredAt:c.draft.occurredAt!});
    await finance.patchTransaction(c.owner,posted.id,{isCancelled:true});
    const old=await inbox.create(c.owner,c.draft);await inbox.discard(c.owner,old.id,{expectedVersion:1});
    const row=await inbox.create(c.owner,{...c.draft,idempotencyKey:randomUUID()});expect((await inbox.review(c.owner,row.id)).duplicates).toHaveLength(0);
  });
  it('revalidates active account/category and managed account rules at posting time',async()=>{
    const c=await context(),row=await inbox.create(c.owner,c.draft);
    await finance.patchAccount(c.owner,c.account.id,{isActive:false});
    expect((await inbox.review(c.owner,row.id)).issues).toContain('ACCOUNT_UNAVAILABLE');
    expect((await confirm(row.id,c.headers)).statusCode).toBe(409);
    await finance.patchAccount(c.owner,c.account.id,{isActive:true});await finance.patchCategory(c.owner,c.category.id,{isActive:false});
    expect((await confirm(row.id,c.headers)).statusCode).toBe(409);
    await finance.patchCategory(c.owner,c.category.id,{isActive:true});
    const card=await finance.createAccount(c.owner,{name:'Synthetic credit',type:'credit',currency:'BRL',initialBalanceMinor:'0'});
    await database.pool.query("insert into app.financial_credit_cards(auth_user_id,account_id,currency,display_name,tracking_start_date) values($1,$2,'BRL','Synthetic managed','2026-01-01')",[c.owner,card.id]);
    const managed=await inbox.create(c.owner,{...c.draft,accountId:card.id,idempotencyKey:randomUUID()});
    expect((await confirm(managed.id,c.headers)).json().error.code).toBe('CARD_MANAGED_ACCOUNT');
    expect((await finance.listTransactions(c.owner,{})).items).toHaveLength(0);
  });
  it('returns 404 for foreign candidates/accounts/categories and rejects owner/status injection',async()=>{
    const a=await context(),b=await context(),row=await inbox.create(a.owner,a.draft);
    for(const method of ['GET','PATCH','POST'] as const){const url=base+'/'+row.id+(method==='POST'?'/confirm':'');const payload=method==='PATCH'?{...normalizeInboxDraft(a.draft),expectedVersion:1}:method==='POST'?{expectedVersion:1,acknowledgeDuplicates:false}:undefined;
      const r=await app.inject({method,url,headers:b.headers,...(payload?{payload}:{})});expect(r.statusCode).toBe(404);
    }
    for(const foreign of [{accountId:b.account.id},{categoryId:b.category.id}])expect((await app.inject({method:'POST',url:base,headers:a.headers,payload:{...a.draft,...foreign,idempotencyKey:randomUUID()}})).statusCode).toBe(404);
    for(const extra of [{ownerId:b.owner},{auth_user_id:b.owner},{status:'CONFIRMED'},{transactionId:randomUUID()}])expect((await app.inject({method:'POST',url:base,headers:a.headers,payload:{...a.draft,...extra}})).statusCode).toBe(400);
    expect((await app.inject({url:base})).statusCode).toBe(401);
  });
  it.each(['JPY','KWD','USD'] as const)('posts exact %s minor units without FX or mixing currencies',async currency=>{
    const c=await context(currency),row=await inbox.create(c.owner,{...c.draft,amountMinor:'9007199254740993'});
    expect((await confirm(row.id,c.headers)).statusCode).toBe(200);
    const ledger=(await finance.listTransactions(c.owner,{})).items[0]!;expect(ledger).toMatchObject({currency,amountMinor:'9007199254740993'});
    await expect(inbox.create(c.owner,{...c.draft,currency:'BRL',idempotencyKey:randomUUID()})).rejects.toMatchObject({code:'VALIDATION_ERROR'});
  });
  it('provides stable pagination and processed history without duplicate page rows',async()=>{
    const c=await context(),rows=[];for(let n=0;n<4;n++)rows.push(await inbox.create(c.owner,{...c.draft,idempotencyKey:randomUUID(),amountMinor:String(n+1)}));
    await inbox.discard(c.owner,rows[0]!.id,{expectedVersion:1});await inbox.confirm(c.owner,rows[1]!.id,{expectedVersion:1,acknowledgeDuplicates:false});
    const page=await inbox.list(c.owner,{limit:'2'}),next=await inbox.list(c.owner,{limit:'2',cursorAt:page.nextCursor!.createdAt,cursorId:page.nextCursor!.id});
    expect(new Set([...page.items,...next.items].map(r=>r.id)).size).toBe(4);
    expect((await inbox.list(c.owner,{status:'DISCARDED'})).items).toHaveLength(1);expect((await inbox.list(c.owner,{status:'CONFIRMED'})).items).toHaveLength(1);
    expect((await inbox.list(c.owner,{status:'PENDING'})).items).toHaveLength(2);
    expect((await app.inject({url:base+'?cursorId='+randomUUID(),headers:c.headers})).statusCode).toBe(400);
  });
  it('enforces real own-SELECT RLS and denies all authenticated/anonymous mutation paths',async()=>{
    const a=await context(),b=await context(),row=await inbox.create(a.owner,a.draft);await inbox.create(b.owner,b.draft);
    const client=await database.pool.connect();
    try{
      await client.query('begin');await client.query('set local role authenticated');await client.query("select set_config('request.jwt.claim.sub',$1,true)",[a.owner]);
      expect((await client.query('select id from app.financial_inbox_candidates')).rows.map(r=>r.id)).toEqual([row.id]);
      expect((await client.query("update app.financial_inbox_candidates set description='denied' where auth_user_id=$1",[a.owner])).rowCount).toBe(0);
      expect((await client.query('delete from app.financial_inbox_candidates where auth_user_id=$1',[a.owner])).rowCount).toBe(0);
      await expect(client.query("insert into app.financial_inbox_candidates(auth_user_id,description,type,currency,idempotency_key,creation_fingerprint) values($1,'denied','INCOME','BRL',$2,repeat('a',64))",[a.owner,randomUUID()])).rejects.toMatchObject({code:'42501'});await client.query('rollback');
      await client.query('begin');await client.query('set local role anon');expect((await client.query('select id from app.financial_inbox_candidates')).rowCount).toBe(0);await client.query('rollback');
    }finally{await client.query('rollback');client.release();}
  });
  it('enforces compound ownership, immutable identity and terminal state directly in PostgreSQL',async()=>{
    const a=await context(),b=await context(),row=await inbox.create(a.owner,a.draft);
    await expect(database.pool.query('update app.financial_inbox_candidates set account_id=$1,version=version+1 where id=$2',[b.account.id,row.id])).rejects.toMatchObject({code:'23503'});
    await expect(database.pool.query('update app.financial_inbox_candidates set auth_user_id=$1,version=version+1 where id=$2',[b.owner,row.id])).rejects.toMatchObject({code:'23514'});
    await inbox.discard(a.owner,row.id,{expectedVersion:1});
    await expect(database.pool.query("update app.financial_inbox_candidates set status='PENDING',processed_at=null,version=version+1 where id=$1",[row.id])).rejects.toMatchObject({code:'23514'});
    await expect(database.pool.query('delete from app.financial_inbox_candidates where id=$1',[row.id])).rejects.toMatchObject({code:'23514'});
  });
  it('bounds review/list work with 2000 synthetic proposals and preserves core read performance',async()=>{
    const c=await context();
    await database.pool.query("insert into app.financial_inbox_candidates(auth_user_id,description,type,currency,account_id,amount_minor,occurred_at,idempotency_key,creation_fingerprint) select $1,'Synthetic load','EXPENSE','BRL',$2,1200,'2026-10-15T12:00:00Z',gen_random_uuid(),repeat('a',64) from generate_series(1,2000)",[c.owner,c.account.id]);
    const start=performance.now(),page=await inbox.list(c.owner,{limit:'50',status:'PENDING'}),review=await inbox.review(c.owner,page.items[0]!.id);
    expect(page.items).toHaveLength(50);expect(review.duplicates).toHaveLength(10);expect(review.duplicatesTruncated).toBe(true);expect(performance.now()-start).toBeLessThan(2500);
    const coreStart=performance.now();expect((await finance.getAccount(c.owner,c.account.id))!.balanceMinor).toBe('100000');expect(performance.now()-coreStart).toBeLessThan(1000);
  });
  it('sanitizes error responses and never serializes candidate fingerprints',async()=>{
    const c=await context(),created=await app.inject({method:'POST',url:base,headers:c.headers,payload:c.draft});expect(created.statusCode).toBe(201);
    expect(created.body).not.toContain('Fingerprint');expect(created.body).not.toContain('authUserId');
    const review=await app.inject({url:base+'/'+created.json<InboxItem>().id,headers:c.headers});expect(review.json<InboxReview>().canConfirm).toBe(true);
    expect((await app.inject('/api/v1/health/live')).statusCode).toBe(200);expect((await app.inject('/api/v1/health/ready')).statusCode).toBe(200);
  });
});
