import { and, eq, sql } from 'drizzle-orm';
import type { Database } from '../../db/client.js';
import { financialRecurrences as recurrences } from '../../db/schema/recurrences.js';
import { financialAccounts as accounts, financialCategories as categories } from '../../db/schema/finance.js';
import { AppError } from '../../shared/errors/index.js';
import { maxProjectionRules, validateRecurrence, type RecurrenceRecord } from './recurrence-domain.js';
import type { RecurrenceInput, RecurrencePatch, RecurrenceQuery, RecurrenceFilters, Recurrence } from './recurrence-contracts.js';
export interface RecurrenceRepository {
  list(owner: string, query: RecurrenceQuery): Promise<{ items: RecurrenceRecord[]; nextCursor: { createdAt: string; id: string } | null }>;
  get(owner: string, id: string): Promise<RecurrenceRecord | null>;
  eligible(owner: string, filters: RecurrenceFilters, from?: string, to?: string): Promise<RecurrenceRecord[]>;
  create(owner: string, input: RecurrenceInput): Promise<RecurrenceRecord>;
  patch(owner: string, id: string, input: RecurrencePatch): Promise<RecurrenceRecord>;
  status(owner: string, id: string, status: Recurrence['status']): Promise<RecurrenceRecord>;
}
export function createRecurrenceRepository({ db }: Database): RecurrenceRepository {
  type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
  async function filterReferences(owner: string, filters: RecurrenceFilters) {
    if (filters.accountId && !(await db.select({ id: accounts.id }).from(accounts).where(and(eq(accounts.id, filters.accountId), eq(accounts.authUserId, owner))))[0]) throw new AppError('NOT_FOUND');
    if (filters.categoryId && !(await db.select({ id: categories.id }).from(categories).where(and(eq(categories.id, filters.categoryId), eq(categories.authUserId, owner))))[0]) throw new AppError('NOT_FOUND');
  }
  async function rows(owner: string, filters: RecurrenceQuery, limit: number, id?: string, from?: string, to?: string) {
    const result = await db.select({ row: recurrences, account: { id: accounts.id, name: accounts.name, isActive: accounts.isActive }, category: { id: categories.id, name: categories.name, kind: categories.kind, isActive: categories.isActive } }).from(recurrences)
      .leftJoin(accounts, and(eq(accounts.id, recurrences.accountId), eq(accounts.authUserId, owner)))
      .leftJoin(categories, and(eq(categories.id, recurrences.categoryId), eq(categories.authUserId, owner)))
      .where(and(eq(recurrences.authUserId, owner), id ? eq(recurrences.id, id) : undefined,
        filters.status ? eq(recurrences.status, filters.status) : undefined, filters.currency ? eq(recurrences.currency, filters.currency) : undefined,
        filters.transactionType ? eq(recurrences.transactionType, filters.transactionType) : undefined, filters.recurrenceKind ? eq(recurrences.recurrenceKind, filters.recurrenceKind) : undefined,
        filters.accountId ? eq(recurrences.accountId, filters.accountId) : undefined, filters.categoryId ? eq(recurrences.categoryId, filters.categoryId) : undefined,
        from ? sql`(${recurrences.endDate} is null or ${recurrences.endDate} >= ${from}::date)` : undefined, to ? sql`${recurrences.startDate} < ${to}::date` : undefined,
        filters.cursorAt && filters.cursorId ? sql`(${recurrences.createdAt},${recurrences.id}) < (${new Date(filters.cursorAt)},${filters.cursorId}::uuid)` : undefined))
      .orderBy(sql`${recurrences.createdAt} desc`, sql`${recurrences.id} desc`).limit(limit);
    return result.map(({ row, account, category }): RecurrenceRecord => ({
      id: row.id, name: row.name, description: row.description, transactionType: row.transactionType, recurrenceKind: row.recurrenceKind, amountMinor: String(row.amountMinor), currency: row.currency,
      accountId: row.accountId, categoryId: row.categoryId, frequency: row.frequency, intervalCount: row.intervalCount, startDate: row.startDate, endDate: row.endDate, status: row.status,
      createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString(), archivedAt: row.archivedAt?.toISOString() ?? null,
      account, category: category ? { ...category, kind: category.kind as Recurrence['transactionType'] } : null,
    }));
  }
  const get = async (owner: string, id: string) => (await rows(owner, {}, 1, id))[0] ?? null;
  async function associations(tx: Tx, owner: string, input: RecurrenceInput, old?: typeof recurrences.$inferSelect) {
    if (input.accountId) {
      const [account] = await tx.select().from(accounts).where(and(eq(accounts.id, input.accountId), eq(accounts.authUserId, owner))).for('share');
      if (!account) throw new AppError('NOT_FOUND');
      if (account.currency !== input.currency) throw new AppError('VALIDATION_ERROR');
      if (!account.isActive && old?.accountId !== account.id) throw new AppError('CONFLICT');
    }
    if (input.categoryId) {
      const [category] = await tx.select().from(categories).where(and(eq(categories.id, input.categoryId), eq(categories.authUserId, owner))).for('share');
      if (!category) throw new AppError('NOT_FOUND');
      if (category.kind !== input.transactionType) throw new AppError('VALIDATION_ERROR');
      if (!category.isActive && old?.categoryId !== category.id) throw new AppError('CONFLICT');
    }
  }
  return {
    get,
    async list(owner, query) {
      await filterReferences(owner, query);
      const limit = Number(query.limit ?? '50'), result = await rows(owner, query, limit + 1);
      const items = result.slice(0, limit), last = items.at(-1);
      return { items, nextCursor: result.length > limit && last ? { createdAt: last.createdAt, id: last.id } : null };
    },
    async eligible(owner, filters, from, to) { await filterReferences(owner, filters); return rows(owner, { ...filters, status: 'ACTIVE' }, maxProjectionRules + 1, undefined, from, to); },
    async create(owner, input) {
      const id = await db.transaction(async tx => {
        const values = validateRecurrence(input); await associations(tx, owner, values);
        const [row] = await tx.insert(recurrences).values({ authUserId: owner, ...values, amountMinor: BigInt(values.amountMinor) }).returning({ id: recurrences.id });
        return row!.id;
      });
      return (await get(owner, id))!;
    },
    async patch(owner, id, input) {
      await db.transaction(async tx => {
        const [row] = await tx.select().from(recurrences).where(and(eq(recurrences.id, id), eq(recurrences.authUserId, owner))).for('update');
        if (!row) throw new AppError('NOT_FOUND');
        if (row.status === 'ARCHIVED') throw new AppError('CONFLICT');
        const values = validateRecurrence({ name: row.name, description: row.description, transactionType: row.transactionType, recurrenceKind: row.recurrenceKind, currency: row.currency, amountMinor: String(row.amountMinor), accountId: row.accountId, categoryId: row.categoryId, frequency: row.frequency, intervalCount: row.intervalCount, startDate: row.startDate, endDate: row.endDate, ...input });
        await associations(tx, owner, values, row);
        await tx.update(recurrences).set({ ...values, amountMinor: BigInt(values.amountMinor), updatedAt: new Date() }).where(and(eq(recurrences.id, id), eq(recurrences.authUserId, owner)));
      });
      return (await get(owner, id))!;
    },
    async status(owner, id, status) {
      await db.transaction(async tx => {
        const [row] = await tx.select().from(recurrences).where(and(eq(recurrences.id, id), eq(recurrences.authUserId, owner))).for('update');
        if (!row) throw new AppError('NOT_FOUND');
        if (row.status === 'ARCHIVED' && status !== 'ARCHIVED') throw new AppError('CONFLICT');
        if (row.status !== status) await tx.update(recurrences).set({ status, archivedAt: status === 'ARCHIVED' ? new Date() : null, updatedAt: new Date() }).where(and(eq(recurrences.id, id), eq(recurrences.authUserId, owner)));
      });
      return (await get(owner, id))!;
    },
  };
}
