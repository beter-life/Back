import { and, eq, inArray, lte, sql } from 'drizzle-orm';
import type { Database } from '../../db/client.js';
import {
  financialBudgetPeriods as periods,
  financialBudgetAllocations as allocations,
} from '../../db/schema/budgets.js';
import { financialCategories as categories } from '../../db/schema/finance.js';
import { AppError } from '../../shared/errors/index.js';
import type { Currency } from './domain.js';
import { previousMonth, type BudgetSnapshot } from './budget-domain.js';
import type {
  BudgetPeriod,
  BudgetAllocation,
  BudgetAllocationInput,
  BudgetCopyResult,
} from './budget-contracts.js';

export interface BudgetRepository {
  ensurePeriod(
    owner: string,
    month: string,
    currency: Currency,
    zone: string,
  ): Promise<BudgetPeriod>;
  putAllocation(
    owner: string,
    month: string,
    categoryId: string,
    input: BudgetAllocationInput,
  ): Promise<BudgetAllocation>;
  removeAllocation(
    owner: string,
    month: string,
    categoryId: string,
    currency: Currency,
  ): Promise<BudgetAllocation>;
  copyPrevious(
    owner: string,
    month: string,
    currency: Currency,
    zone: string,
  ): Promise<BudgetCopyResult>;
  snapshot(owner: string, month: string, currency: Currency, zone: string): Promise<BudgetSnapshot>;
}
type Transaction = Parameters<Parameters<Database['db']['transaction']>[0]>[0];
const metadata = (row: { id: string; createdAt: Date; updatedAt: Date }) => ({
  id: row.id,
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
});
const period = (row: typeof periods.$inferSelect): BudgetPeriod => ({
  ...metadata(row),
  month: row.month,
  currency: row.currency,
  timeZone: row.timeZone,
});
const allocation = (
  row: typeof allocations.$inferSelect,
  category: typeof categories.$inferSelect,
): BudgetAllocation => ({
  ...metadata(row),
  budgetPeriodId: row.budgetPeriodId,
  categoryId: row.categoryId,
  categoryName: category.name,
  categoryIsActive: category.isActive,
  currency: row.currency,
  amountMinor: String(row.amountMinor),
  rolloverPolicy: row.rolloverPolicy,
  isActive: row.isActive,
});
const ownsPeriod = (owner: string, month: string, currency: Currency) =>
  and(eq(periods.authUserId, owner), eq(periods.month, month), eq(periods.currency, currency));

