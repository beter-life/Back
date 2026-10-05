import { sql } from 'drizzle-orm';
import { authenticatedRole } from 'drizzle-orm/supabase';
import { bigint, check, date, foreignKey, index, integer, pgPolicy, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { appSchema } from './profiles.js';
import { financialAccounts, financialCategories } from './finance.js';
import { currencyDigits, type Currency } from '../../modules/finance/domain.js';
const currencies = sql.raw(Object.keys(currencyDigits).map(c => `'${c}'`).join(','));
export const financialRecurrences = appSchema.table('financial_recurrences', {
  id: uuid('id').primaryKey().defaultRandom(), authUserId: uuid('auth_user_id').notNull(),
  name: varchar('name', { length: 100 }).notNull(), description: varchar('description', { length: 1000 }),
  transactionType: varchar('transaction_type', { length: 7 }).$type<'INCOME' | 'EXPENSE'>().notNull(), recurrenceKind: varchar('recurrence_kind', { length: 12 }).$type<'STANDARD' | 'SUBSCRIPTION'>().notNull(),
  amountMinor: bigint('amount_minor', { mode: 'bigint' }).notNull(), currency: varchar('currency', { length: 3 }).$type<Currency>().notNull(), accountId: uuid('account_id'), categoryId: uuid('category_id'),
  frequency: varchar('frequency', { length: 7 }).$type<'WEEKLY' | 'MONTHLY' | 'YEARLY'>().notNull(), intervalCount: integer('interval_count').notNull(),
  startDate: date('start_date', { mode: 'string' }).notNull(), endDate: date('end_date', { mode: 'string' }),
  status: varchar('status', { length: 8 }).$type<'ACTIVE' | 'PAUSED' | 'ARCHIVED'>().notNull().default('ACTIVE'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(), updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(), archivedAt: timestamp('archived_at', { withTimezone: true }),
}, t => [
  foreignKey({ name: 'financial_recurrences_account_owner_fk', columns: [t.accountId, t.authUserId, t.currency], foreignColumns: [financialAccounts.id, financialAccounts.authUserId, financialAccounts.currency] }),
  foreignKey({ name: 'financial_recurrences_category_owner_fk', columns: [t.categoryId, t.authUserId, t.transactionType], foreignColumns: [financialCategories.id, financialCategories.authUserId, financialCategories.kind] }),
  check('financial_recurrences_name_check', sql`length(trim(${t.name})) > 0`), check('financial_recurrences_amount_check', sql`${t.amountMinor} > 0`), check('financial_recurrences_currency_check', sql`${t.currency} in (${currencies})`),
  check('financial_recurrences_type_check', sql`${t.transactionType} in ('INCOME','EXPENSE')`), check('financial_recurrences_kind_check', sql`${t.recurrenceKind} in ('STANDARD','SUBSCRIPTION')`), check('financial_recurrences_subscription_check', sql`${t.recurrenceKind} <> 'SUBSCRIPTION' or ${t.transactionType} = 'EXPENSE'`),
  check('financial_recurrences_frequency_check', sql`${t.frequency} in ('WEEKLY','MONTHLY','YEARLY')`),
  check('financial_recurrences_interval_check', sql`${t.intervalCount} between 1 and case ${t.frequency} when 'WEEKLY' then 52 when 'MONTHLY' then 24 when 'YEARLY' then 10 else 0 end`),
  check('financial_recurrences_dates_check', sql`${t.startDate} between date '1000-01-01' and date '9998-12-31' and (${t.endDate} is null or (${t.endDate} >= ${t.startDate} and ${t.endDate} <= date '9998-12-31'))`),
  check('financial_recurrences_status_check', sql`${t.status} in ('ACTIVE','PAUSED','ARCHIVED')`), check('financial_recurrences_archive_check', sql`(${t.status} = 'ARCHIVED') = (${t.archivedAt} is not null)`),
  index('financial_recurrences_owner_status_idx').on(t.authUserId, t.status), index('financial_recurrences_owner_kind_idx').on(t.authUserId, t.recurrenceKind), index('financial_recurrences_owner_currency_idx').on(t.authUserId, t.currency),
  pgPolicy('financial_recurrences_select_own', { for: 'select', to: authenticatedRole, using: sql`(select auth.uid()) = ${t.authUserId}` }),
  pgPolicy('financial_recurrences_insert_own', { for: 'insert', to: authenticatedRole, withCheck: sql`(select auth.uid()) = ${t.authUserId}` }),
  pgPolicy('financial_recurrences_update_own', { for: 'update', to: authenticatedRole, using: sql`(select auth.uid()) = ${t.authUserId}`, withCheck: sql`(select auth.uid()) = ${t.authUserId}` }),
]).enableRLS();
