import { and, eq, inArray, sql } from 'drizzle-orm';
import type { Database } from '../../db/client.js';
import {
  financialAccounts as accounts,
  financialCategories as categories,
  financialTransactions as transactions,
  financialTransfers as transfers,
} from '../../db/schema/finance.js';
import { AppError } from '../../shared/errors/index.js';
import { creditCards, cardInstallments } from '../../db/schema/cards.js';
import type { Currency } from './domain.js';
import type { TransferPatch } from './contracts.js';
import type {
  Account,
  AccountInput,
  AccountPatch,
  Category,
  CategoryInput,
  CategoryPatch,
  Transaction,
  TransactionInput,
  TransactionPatch,
  TransactionQuery,
  TransactionPage,
  Transfer,
  TransferInput,
  Summary,
} from './contracts.js';

export interface FinanceRepository {
  listAccounts(owner: string): Promise<Account[]>;
  getAccount(owner: string, id: string): Promise<Account | null>;
  createAccount(owner: string, input: AccountInput): Promise<Account>;
  patchAccount(owner: string, id: string, input: AccountPatch): Promise<Account | null>;
  listCategories(owner: string): Promise<Category[]>;
  createCategory(owner: string, input: CategoryInput): Promise<Category>;
  patchCategory(owner: string, id: string, input: CategoryPatch): Promise<Category | null>;
  listTransactions(owner: string, query: TransactionQuery): Promise<TransactionPage>;
  getTransaction(owner: string, id: string): Promise<Transaction | null>;
  createTransaction(owner: string, input: TransactionInput): Promise<Transaction>;
  patchTransaction(owner: string, id: string, input: TransactionPatch): Promise<Transaction | null>;
  createTransfer(owner: string, input: TransferInput): Promise<Transfer>;
  patchTransfer(owner: string, id: string, input: TransferPatch): Promise<Transfer | null>;
  summary(owner: string, from: string, to: string): Promise<Summary>;
}
const dates = (row: { id: string; createdAt: Date; updatedAt: Date }) => ({
  id: row.id,
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
});
const category = (row: typeof categories.$inferSelect): Category => ({
  ...dates(row),
  name: row.name,
  kind: row.kind as Category['kind'],
  isActive: row.isActive,
});
const transfer = (row: typeof transfers.$inferSelect): Transfer => ({
  ...dates(row),
  sourceAccountId: row.sourceAccountId,
  destinationAccountId: row.destinationAccountId,
  amountMinor: String(row.amountMinor),
  currency: row.currency,
  description: row.description,
  occurredAt: row.occurredAt.toISOString(),
  isCancelled: row.isCancelled,
  idempotencyKey: row.idempotencyKey,
});
const transaction = (row: typeof transactions.$inferSelect): Transaction => ({
  ...dates(row),
  accountId: row.accountId,
  categoryId: row.categoryId,
  destinationAccountId: null,
  type: row.type as Transaction['type'],
  amountMinor: String(row.amountMinor),
  currency: row.currency,
  description: row.description,
  occurredAt: row.occurredAt.toISOString(),
  isCancelled: row.isCancelled,
});

// One transfer row represents BOTH balance effects. There is no independently writable half.
const movements = (owner: string) => sql`(
  select id, account_id, null::uuid as destination_account_id, category_id, type, amount_minor, currency, description, occurred_at, created_at, updated_at, is_cancelled
  from app.financial_transactions where auth_user_id=${owner}::uuid
  union all
  select id, source_account_id, destination_account_id, null::uuid, 'TRANSFER', amount_minor, currency, description, occurred_at, created_at, updated_at, is_cancelled
  from app.financial_transfers where auth_user_id=${owner}::uuid
)`;
const delta = (
  owner: string,
  accountId: string | ReturnType<typeof sql>,
  asOf: Date,
) => sql`coalesce((
  select sum(case when m.type='INCOME' then m.amount_minor when m.type='EXPENSE' then -m.amount_minor
    when m.account_id=${accountId}::uuid then -m.amount_minor else m.amount_minor end)
  from ${movements(owner)} m where not m.is_cancelled and m.occurred_at < ${asOf}
    and (m.account_id=${accountId}::uuid or m.destination_account_id=${accountId}::uuid)
),0)`;