// PostgreSQL's calendar conversion handles month boundaries and midnight DST transitions.
const calendarSql = (owner: string, month: string, currency: Currency, zone: string) => sql`
  with months as (
    select period_month as month, time_zone from app.financial_budget_periods
    where auth_user_id=${owner}::uuid and currency=${currency} and period_month<=${month}
    union all select ${month}::text, ${zone}::text where not exists (
      select 1 from app.financial_budget_periods where auth_user_id=${owner}::uuid and currency=${currency} and period_month=${month}
    )
  ) select month, (month||'-01')::timestamp at time zone time_zone as "from",
    ((month||'-01')::date + interval '1 month')::timestamp at time zone time_zone as "to" from months
`;
export function createBudgetRepository({ db }: Database): BudgetRepository {
  async function ensure(
    tx: Database['db'] | Transaction,
    owner: string,
    month: string,
    currency: Currency,
    zone: string,
  ) {
    await tx
      .insert(periods)
      .values({ authUserId: owner, month, currency, timeZone: zone })
      .onConflictDoNothing();
    const [row] = await tx
      .select()
      .from(periods)
      .where(ownsPeriod(owner, month, currency))
      .limit(1);
    if (!row) throw new AppError('NOT_FOUND');
    return row;
  }
  async function lockedPeriod(tx: Transaction, owner: string, month: string, currency: Currency) {
    const [row] = await tx
      .select()
      .from(periods)
      .where(ownsPeriod(owner, month, currency))
      .for('update');
    if (!row) throw new AppError('NOT_FOUND');
    return row;
  }
  return {
    async ensurePeriod(owner, month, currency, zone) {
      return period(await ensure(db, owner, month, currency, zone));
    },
    async putAllocation(owner, month, categoryId, input) {
      return db.transaction(async (tx) => {
        const p = await lockedPeriod(tx, owner, month, input.currency);
        const [c] = await tx
          .select()
          .from(categories)
          .where(and(eq(categories.id, categoryId), eq(categories.authUserId, owner)))
          .for('update');
        if (!c) throw new AppError('NOT_FOUND');
        if (c.kind !== 'EXPENSE') throw new AppError('VALIDATION_ERROR');
        const [existing] = await tx
          .select()
          .from(allocations)
          .where(
            and(
              eq(allocations.budgetPeriodId, p.id),
              eq(allocations.authUserId, owner),
              eq(allocations.categoryId, categoryId),
            ),
          );
        if (!c.isActive && !existing?.isActive) throw new AppError('CONFLICT');
        const [row] = await tx
          .insert(allocations)
          .values({
            authUserId: owner,
            budgetPeriodId: p.id,
            categoryId,
            currency: input.currency,
            amountMinor: BigInt(input.amountMinor),
            rolloverPolicy: input.rolloverPolicy,
          })
          .onConflictDoUpdate({
            target: [allocations.budgetPeriodId, allocations.categoryId],
            set: {
              amountMinor: BigInt(input.amountMinor),
              rolloverPolicy: input.rolloverPolicy,
              isActive: true,
              updatedAt: new Date(),
            },
          })
          .returning();
        if (!row) throw new Error('Budget allocation write failed');
        return allocation(row, c);
      });
    },
    async removeAllocation(owner, month, categoryId, currency) {
      return db.transaction(async (tx) => {
        const p = await lockedPeriod(tx, owner, month, currency);
        const [row] = await tx
          .update(allocations)
          .set({ isActive: false, updatedAt: new Date() })
          .where(
            and(
              eq(allocations.authUserId, owner),
              eq(allocations.budgetPeriodId, p.id),
              eq(allocations.categoryId, categoryId),
            ),
          )
          .returning();
        if (!row) throw new AppError('NOT_FOUND');
        const [c] = await tx
          .select()
          .from(categories)
          .where(and(eq(categories.id, categoryId), eq(categories.authUserId, owner)));
        if (!c) throw new AppError('NOT_FOUND');
        return allocation(row, c);
      });
    },
    async copyPrevious(owner, month, currency, zone) {
      return db.transaction(async (tx) => {
        const [source] = await tx
          .select()
          .from(periods)
          .where(ownsPeriod(owner, previousMonth(month), currency));
        if (!source) throw new AppError('NOT_FOUND');
        await ensure(tx, owner, month, currency, zone);
        const target = await lockedPeriod(tx, owner, month, currency);
        const sourceRows = await tx
          .select()
          .from(allocations)
          .where(
            and(
              eq(allocations.authUserId, owner),
              eq(allocations.budgetPeriodId, source.id),
              eq(allocations.isActive, true),
            ),
          )
          .orderBy(allocations.categoryId);
        const cats = sourceRows.length
          ? await tx
              .select()
              .from(categories)
              .where(
                and(
                  eq(categories.authUserId, owner),
                  inArray(
                    categories.id,
                    sourceRows.map((a) => a.categoryId),
                  ),
                ),
              )
              .orderBy(categories.id)
              .for('share')
          : [];
        const existing = new Set(
          (
            await tx
              .select({ id: allocations.categoryId })
              .from(allocations)
              .where(
                and(eq(allocations.authUserId, owner), eq(allocations.budgetPeriodId, target.id)),
              )
          ).map((r) => r.id),
        );
        let copiedCount = 0;
        let alreadyPresentCount = 0;
        let skippedInactiveCount = 0;
        for (const a of sourceRows) {
          const c = cats.find((c) => c.id === a.categoryId);
          if (!c?.isActive) {
            skippedInactiveCount++;
            continue;
          }
          if (existing.has(a.categoryId)) {
            alreadyPresentCount++;
            continue;
          }
          const inserted = await tx
            .insert(allocations)
            .values({
              authUserId: owner,
              budgetPeriodId: target.id,
              categoryId: a.categoryId,
              currency,
              amountMinor: a.amountMinor,
              rolloverPolicy: a.rolloverPolicy,
            })
            .onConflictDoNothing()
            .returning();
          if (inserted.length) copiedCount++;
          else alreadyPresentCount++;
        }
        return { period: period(target), copiedCount, alreadyPresentCount, skippedInactiveCount };
      });
    },
    async snapshot(owner, month, currency, zone) {
      return db.transaction(
        async (tx) => {
          const history = await tx
            .select()
            .from(periods)
            .where(
              and(
                eq(periods.authUserId, owner),
                eq(periods.currency, currency),
                lte(periods.month, month),
              ),
            )
            .orderBy(periods.month);
          const current = history.find((p) => p.month === month);
          const joined = await tx
            .select({ row: allocations, category: categories })
            .from(allocations)
            .innerJoin(
              periods,
              and(eq(periods.id, allocations.budgetPeriodId), eq(periods.authUserId, owner)),
            )
            .innerJoin(
              categories,
              and(eq(categories.id, allocations.categoryId), eq(categories.authUserId, owner)),
            )
            .where(
              and(
                eq(allocations.authUserId, owner),
                eq(allocations.currency, currency),
                lte(periods.month, month),
              ),
            )
            .orderBy(categories.name, categories.id);
          const calendar = calendarSql(owner, month, currency, current?.timeZone ?? zone);
          const calendars = await tx.execute<{ month: string; from: string; to: string }>(calendar);
          const spending = await tx.execute<{
            month: string;
            categoryId: string | null;
            spentMinor: string;
          }>(sql`
          with calendar as (${calendar}) select p.month, t.category_id as "categoryId", coalesce(sum(t.amount_minor),0)::text as "spentMinor"
          from calendar p left join app.financial_transactions t on t.auth_user_id=${owner}::uuid and t.currency=${currency}
            and t.type='EXPENSE' and not t.is_cancelled and t.occurred_at >= p."from" and t.occurred_at < p."to"
          group by p.month, t.category_id order by p.month, t.category_id
        `);
          const names = await tx
            .select({ id: categories.id, name: categories.name, isActive: categories.isActive })
            .from(categories)
            .where(eq(categories.authUserId, owner));
          // Drizzle raw SQL intentionally returns timestamptz as text; hydrate at this boundary.
          return {
            month,
            currency,
            timeZone: current?.timeZone ?? zone,
            period: current ? period(current) : null,
            canCopyPrevious: history.some((p) => p.month === previousMonth(month)),
            periods: history.map(period),
            allocations: joined.map(({ row, category }) => allocation(row, category)),
            calendars: calendars.rows.map((row) => ({
              month: row.month,
              from: new Date(row.from),
              to: new Date(row.to),
            })),
            spending: spending.rows,
            categoryNames: names,
          };
        },
        { isolationLevel: 'repeatable read', accessMode: 'read only' },
      );
    },
  };
}
