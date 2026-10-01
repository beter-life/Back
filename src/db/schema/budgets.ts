import { sql } from 'drizzle-orm';
import { authenticatedRole } from 'drizzle-orm/supabase';
import {
  bigint,
  boolean,
  check,
  foreignKey,
  index,
  pgPolicy,
  timestamp,
  unique,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import type { AnyPgColumn } from 'drizzle-orm/pg-core';
import { appSchema } from './profiles.js';
import { financialCategories } from './finance.js';
import { currencyDigits, type Currency } from '../../modules/finance/domain.js';
import type { BudgetRolloverPolicy } from '../../modules/finance/budget-contracts.js';

const metadata = () => ({
  id: uuid('id').primaryKey().defaultRandom(),
  authUserId: uuid('auth_user_id').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
const policies = (table: { authUserId: AnyPgColumn }, prefix: string) => [
  pgPolicy(`${prefix}_select_own`, {
    for: 'select',
    to: authenticatedRole,
    using: sql`(select auth.uid()) = ${table.authUserId}`,
  }),
  pgPolicy(`${prefix}_insert_own`, {
    for: 'insert',
    to: authenticatedRole,
    withCheck: sql`(select auth.uid()) = ${table.authUserId}`,
  }),
  pgPolicy(`${prefix}_update_own`, {
    for: 'update',
    to: authenticatedRole,
    using: sql`(select auth.uid()) = ${table.authUserId}`,
    withCheck: sql`(select auth.uid()) = ${table.authUserId}`,
  }),
];
const currencies = sql.raw(
  Object.keys(currencyDigits)
    .map((c) => `'${c}'`)
    .join(','),
);
export const financialBudgetPeriods = appSchema
  .table(
    'financial_budget_periods',
    {
      ...metadata(),
      month: varchar('period_month', { length: 7 }).notNull(),
      currency: varchar('currency', { length: 3 }).$type<Currency>().notNull(),
      timeZone: varchar('time_zone', { length: 100 }).notNull(),
    },
    (table) => [
      unique('financial_budget_period_owner_month_currency_key').on(
        table.authUserId,
        table.month,
        table.currency,
      ),
      unique('financial_budget_period_owner_currency_key').on(
        table.id,
        table.authUserId,
        table.currency,
      ),
      check(
        'financial_budget_period_month_check',
        sql`${table.month} ~ '^[1-9][0-9]{3}-(0[1-9]|1[0-2])$' and left(${table.month},4)::integer <= 9998`,
      ),
      check('financial_budget_period_currency_check', sql`${table.currency} in (${currencies})`),
      check(
        'financial_budget_period_timezone_check',
        sql`timezone(${table.timeZone}, timestamp '2000-01-01') is not null`,
      ),
      ...policies(table, 'financial_budget_periods'),
    ],
  )
  .enableRLS();
export const financialBudgetAllocations = appSchema
  .table(
    'financial_budget_allocations',
    {
      ...metadata(),
      budgetPeriodId: uuid('budget_period_id').notNull(),
      categoryId: uuid('category_id').notNull(),
      categoryKind: varchar('category_kind', { length: 7 }).notNull().default('EXPENSE'),
      currency: varchar('currency', { length: 3 }).$type<Currency>().notNull(),
      amountMinor: bigint('amount_minor', { mode: 'bigint' }).notNull(),
      rolloverPolicy: varchar('rollover_policy', { length: 13 })
        .$type<BudgetRolloverPolicy>()
        .notNull()
        .default('NONE'),
      isActive: boolean('is_active').notNull().default(true),
    },
    (table) => [
      unique('financial_budget_allocation_period_category_key').on(
        table.budgetPeriodId,
        table.categoryId,
      ),
      index('financial_budget_allocation_owner_period_idx').on(
        table.authUserId,
        table.budgetPeriodId,
      ),
      foreignKey({
        name: 'financial_budget_allocation_period_owner_fk',
        columns: [table.budgetPeriodId, table.authUserId, table.currency],
        foreignColumns: [
          financialBudgetPeriods.id,
          financialBudgetPeriods.authUserId,
          financialBudgetPeriods.currency,
        ],
      }),
      foreignKey({
        name: 'financial_budget_allocation_category_owner_fk',
        columns: [table.categoryId, table.authUserId, table.categoryKind],
        foreignColumns: [
          financialCategories.id,
          financialCategories.authUserId,
          financialCategories.kind,
        ],
      }),
      check('financial_budget_allocation_amount_check', sql`${table.amountMinor} >= 0`),
      check(
        'financial_budget_allocation_category_kind_check',
        sql`${table.categoryKind} = 'EXPENSE'`,
      ),
      check(
        'financial_budget_allocation_rollover_check',
        sql`${table.rolloverPolicy} in ('NONE','POSITIVE_ONLY')`,
      ),
      ...policies(table, 'financial_budget_allocations'),
    ],
  )
  .enableRLS();
