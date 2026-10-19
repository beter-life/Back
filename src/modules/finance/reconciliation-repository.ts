import { and,desc,eq,inArray,isNull,sql } from 'drizzle-orm';
import type { Database } from '../../db/client.js';
import type { SQL } from 'drizzle-orm';
import { statementEvidence as evidence,evidenceOrigins as origins,reconciliations as matches } from '../../db/schema/reconciliation.js';
import { financialAccounts as accounts,financialTransactions as transactions } from '../../db/schema/finance.js';
import { importBatches as batches,importRows as receipts } from '../../db/schema/imports.js';
import { inboxCandidates as candidates } from '../../db/schema/inbox.js';
import { AppError } from '../../shared/errors/index.js';
import { createFinanceRepository,type FinanceTransaction } from './repository.js';
import { lockInboxOwner } from './inbox-repository.js';
import { inboxFingerprint } from './inbox-domain.js';
import { normalizeImportRow } from './import-domain.js';
import { compareEvidence,evidenceKey,ledgerFingerprint,reconciliationRange } from './reconciliation-domain.js';
import type { Transaction } from './contracts.js';
import type * as C from './reconciliation-contracts.js';
type E=typeof evidence.$inferSelect;
type M=typeof matches.$inferSelect;
type T=typeof transactions.$inferSelect;
type Tx=FinanceTransaction;
const cursor=(q:C.ReconciliationQuery,column:ReturnType<typeof sql>)=>q.cursorAt&&q.cursorId?sql`(${column})<(${new Date(q.cursorAt)},${q.cursorId}::uuid)`:undefined;
const managedCondition=(owner:string,id:string|SQL,at:Date|SQL,transactionId?:string|SQL)=>sql`(exists(select 1 from app.financial_debts where auth_user_id=${owner}::uuid and account_id=${id}::uuid) or exists(select 1 from app.financial_credit_cards c left join app.profiles p on p.auth_user_id=c.auth_user_id where c.auth_user_id=${owner}::uuid and c.account_id=${id}::uuid and (${at}::timestamptz at time zone coalesce(p.timezone,'UTC'))::date>=c.tracking_start_date) ${transactionId?sql`or exists(select 1 from app.financial_card_installments i where i.auth_user_id=${owner}::uuid and i.transaction_id=${transactionId}::uuid) or exists(select 1 from app.financial_debt_payments d where d.auth_user_id=${owner}::uuid and (${transactionId}::uuid=d.interest_transaction_id or ${transactionId}::uuid=d.fee_transaction_id))`:sql``})`;
function page<T extends {id:string}>(rows:T[],instant:(row:T)=>Date|string){const items=rows.slice(0,25),last=items.at(-1);return {items,nextCursor:rows.length>25&&last?{createdAt:new Date(instant(last)).toISOString(),id:last.id}:null};}
const txn=(t:T):Transaction=>({...t,amountMinor:String(t.amountMinor),createdAt:t.createdAt.toISOString(),updatedAt:t.updatedAt.toISOString(),occurredAt:t.occurredAt.toISOString(),destinationAccountId:null,type:t.type as 'INCOME'|'EXPENSE'});
const match=(m:M,e:E,t:T|undefined):C.ReconciliationMatch=>({id:m.id,evidenceId:m.evidenceId,transactionId:m.transactionId,idempotencyKey:m.idempotencyKey,dateAcknowledged:m.dateAcknowledged,createdAt:m.createdAt.toISOString(),reversedAt:m.reversedAt?.toISOString()??null,valid:!!t&&compareEvidence(e,t).compatible&&m.transactionFingerprint===ledgerFingerprint(t)});
export function createReconciliationRepository(database:Database,clock=()=>new Date()){
  const {db}=database;
  async function ownAccount(tx:Tx,owner:string,id:string,lock=false){const q=tx.select().from(accounts).where(and(eq(accounts.authUserId,owner),eq(accounts.id,id)));const [a]=await(lock?q.for('share'):q);if(!a)throw new AppError('NOT_FOUND');return a;}
  async function ownEvidence(tx:Tx,owner:string,id:string){const [e]=await tx.select().from(evidence).where(and(eq(evidence.authUserId,owner),eq(evidence.id,id)));if(!e)throw new AppError('NOT_FOUND');return e;}
  async function managed(tx:Tx,owner:string,id:string,at:Date,transactionId?:string){const r=await tx.execute(sql`select ${managedCondition(owner,id,at,transactionId)} as blocked`);return r.rows[0]?.blocked===true;}
  async function queryAccount(tx:Tx,owner:string,q:C.ReconciliationQuery){reconciliationRange(q.from,q.to);if(!!q.cursorAt!==!!q.cursorId)throw new AppError('VALIDATION_ERROR');return ownAccount(tx,owner,q.accountId);}
  async function currentMatches(tx:Tx,owner:string,ids:string[]){if(!ids.length)return [];return tx.select({m:matches,e:evidence,t:transactions}).from(matches).innerJoin(evidence,and(eq(evidence.id,matches.evidenceId),eq(evidence.authUserId,matches.authUserId))).innerJoin(transactions,and(eq(transactions.id,matches.transactionId),eq(transactions.authUserId,matches.authUserId))).where(and(eq(matches.authUserId,owner),inArray(matches.evidenceId,ids),isNull(matches.reversedAt)));}
  async function evidenceViews(tx:Tx,owner:string,rows:E[]){const all=await currentMatches(tx,owner,rows.map(e=>e.id));return rows.map(e=>{const a=all.find(a=>a.m.evidenceId===e.id);return {id:e.id,accountId:e.accountId,currency:e.currency,type:e.type,amountMinor:String(e.amountMinor),occurredAt:e.occurredAt.toISOString(),description:e.description,createdAt:e.createdAt.toISOString(),match:a?match(a.m,a.e,a.t):null};});}
  const read=<T>(fn:(tx:Tx)=>Promise<T>)=>db.transaction(fn,{isolationLevel:'repeatable read',accessMode:'read only'});
  return {
    async capture(owner:string,input:C.ReconciliationCapture){return db.transaction(async tx=>{
      await lockInboxOwner(tx,owner);
      const [batch]=await tx.select().from(batches).where(and(eq(batches.authUserId,owner),eq(batches.id,input.batchId))).for('share');if(!batch)throw new AppError('NOT_FOUND');
      const previous=await tx.select().from(origins).where(and(eq(origins.authUserId,owner),eq(origins.batchId,batch.id),inArray(origins.rowNumber,input.rowNumbers)));
      if(previous.length&&batch.parsed&&batch.expiresAt>clock()&&batch.mapping&&batch.currency){
        const retained=await tx.select().from(evidence).where(and(eq(evidence.authUserId,owner),inArray(evidence.id,previous.map(p=>p.evidenceId))));
        for(const p of previous){const cells=batch.parsed.rows[p.rowNumber-1],snapshot=retained.find(e=>e.id===p.evidenceId),current=cells?normalizeImportRow(cells,batch.mapping,batch.format,batch.currency,batch.timeZone):null;if(!current?.draft||!snapshot||inboxFingerprint(current.draft)!==snapshot.fingerprint)throw new AppError('CONFLICT');}
      }
      if(previous.length===input.rowNumbers.length)return {evidenceIds:input.rowNumbers.map(n=>previous.find(p=>p.rowNumber===n)!.evidenceId)};
      if(batch.version!==input.expectedVersion||!batch.parsed||batch.expiresAt<=clock()||!batch.mapping||!batch.currency)throw new AppError('CONFLICT');
      const account=await ownAccount(tx,owner,batch.mapping.accountId,true);
      if(!account.isActive||!['checking','savings','cash','other'].includes(account.type)||account.currency!==batch.currency)throw new AppError('CONFLICT');
      const ids:string[]=[];
      for(const n of input.rowNumbers){
        const prior=previous.find(p=>p.rowNumber===n);if(prior){ids.push(prior.evidenceId);continue;}
        const cells=batch.parsed.rows[n-1];if(!cells)throw new AppError('VALIDATION_ERROR');
        const normalized=normalizeImportRow(cells,batch.mapping,batch.format,batch.currency,batch.timeZone),draft=normalized.draft;
        if(!draft||normalized.issues.length||!draft.amountMinor||!draft.occurredAt||await managed(tx,owner,account.id,new Date(draft.occurredAt)))throw new AppError('VALIDATION_ERROR');
        const sourceKey=evidenceKey(batch.fileHash,n,draft,normalized.externalId),fingerprint=inboxFingerprint(draft);
        const [existing]=await tx.select().from(evidence).where(and(eq(evidence.authUserId,owner),eq(evidence.sourceKey,sourceKey)));
        if(existing&&existing.fingerprint!==fingerprint)throw new AppError('CONFLICT');
        const row=existing??(await tx.insert(evidence).values({authUserId:owner,accountId:account.id,currency:account.currency,type:draft.type,amountMinor:BigInt(draft.amountMinor),occurredAt:new Date(draft.occurredAt),description:draft.description,sourceKey,fingerprint,createdAt:clock()}).returning())[0]!;
        await tx.insert(origins).values({authUserId:owner,evidenceId:row.id,batchId:batch.id,rowNumber:n,createdAt:clock()});ids.push(row.id);
      }
      return {evidenceIds:ids};
    });},
    async listEvidence(owner:string,q:C.ReconciliationQuery){return read(async tx=>{
      await queryAccount(tx,owner,q);
      const active=sql`exists(select 1 from app.financial_reconciliations r where r.auth_user_id=${owner}::uuid and r.evidence_id=${evidence.id} and r.reversed_at is null)`;
      const rows=await tx.select().from(evidence).where(and(eq(evidence.authUserId,owner),eq(evidence.accountId,q.accountId),sql`${evidence.occurredAt}>=${new Date(q.from)} and ${evidence.occurredAt}<${new Date(q.to)}`,cursor(q,sql`${evidence.occurredAt},${evidence.id}`),q.status==='RECONCILED'?active:q.status==='UNRECONCILED'?sql`not (${active})`:undefined)).orderBy(desc(evidence.occurredAt),desc(evidence.id)).limit(26);
      const result=page(rows,e=>e.occurredAt);return {...result,items:await evidenceViews(tx,owner,result.items)};
    });},
    async movements(owner:string,q:C.ReconciliationQuery){return read(async tx=>{
      await queryAccount(tx,owner,q);
      const core=createFinanceRepository({...database,db:tx as unknown as Database['db']});
      const result=await core.listTransactions(owner,{accountId:q.accountId,from:q.from,to:q.to,limit:'25',...(q.cursorAt&&q.cursorId?{cursorAt:q.cursorAt,cursorId:q.cursorId}:{})});
      const ids=result.items.filter(t=>t.type!=='TRANSFER').map(t=>t.id);
      const links=ids.length?await tx.select({m:matches,e:evidence,t:transactions}).from(matches).innerJoin(evidence,and(eq(evidence.id,matches.evidenceId),eq(evidence.authUserId,matches.authUserId))).innerJoin(transactions,and(eq(transactions.id,matches.transactionId),eq(transactions.authUserId,matches.authUserId))).where(and(eq(matches.authUserId,owner),inArray(matches.transactionId,ids),isNull(matches.reversedAt))):[];
      const items=result.items.map(transaction=>{const link=links.find(l=>l.m.transactionId===transaction.id);return {transaction,match:link?match(link.m,link.e,link.t):null};}).filter(r=>!q.status||q.status==='ALL'||(q.status==='RECONCILED'?!!r.match:!r.match));
      return {items,nextCursor:result.nextCursor?{createdAt:result.nextCursor.occurredAt,id:result.nextCursor.id}:null};
    });},
    async proposals(owner:string,q:C.ReconciliationQuery){return read(async tx=>{
      await queryAccount(tx,owner,q);
      const linked=sql`exists(select 1 from app.financial_reconciliations r where r.auth_user_id=${owner}::uuid and r.transaction_id=${candidates.transactionId} and r.reversed_at is null)`;
      const rows=await tx.select({candidate:candidates,batchId:receipts.batchId,rowNumber:receipts.rowNumber,receiptId:receipts.id,receiptAt:receipts.createdAt}).from(receipts).innerJoin(candidates,and(eq(candidates.id,receipts.candidateId),eq(candidates.authUserId,receipts.authUserId))).innerJoin(batches,and(eq(batches.id,receipts.batchId),eq(batches.authUserId,receipts.authUserId))).where(and(eq(receipts.authUserId,owner),eq(batches.accountId,q.accountId),sql`(${candidates.occurredAt} is null or (${candidates.occurredAt}>=${new Date(q.from)} and ${candidates.occurredAt}<${new Date(q.to)}))`,cursor(q,sql`${receipts.createdAt},${receipts.id}`),q.status==='RECONCILED'?linked:q.status==='UNRECONCILED'?sql`not (${linked})`:undefined)).orderBy(desc(receipts.createdAt),desc(receipts.id)).limit(26);
      const selected=rows.slice(0,25),last=selected.at(-1);return {items:selected.map(({candidate:c,batchId,rowNumber})=>({candidate:{...c,type:c.type as 'INCOME'|'EXPENSE',source:c.source as 'MANUAL'|'FILE_CSV'|'FILE_OFX'|'FILE_PDF',status:c.status as 'PENDING'|'CONFIRMED'|'DISCARDED',amountMinor:c.amountMinor===null?null:String(c.amountMinor),occurredAt:c.occurredAt?.toISOString()??null,processedAt:c.processedAt?.toISOString()??null,createdAt:c.createdAt.toISOString(),updatedAt:c.updatedAt.toISOString()},batchId,rowNumber})),nextCursor:rows.length>25&&last?{createdAt:last.receiptAt.toISOString(),id:last.receiptId}:null};
    });},
    async review(owner:string,id:string):Promise<C.ReconciliationReview>{return read(async tx=>{
      const e=await ownEvidence(tx,owner,id);await ownAccount(tx,owner,e.accountId);
      const sources=await tx.select({batchId:origins.batchId,rowNumber:origins.rowNumber,fileName:batches.fileName,format:batches.format,candidateId:receipts.candidateId,candidateStatus:candidates.status,transactionId:candidates.transactionId,fingerprint:receipts.fingerprint}).from(origins).innerJoin(batches,and(eq(batches.id,origins.batchId),eq(batches.authUserId,origins.authUserId))).leftJoin(receipts,and(eq(receipts.batchId,origins.batchId),eq(receipts.rowNumber,origins.rowNumber),eq(receipts.authUserId,origins.authUserId))).leftJoin(candidates,and(eq(candidates.id,receipts.candidateId),eq(candidates.authUserId,receipts.authUserId))).where(and(eq(origins.authUserId,owner),eq(origins.evidenceId,id))).orderBy(origins.createdAt,origins.id).limit(51);
      const proven=sources.filter(s=>s.fingerprint===e.fingerprint&&s.candidateStatus==='CONFIRMED'&&s.transactionId).map(s=>s.transactionId!);
      const possibilities=await tx.select().from(transactions).where(and(eq(transactions.authUserId,owner),eq(transactions.accountId,e.accountId),eq(transactions.currency,e.currency),eq(transactions.type,e.type),sql`(${transactions.occurredAt} between ${e.occurredAt}::timestamptz-interval '31 days' and ${e.occurredAt}::timestamptz+interval '31 days' or ${proven.length?inArray(transactions.id,proven):sql`false`})`)).orderBy(sql`case when ${transactions.amountMinor}=${String(e.amountMinor)}::bigint then 0 else 1 end`,sql`abs(extract(epoch from ${transactions.occurredAt}-${e.occurredAt}::timestamptz))`,transactions.id).limit(51);
      const possibleIds=possibilities.slice(0,50).map(t=>t.id);
      const blocked=possibleIds.length?await tx.execute(sql`select ${transactions.id} as id from ${transactions} where ${transactions.authUserId}=${owner}::uuid and ${inArray(transactions.id,possibleIds)} and ${managedCondition(owner,sql`${transactions.accountId}`,sql`${transactions.occurredAt}`,sql`${transactions.id}`)}`):{rows:[]};
      const managedIds=new Set(blocked.rows.map(r=>String(r.id)));
      const conflicts=possibleIds.length?await tx.select({transactionId:matches.transactionId,evidenceId:matches.evidenceId}).from(matches).where(and(eq(matches.authUserId,owner),inArray(matches.transactionId,possibleIds),isNull(matches.reversedAt))):[];
      const suggestions=possibilities.slice(0,50).map(t=>{const compared=compareEvidence(e,t),managed=managedIds.has(t.id);return {transaction:txn(t),...compared,managed,compatible:compared.compatible&&!managed,provenLink:proven.includes(t.id)&&compared.compatible&&!compared.dateDifference&&!managed,conflicting:conflicts.some(c=>c.transactionId===t.id&&c.evidenceId!==id)};});
      const allowed=suggestions.filter(s=>s.compatible&&!s.conflicting),current=(await evidenceViews(tx,owner,[e]))[0]!;
      return {evidence:current,origins:sources.slice(0,50).map(({fingerprint:_,...s})=>{void _;return s;}),originsTruncated:sources.length>50,suggestions,suggestionsTruncated:possibilities.length>50,classification:current.match?(current.match.valid?'RECONCILED':'CONFLICT'):allowed.length>1||possibilities.length>50?'AMBIGUOUS':allowed.some(s=>s.provenLink)?'PROVEN_LINK':allowed.length?'SUGGESTED':'NO_MATCH',managed:!allowed.length&&await managed(tx,owner,e.accountId,e.occurredAt)};
    });},
    async confirm(owner:string,input:C.ReconciliationConfirm){return db.transaction(async tx=>{
      await lockInboxOwner(tx,owner);
      const [previous]=await tx.select().from(matches).where(and(eq(matches.authUserId,owner),eq(matches.idempotencyKey,input.idempotencyKey)));
      const e=await ownEvidence(tx,owner,input.evidenceId);await ownAccount(tx,owner,e.accountId,true);
      const [t]=await tx.select().from(transactions).where(and(eq(transactions.authUserId,owner),eq(transactions.id,input.transactionId))).for('update');if(!t)throw new AppError('NOT_FOUND');
      if(previous){if(previous.evidenceId!==e.id||previous.transactionId!==t.id||previous.dateAcknowledged!==input.acknowledgeDateDifference)throw new AppError('CONFLICT');return match(previous,e,t);}
      if(await managed(tx,owner,e.accountId,t.occurredAt,t.id))throw new AppError('CONFLICT');
      const compared=compareEvidence(e,t);if(!compared.compatible||compared.dateDifference&&!input.acknowledgeDateDifference)throw new AppError('CONFLICT');
      const active=await tx.select({id:matches.id}).from(matches).where(and(eq(matches.authUserId,owner),isNull(matches.reversedAt),sql`(${matches.evidenceId}=${e.id}::uuid or ${matches.transactionId}=${t.id}::uuid)`)).limit(1);
      if(active.length)throw new AppError('CONFLICT');
      const [row]=await tx.insert(matches).values({authUserId:owner,evidenceId:e.id,transactionId:t.id,idempotencyKey:input.idempotencyKey,dateAcknowledged:input.acknowledgeDateDifference,transactionFingerprint:ledgerFingerprint(t),createdAt:clock()}).returning();return match(row!,e,t);
    });},
    async reverse(owner:string,id:string,input:C.ReconciliationReverse){return db.transaction(async tx=>{
      await lockInboxOwner(tx,owner);const [m]=await tx.select().from(matches).where(and(eq(matches.authUserId,owner),eq(matches.id,id))).for('update');if(!m)throw new AppError('NOT_FOUND');
      const e=await ownEvidence(tx,owner,m.evidenceId),[t]=await tx.select().from(transactions).where(and(eq(transactions.authUserId,owner),eq(transactions.id,m.transactionId)));
      if(m.reversedAt){if(m.reversalKey!==input.idempotencyKey.toLowerCase())throw new AppError('CONFLICT');return match(m,e,t);}
      const reused=await tx.select({id:matches.id}).from(matches).where(and(eq(matches.authUserId,owner),eq(matches.reversalKey,input.idempotencyKey))).limit(1);if(reused.length)throw new AppError('CONFLICT');
      const [row]=await tx.update(matches).set({reversedAt:clock(),reversalKey:input.idempotencyKey}).where(eq(matches.id,id)).returning();return match(row!,e,t);
    });},
    async history(owner:string,q:C.ReconciliationQuery){return read(async tx=>{
      await queryAccount(tx,owner,q);const rows=await tx.select({m:matches,e:evidence,t:transactions}).from(matches).innerJoin(evidence,and(eq(evidence.id,matches.evidenceId),eq(evidence.authUserId,matches.authUserId))).innerJoin(transactions,and(eq(transactions.id,matches.transactionId),eq(transactions.authUserId,matches.authUserId))).where(and(eq(matches.authUserId,owner),eq(evidence.accountId,q.accountId),sql`${matches.createdAt}>=${new Date(q.from)} and ${matches.createdAt}<${new Date(q.to)}`,cursor(q,sql`${matches.createdAt},${matches.id}`),q.status==='RECONCILED'?isNull(matches.reversedAt):q.status==='UNRECONCILED'?sql`${matches.reversedAt} is not null`:undefined)).orderBy(desc(matches.createdAt),desc(matches.id)).limit(26);
      const selected=rows.slice(0,25),last=selected.at(-1);return {items:selected.map(r=>match(r.m,r.e,r.t)),nextCursor:rows.length>25&&last?{createdAt:last.m.createdAt.toISOString(),id:last.m.id}:null};
    });},
  };
}
export type ReconciliationRepository=ReturnType<typeof createReconciliationRepository>;