export function createFinanceRepository({ db }: Database): FinanceRepository {
  async function listAccounts(owner: string, id?: string): Promise<Account[]> {
    const rows = await db
      .select({
        row: accounts,
        balance: sql<string>`(${accounts.initialBalanceMinor} + ${delta(owner, sql`${accounts.id}`, new Date())})::text`,
      })
      .from(accounts)
      .where(and(eq(accounts.authUserId, owner), id ? eq(accounts.id, id) : undefined))
      .orderBy(accounts.createdAt, accounts.id);
    return rows.map(({ row, balance }) => ({
      ...dates(row),
      name: row.name,
      type: row.type,
      currency: row.currency,
      initialBalanceMinor: String(row.initialBalanceMinor),
      isActive: row.isActive,
      balanceMinor: balance,
    }));
  }
  const ownAccount = async (owner: string, id: string) =>
    (await listAccounts(owner, id))[0] ?? null;
  async function lockedAccounts(
    tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
    owner: string,
    ids: string[],
    currency: string,
  ) {
    const rows = await tx
      .select()
      .from(accounts)
      .where(and(eq(accounts.authUserId, owner), inArray(accounts.id, ids)))
      .orderBy(accounts.id)
      .for('update');
    if (rows.length !== ids.length) throw new AppError('NOT_FOUND');
    if (rows.some((row) => !row.isActive)) throw new AppError('CONFLICT');
    if (rows.some((row) => row.currency !== currency)) throw new AppError('VALIDATION_ERROR');
  }
  return {
    listAccounts,
    getAccount: ownAccount,
    async createAccount(owner, input) {
      const [row] = await db
        .insert(accounts)
        .values({
          authUserId: owner,
          ...input,
          initialBalanceMinor: BigInt(input.initialBalanceMinor),
        })
        .returning();
      return (await ownAccount(owner, row!.id))!;
    },
    async patchAccount(owner, id, input) {
      const managedDebt = await db.execute(sql`select 1 from app.financial_debts where auth_user_id=${owner}::uuid and account_id=${id}::uuid`);
      if (managedDebt.rows.length && (input.type !== undefined || input.isActive !== undefined)) throw new AppError('DEBT_MANAGED_ACCOUNT');
      if (input.type && input.type !== 'credit') {
        const linked = await db.select({ id: creditCards.id }).from(creditCards).where(and(eq(creditCards.authUserId, owner), eq(creditCards.accountId, id)));
        if (linked.length) throw new AppError('CARD_MANAGED_ACCOUNT');
      }
      const [row] = await db
        .update(accounts)
        .set({ ...input, updatedAt: new Date() })
        .where(and(eq(accounts.authUserId, owner), eq(accounts.id, id)))
        .returning();
      return row ? ownAccount(owner, id) : null;
    },
    async listCategories(owner) {
      return (
        await db
          .select()
          .from(categories)
          .where(eq(categories.authUserId, owner))
          .orderBy(categories.name, categories.id)
      ).map(category);
    },
    async createCategory(owner, input) {
      const [row] = await db
        .insert(categories)
        .values({ authUserId: owner, ...input })
        .returning();
      return category(row!);
    },
    async patchCategory(owner, id, input) {
      const [row] = await db
        .update(categories)
        .set({ ...input, updatedAt: new Date() })
        .where(and(eq(categories.authUserId, owner), eq(categories.id, id)))
        .returning();
      return row ? category(row) : null;
    },
    async createTransaction(owner, input) {
      return db.transaction(async (tx) => {
        await lockedAccounts(tx, owner, [input.accountId], input.currency);
        const debt = await tx.execute(sql`select 1 from app.financial_debts where auth_user_id=${owner}::uuid and account_id=${input.accountId}::uuid`);
        if (debt.rows.length) throw new AppError('DEBT_MANAGED_ACCOUNT');
        const managed = await tx.execute(sql`select 1 from app.financial_credit_cards c left join app.profiles p on p.auth_user_id=c.auth_user_id where c.auth_user_id=${owner} and c.account_id=${input.accountId} and (${new Date(input.occurredAt)}::timestamptz at time zone coalesce(p.timezone,'UTC'))::date >= c.tracking_start_date limit 1`);
        if (managed.rows.length) throw new AppError('CARD_MANAGED_ACCOUNT');
        if (input.categoryId) {
          const [row] = await tx
            .select()
            .from(categories)
            .where(and(eq(categories.id, input.categoryId), eq(categories.authUserId, owner)))
            .for('share');
          if (!row) throw new AppError('NOT_FOUND');
          if (!row.isActive) throw new AppError('CONFLICT');
          if (row.kind !== input.type) throw new AppError('VALIDATION_ERROR');
        }
        const [row] = await tx
          .insert(transactions)
          .values({
            authUserId: owner,
            ...input,
            amountMinor: BigInt(input.amountMinor),
            occurredAt: new Date(input.occurredAt),
          })
          .returning();
        return transaction(row!);
      });
    },
    async patchTransaction(owner, id, input) {
      const debt = await db.execute(sql`select 1 from app.financial_debt_payments where auth_user_id=${owner}::uuid and (interest_transaction_id=${id}::uuid or fee_transaction_id=${id}::uuid)`);
      if (debt.rows.length) throw new AppError('DEBT_MANAGED_ACCOUNT');
      const linked = await db.select({ id: cardInstallments.id }).from(cardInstallments).where(and(eq(cardInstallments.authUserId, owner), eq(cardInstallments.transactionId, id)));
      if (linked.length) throw new AppError('CARD_MANAGED_ACCOUNT');
      const [row] = await db
        .update(transactions)
        .set({ ...input, updatedAt: new Date() })
        .where(and(eq(transactions.authUserId, owner), eq(transactions.id, id)))
        .returning();
      return row ? transaction(row) : null;
    },
    async getTransaction(owner, id) {
      const page = await db.execute(sql`select * from ${movements(owner)} m where id=${id}::uuid`);
      return page.rows[0] ? projection(page.rows[0]) : null;
    },
    async listTransactions(owner, query) {
      const limit = Number(query.limit ?? '25');
      const result = await db.execute(sql`select * from ${movements(owner)} m where true
        ${query.accountId ? sql`and (account_id=${query.accountId}::uuid or destination_account_id=${query.accountId}::uuid)` : sql``}
        ${query.categoryId ? sql`and category_id=${query.categoryId}::uuid` : sql``}
        ${query.type ? sql`and type=${query.type}` : sql``}
        ${query.from ? sql`and occurred_at >= ${new Date(query.from)}` : sql``}
        ${query.to ? sql`and occurred_at < ${new Date(query.to)}` : sql``}
        ${query.cursorAt && query.cursorId ? sql`and (occurred_at,id) < (${new Date(query.cursorAt)}, ${query.cursorId}::uuid)` : sql``}
        order by occurred_at desc,id desc limit ${limit + 1}`);
      const items = result.rows.slice(0, limit).map(projection);
      const last = items.at(-1);
      return {
        items,
        nextCursor:
          result.rows.length > limit && last ? { occurredAt: last.occurredAt, id: last.id } : null,
      };
    },
    async createTransfer(owner, input) {
      return db.transaction(async (tx) => {
        const replay = (previous: typeof transfers.$inferSelect) => {
          const result = transfer(previous);
          if (
            result.sourceAccountId !== input.sourceAccountId ||
            result.destinationAccountId !== input.destinationAccountId ||
            result.amountMinor !== input.amountMinor ||
            result.currency !== input.currency ||
            result.description !== input.description ||
            Date.parse(result.occurredAt) !== Date.parse(input.occurredAt)
          )
            throw new AppError('CONFLICT');
          return result;
        };
        const [existing] = await tx
          .select()
          .from(transfers)
          .where(
            and(
              eq(transfers.authUserId, owner),
              eq(transfers.idempotencyKey, input.idempotencyKey),
            ),
          );
        if (existing) return replay(existing);
        // Lock accounts in UUID order: simultaneous A→B and B→A cannot deadlock.
        await lockedAccounts(
          tx,
          owner,
          [input.sourceAccountId, input.destinationAccountId],
          input.currency,
        );
        const managedSource = await tx.execute(sql`select 1 from app.financial_credit_cards c left join app.profiles p on p.auth_user_id=c.auth_user_id where c.auth_user_id=${owner} and c.account_id=${input.sourceAccountId} and (${new Date(input.occurredAt)}::timestamptz at time zone coalesce(p.timezone,'UTC'))::date >= c.tracking_start_date limit 1`);
        const managedDebt = await tx.execute(sql`select 1 from app.financial_debts where auth_user_id=${owner}::uuid and account_id in (${input.sourceAccountId}::uuid,${input.destinationAccountId}::uuid)`);
        if (managedDebt.rows.length) throw new AppError('DEBT_MANAGED_ACCOUNT');
        if (managedSource.rows.length) throw new AppError('CARD_SOURCE_NOT_ALLOWED');
        const [row] = await tx
          .insert(transfers)
          .values({
            authUserId: owner,
            ...input,
            amountMinor: BigInt(input.amountMinor),
            occurredAt: new Date(input.occurredAt),
          })
          .onConflictDoNothing({ target: [transfers.authUserId, transfers.idempotencyKey] })
          .returning();
        if (row) return transfer(row);
        const [previous] = await tx
          .select()
          .from(transfers)
          .where(
            and(
              eq(transfers.authUserId, owner),
              eq(transfers.idempotencyKey, input.idempotencyKey),
            ),
          );
        if (!previous) throw new AppError('CONFLICT');
        return replay(previous);
      });
    },
    async patchTransfer(owner, id, input) {
      const debt = await db.execute(sql`select 1 from app.financial_debt_payments where auth_user_id=${owner}::uuid and transfer_id=${id}::uuid`);
      if (debt.rows.length) throw new AppError('DEBT_MANAGED_ACCOUNT');
      const [row] = await db
        .update(transfers)
        .set({ ...input, updatedAt: new Date() })
        .where(and(eq(transfers.authUserId, owner), eq(transfers.id, id)))
        .returning();
      return row ? transfer(row) : null;
    },
    async summary(owner, from, to) {
      // A single statement snapshot keeps balances and period totals consistent.
      const result = await db.execute(sql`with m as ${movements(owner)}, balances as (
        select a.currency, sum(a.initial_balance_minor + ${delta(owner, sql`a.id`, new Date(to))}) as total_balance
        from app.financial_accounts a where a.auth_user_id=${owner}::uuid group by a.currency
      ), period as (
        select currency, sum(case when type='INCOME' then amount_minor else 0 end) as income,
          sum(case when type='EXPENSE' then amount_minor else 0 end) as expense
        from m where not is_cancelled and occurred_at >= ${new Date(from)} and occurred_at < ${new Date(to)} group by currency
      ) select b.currency, b.total_balance::text, coalesce(p.income,0)::text as income, coalesce(p.expense,0)::text as expense,
        (coalesce(p.income,0)-coalesce(p.expense,0))::text as net from balances b left join period p using(currency) order by b.currency`);
      return {
        from,
        to,
        currencies: result.rows.map((row) => ({
          currency: String(row.currency) as Currency,
          totalBalanceMinor: String(row.total_balance),
          incomeMinor: String(row.income),
          expenseMinor: String(row.expense),
          netMinor: String(row.net),
        })),
      };
    },
  };
}
function projection(row: Record<string, unknown>): Transaction {
  return {
    id: String(row.id),
    accountId: String(row.account_id),
    destinationAccountId: row.destination_account_id ? String(row.destination_account_id) : null,
    categoryId: row.category_id ? String(row.category_id) : null,
    type: row.type as Transaction['type'],
    amountMinor: String(row.amount_minor),
    currency: String(row.currency) as Currency,
    description: String(row.description),
    isCancelled: Boolean(row.is_cancelled),
    occurredAt: new Date(row.occurred_at as string).toISOString(),
    createdAt: new Date(row.created_at as string).toISOString(),
    updatedAt: new Date(row.updated_at as string).toISOString(),
  };
}
