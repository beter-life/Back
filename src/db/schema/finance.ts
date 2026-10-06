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
import { currencyDigits } from '../../modules/finance/domain.js';
import type { Currency } from '../../modules/finance/domain.js';
import type { Account } from '../../modules/finance/contracts.js';

const ownerColumns = () => ({
  id: uuid('id').primaryKey().defaultRandom(),
  authUserId: uuid('auth_user_id').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
// Policies apply to private tables as defense in depth; no Data API exposure/grants.
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
const currenciesSql = sql.raw(
  Object.keys(currencyDigits)
    .map((code) => `'${code}'`)
    .join(','),
);
export const financialAccounts = appSchema
  .table(
    'financial_accounts',
    {
      ...ownerColumns(),
      name: varchar('name', { length: 100 }).notNull(),
      type: varchar('type', { length: 20 }).$type<Account['type']>().notNull(),
      currency: varchar('currency', { length: 3 }).$type<Currency>().notNull(),
      initialBalanceMinor: bigint('initial_balance_minor', { mode: 'bigint' }).notNull(),
      isActive: boolean('is_active').notNull().default(true),
    },
    (table) => [
      unique('financial_accounts_owner_currency_type_key').on(table.id, table.authUserId, table.currency, table.type),
      unique('financial_accounts_owner_currency_key').on(
        table.id,
        table.authUserId,
        table.currency,
      ),
      index('financial_accounts_owner_idx').on(table.authUserId),
      check('financial_accounts_name_check', sql`length(trim(${table.name})) > 0`),
      check(
        'financial_accounts_type_check',
        sql`${table.type} in ('checking','savings','cash','credit','investment','other','debt')`,
      ),
      check('financial_accounts_currency_check', sql`${table.currency} in (${currenciesSql})`),
      ...policies(table, 'financial_accounts'),
    ],
  )
  .enableRLS();
export const financialCategories = appSchema
  .table(
    'financial_categories',
    {
      ...ownerColumns(),
      name: varchar('name', { length: 100 }).notNull(),
      kind: varchar('kind', { length: 7 }).notNull(),
      isActive: boolean('is_active').notNull().default(true),
    },
    (table) => [
      unique('financial_categories_owner_kind_key').on(table.id, table.authUserId, table.kind),
      index('financial_categories_owner_idx').on(table.authUserId),
      check('financial_categories_name_check', sql`length(trim(${table.name})) > 0`),
      check('financial_categories_kind_check', sql`${table.kind} in ('INCOME','EXPENSE')`),
      ...policies(table, 'financial_categories'),
    ],
  )
  .enableRLS();
export const financialTransactions = appSchema
  .table(
    'financial_transactions',
    {
      ...ownerColumns(),
      accountId: uuid('account_id').notNull(),
      categoryId: uuid('category_id'),
      type: varchar('type', { length: 7 }).notNull(),
      amountMinor: bigint('amount_minor', { mode: 'bigint' }).notNull(),
      currency: varchar('currency', { length: 3 }).$type<Currency>().notNull(),
      description: varchar('description', { length: 500 }).notNull(),
      occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull(),
      isCancelled: boolean('is_cancelled').notNull().default(false),
    },
    (table) => [
      foreignKey({
        name: 'financial_transactions_account_owner_fk',
        columns: [table.accountId, table.authUserId, table.currency],
        foreignColumns: [
          financialAccounts.id,
          financialAccounts.authUserId,
          financialAccounts.currency,
        ],
      }),
      foreignKey({
        name: 'financial_transactions_category_owner_fk',
        columns: [table.categoryId, table.authUserId, table.type],
        foreignColumns: [
          financialCategories.id,
          financialCategories.authUserId,
          financialCategories.kind,
        ],
      }),
      unique('financial_transactions_id_owner_unique').on(table.id, table.authUserId),
      check('financial_transactions_amount_check', sql`${table.amountMinor} > 0`),
      check('financial_transactions_type_check', sql`${table.type} in ('INCOME','EXPENSE')`),
      index('financial_transactions_owner_date_idx').on(
        table.authUserId,
        table.occurredAt,
        table.id,
      ),
      index('financial_transactions_account_date_idx').on(
        table.authUserId,
        table.accountId,
        table.occurredAt,
      ),
      index('financial_transactions_category_date_idx').on(
        table.authUserId,
        table.categoryId,
        table.occurredAt,
      ),
      ...policies(table, 'financial_transactions'),
    ],
  )
  .enableRLS();
export const financialTransfers = appSchema
  .table(
    'financial_transfers',
    {
      ...ownerColumns(),
      sourceAccountId: uuid('source_account_id').notNull(),
      destinationAccountId: uuid('destination_account_id').notNull(),
      amountMinor: bigint('amount_minor', { mode: 'bigint' }).notNull(),
      currency: varchar('currency', { length: 3 }).$type<Currency>().notNull(),
      description: varchar('description', { length: 500 }).notNull(),
      occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull(),
      isCancelled: boolean('is_cancelled').notNull().default(false),
      idempotencyKey: uuid('idempotency_key').notNull(),
    },
    (table) => [
      unique('financial_transfers_idempotency_key').on(table.authUserId, table.idempotencyKey),
      unique('financial_transfers_id_owner_key').on(table.id, table.authUserId),
      foreignKey({
        name: 'financial_transfers_source_owner_fk',
        columns: [table.sourceAccountId, table.authUserId, table.currency],
        foreignColumns: [
          financialAccounts.id,
          financialAccounts.authUserId,
          financialAccounts.currency,
        ],
      }),
      foreignKey({
        name: 'financial_transfers_destination_owner_fk',
        columns: [table.destinationAccountId, table.authUserId, table.currency],
        foreignColumns: [
          financialAccounts.id,
          financialAccounts.authUserId,
          financialAccounts.currency,
        ],
      }),
      check('financial_transfers_amount_check', sql`${table.amountMinor} > 0`),
      check(
        'financial_transfers_different_accounts_check',
        sql`${table.sourceAccountId} <> ${table.destinationAccountId}`,
      ),
      index('financial_transfers_owner_date_idx').on(table.authUserId, table.occurredAt, table.id),
      index('financial_transfers_source_date_idx').on(
        table.authUserId,
        table.sourceAccountId,
        table.occurredAt,
      ),
      index('financial_transfers_destination_date_idx').on(
        table.authUserId,
        table.destinationAccountId,
        table.occurredAt,
      ),
      ...policies(table, 'financial_transfers'),
    ],
  )
  .enableRLS();
