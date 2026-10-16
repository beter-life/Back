import { and, desc, eq, sql } from 'drizzle-orm';
import type { Database } from '../../db/client.js';
import { inboxCandidates as candidates } from '../../db/schema/inbox.js';
import { financialAccounts as accounts, financialCategories as categories } from '../../db/schema/finance.js';
import { AppError } from '../../shared/errors/index.js';
import { postFinancialTransaction, type FinanceTransaction } from './repository.js';
import { inboxFingerprint, normalizeInboxDraft } from './inbox-domain.js';
import type { InboxConfirm, InboxCreate, InboxDiscard, InboxDraft, InboxDuplicate, InboxEdit, InboxIssue, InboxItem, InboxPage, InboxQuery, InboxReview } from './inbox-contracts.js';

type Row = typeof candidates.$inferSelect;
type Reader = Pick<FinanceTransaction, 'select' | 'execute'>;
export interface InboxRepository {
  list(owner: string, query: InboxQuery): Promise<InboxPage>;
  create(owner: string, input: InboxCreate): Promise<InboxItem>;
  review(owner: string, id: string): Promise<InboxReview>;
  edit(owner: string, id: string, input: InboxEdit): Promise<InboxItem>;
  confirm(owner: string, id: string, input: InboxConfirm): Promise<InboxItem>;
  discard(owner: string, id: string, input: InboxDiscard): Promise<InboxItem>;
}
function item(row: Row): InboxItem {
  return { id: row.id, source: row.source as InboxItem['source'], status: row.status as InboxItem['status'], version: row.version,
    description: row.description, type: row.type as InboxItem['type'], currency: row.currency,
    accountId: row.accountId, categoryId: row.categoryId, amountMinor: row.amountMinor === null ? null : String(row.amountMinor),
    occurredAt: row.occurredAt?.toISOString() ?? null, transactionId: row.transactionId,
    processedAt: row.processedAt?.toISOString() ?? null, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() };
}
const values = (draft: InboxDraft) => ({ ...draft, amountMinor: draft.amountMinor === null ? null : BigInt(draft.amountMinor), occurredAt: draft.occurredAt === null ? null : new Date(draft.occurredAt) });
export const lockInboxOwner = (tx: FinanceTransaction, owner: string) => tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${owner},11))`);
const lockOwner=lockInboxOwner;
// Only trusted adapters call this primitive. Import validates/locks one common
// account once and has no categories; SQL owner FKs remain active for every row.
export async function createPendingInboxProposal(tx:FinanceTransaction,owner:string,input:InboxCreate,source:InboxItem['source']='MANUAL',assignmentsValidated=false):Promise<InboxItem> {
  const draft=normalizeInboxDraft(input),fingerprint=inboxFingerprint(draft);
  const [previous]=await tx.select().from(candidates).where(and(eq(candidates.authUserId,owner),eq(candidates.idempotencyKey,input.idempotencyKey)));
  if(previous){if(previous.creationFingerprint!==fingerprint||previous.source!==source)throw new AppError('CONFLICT');return item(previous);}
  if(!assignmentsValidated)await assignments(tx,owner,draft);
  const [row]=await tx.insert(candidates).values({...values(draft),authUserId:owner,source,idempotencyKey:input.idempotencyKey,creationFingerprint:fingerprint}).returning();return item(row!);
}
async function own(tx: Reader, owner: string, id: string, lock = false): Promise<Row> {
  const query = tx.select().from(candidates).where(and(eq(candidates.id,id),eq(candidates.authUserId,owner)));
  const [row] = await (lock ? query.for('update') : query);
  if (!row) throw new AppError('NOT_FOUND');
  return row;
}
function pending(row: Row, version: number) {
  if (row.status !== 'PENDING' || row.version !== version) throw new AppError('CONFLICT');
}
async function assignments(tx: Reader, owner: string, draft: InboxDraft) {
  if (draft.accountId) {
    const [account] = await tx.select().from(accounts).where(and(eq(accounts.authUserId,owner),eq(accounts.id,draft.accountId)));
    if (!account) throw new AppError('NOT_FOUND');
    if (account.currency !== draft.currency) throw new AppError('VALIDATION_ERROR');
    if (!account.isActive) throw new AppError('CONFLICT');
  }
  if (draft.categoryId) {
    const [category] = await tx.select().from(categories).where(and(eq(categories.authUserId,owner),eq(categories.id,draft.categoryId)));
    if (!category) throw new AppError('NOT_FOUND');
    if (category.kind !== draft.type) throw new AppError('VALIDATION_ERROR');
    if (!category.isActive) throw new AppError('CONFLICT');
  }
}
async function issues(tx: Reader, owner: string, row: Row): Promise<InboxIssue[]> {
  const result: InboxIssue[] = [];
  if (!row.accountId) result.push('ACCOUNT_REQUIRED');
  if (row.amountMinor === null) result.push('AMOUNT_REQUIRED');
  if (row.occurredAt === null) result.push('DATE_REQUIRED');
  if (row.accountId) {
    const [account] = await tx.select().from(accounts).where(and(eq(accounts.authUserId,owner),eq(accounts.id,row.accountId)));
    if (!account?.isActive || account.currency !== row.currency) result.push('ACCOUNT_UNAVAILABLE');
    const managed = await tx.execute(sql`select 1 from app.financial_debts where auth_user_id=${owner}::uuid and account_id=${row.accountId}::uuid
      union all select 1 from app.financial_credit_cards c left join app.profiles p on p.auth_user_id=c.auth_user_id
      where c.auth_user_id=${owner}::uuid and c.account_id=${row.accountId}::uuid
      and (${row.occurredAt ?? new Date()}::timestamptz at time zone coalesce(p.timezone,'UTC'))::date >= c.tracking_start_date limit 1`);
    if (managed.rows.length) result.push('MANAGED_ACCOUNT');
  }
  if (row.categoryId) {
    const [category] = await tx.select().from(categories).where(and(eq(categories.authUserId,owner),eq(categories.id,row.categoryId)));
    if (!category?.isActive || category.kind !== row.type) result.push('CATEGORY_UNAVAILABLE');
  }
  return result;
}
async function duplicates(tx: Reader, owner: string, row: Row) {
  if (!row.accountId || row.amountMinor === null || !row.occurredAt) return { duplicates: [], duplicatesTruncated: false };
  const common = sql`auth_user_id=${owner}::uuid and account_id=${row.accountId}::uuid and currency=${row.currency} and type=${row.type}
    and amount_minor=${String(row.amountMinor)}::bigint and occurred_at between ${row.occurredAt}::timestamptz-interval '24 hours' and ${row.occurredAt}::timestamptz+interval '24 hours'`;
  const result = await tx.execute(sql`(select id,'TRANSACTION' as source,description,amount_minor::text,currency,occurred_at from app.financial_transactions
    where ${common} and not is_cancelled order by occurred_at desc,id desc limit 11)
    union all (select id,'CANDIDATE' as source,description,amount_minor::text,currency,occurred_at from app.financial_inbox_candidates
    where ${common} and status='PENDING' and id<>${row.id}::uuid order by occurred_at desc,id desc limit 11)`);
  const selected = result.rows.filter((r, index, all) => all.slice(0,index).filter(previous => previous.source === r.source).length < 10);
  return { duplicates: selected.map(r => ({ id: String(r.id), source: r.source as InboxDuplicate['source'], description: String(r.description),
    amountMinor: String(r.amount_minor), currency: r.currency as InboxDuplicate['currency'], occurredAt: new Date(String(r.occurred_at)).toISOString() })), duplicatesTruncated: result.rows.length > selected.length };
}
export function createInboxRepository({ db }: Database): InboxRepository {
  return {
    async list(owner, query) {
      if (!!query.cursorAt !== !!query.cursorId) throw new AppError('VALIDATION_ERROR');
      const limit = Number(query.limit ?? '25');
      const rows = await db.select().from(candidates).where(and(eq(candidates.authUserId,owner),
        query.status ? eq(candidates.status,query.status) : undefined, query.currency ? eq(candidates.currency,query.currency) : undefined,
        query.type ? eq(candidates.type,query.type) : undefined,
        query.cursorAt && query.cursorId ? sql`(${candidates.createdAt},${candidates.id}) < (${new Date(query.cursorAt)},${query.cursorId}::uuid)` : undefined))
        .orderBy(desc(candidates.createdAt),desc(candidates.id)).limit(limit+1);
      const items = rows.slice(0,limit).map(item), last = items.at(-1);
      return { items, nextCursor: rows.length>limit && last ? { createdAt: last.createdAt, id:last.id } : null };
    },
    async create(owner,input) {
      return db.transaction(async tx => {
        await lockOwner(tx,owner);
        return createPendingInboxProposal(tx,owner,input);
      });
    },
    async review(owner,id) {
      return db.transaction(async tx => {
        const row=await own(tx,owner,id), currentIssues=await issues(tx,owner,row);
        return { candidate:item(row), issues:currentIssues, canConfirm:row.status==='PENDING' && !currentIssues.length,
          ...(row.status==='PENDING' ? await duplicates(tx,owner,row) : {duplicates:[],duplicatesTruncated:false}) };
      }, { isolationLevel:'repeatable read',accessMode:'read only' });
    },
    async edit(owner,id,input) {
      const draft=normalizeInboxDraft(input);
      return db.transaction(async tx => {
        await lockOwner(tx,owner);
        const row=await own(tx,owner,id,true); pending(row,input.expectedVersion);
        await assignments(tx,owner,draft);
        const [updated]=await tx.update(candidates).set({ ...values(draft),version:row.version+1,updatedAt:new Date() }).where(eq(candidates.id,row.id)).returning();
        return item(updated!);
      });
    },
    async confirm(owner,id,input) {
      return db.transaction(async tx => {
        await lockOwner(tx,owner);
        const row=await own(tx,owner,id,true);
        if(row.status==='CONFIRMED') return item(row);
        pending(row,input.expectedVersion);
        const draft=normalizeInboxDraft(item(row));
        if(!draft.accountId || !draft.amountMinor || !draft.occurredAt) throw new AppError('INBOX_INCOMPLETE');
        const matches=await duplicates(tx,owner,row);
        if(matches.duplicates.length && !input.acknowledgeDuplicates) throw new AppError('INBOX_POSSIBLE_DUPLICATE');
        const posted=await postFinancialTransaction(tx,owner,{ accountId:draft.accountId, ...(draft.categoryId ? {categoryId:draft.categoryId} : {}),
          type:draft.type, amountMinor:draft.amountMinor,currency:draft.currency,description:draft.description,occurredAt:draft.occurredAt });
        const [confirmed]=await tx.update(candidates).set({status:'CONFIRMED',transactionId:posted.id,processedAt:new Date(),updatedAt:new Date(),version:row.version+1}).where(eq(candidates.id,row.id)).returning();
        return item(confirmed!);
      });
    },
    async discard(owner,id,input) {
      return db.transaction(async tx => {
        await lockOwner(tx,owner);
        const row=await own(tx,owner,id,true);
        if(row.status==='DISCARDED') return item(row);
        pending(row,input.expectedVersion);
        const [discarded]=await tx.update(candidates).set({status:'DISCARDED',processedAt:new Date(),updatedAt:new Date(),version:row.version+1}).where(eq(candidates.id,row.id)).returning();
        return item(discarded!);
      });
    },
  };
}
