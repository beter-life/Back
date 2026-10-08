import { sql } from 'drizzle-orm';
import { authenticatedRole } from 'drizzle-orm/supabase';
import { bigint, boolean, check, foreignKey, index, pgPolicy, primaryKey, timestamp, unique, uuid, varchar } from 'drizzle-orm/pg-core';
import { appSchema } from './profiles.js';
import { financialAccounts } from './finance.js';
import { currencyDigits, type Currency } from '../../modules/finance/domain.js';
const currencies = sql.raw(Object.keys(currencyDigits).map(c => `'${c}'`).join(','));
export const safeSpendProfiles = appSchema.table('financial_safe_spend_profiles', {
  id: uuid('id').primaryKey().defaultRandom(), authUserId: uuid('auth_user_id').notNull(),
  currency: varchar('currency', { length: 3 }).$type<Currency>().notNull(), safetyBufferMinor: bigint('safety_buffer_minor', { mode: 'bigint' }).notNull().default(sql`0`),
  respectBudget: boolean('respect_budget').notNull().default(true), reserveRecurrences: boolean('reserve_recurrences').notNull().default(true), reserveGoalPlans: boolean('reserve_goal_plans').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(), updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, t => [
  unique('safe_spend_owner_currency_key').on(t.authUserId, t.currency), unique('safe_spend_id_owner_currency_key').on(t.id, t.authUserId, t.currency),
  check('safe_spend_profile_shape_check', sql`${t.safetyBufferMinor}>=0 and ${t.currency} in (${currencies})`),
  pgPolicy('safe_spend_profile_select_own', { for: 'select', to: authenticatedRole, using: sql`(select auth.uid())=${t.authUserId}` }),
]).enableRLS();
export const safeSpendAccounts = appSchema.table('financial_safe_spend_accounts', {
  profileId: uuid('profile_id').notNull(), authUserId: uuid('auth_user_id').notNull(), accountId: uuid('account_id').notNull(),
  currency: varchar('currency', { length: 3 }).$type<Currency>().notNull(), accountType: varchar('account_type', { length: 20 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, t => [
  primaryKey({ columns: [t.profileId, t.accountId] }), index('safe_spend_account_owner_idx').on(t.authUserId, t.accountId),
  foreignKey({ name: 'safe_spend_profile_owner_currency_fk', columns: [t.profileId,t.authUserId,t.currency], foreignColumns: [safeSpendProfiles.id,safeSpendProfiles.authUserId,safeSpendProfiles.currency] }),
  foreignKey({ name: 'safe_spend_account_owner_currency_type_fk', columns: [t.accountId,t.authUserId,t.currency,t.accountType], foreignColumns: [financialAccounts.id,financialAccounts.authUserId,financialAccounts.currency,financialAccounts.type] }),
  check('safe_spend_account_type_check', sql`${t.accountType} in ('checking','cash','savings','other')`),
  pgPolicy('safe_spend_account_select_own', { for: 'select', to: authenticatedRole, using: sql`(select auth.uid())=${t.authUserId}` }),
]).enableRLS();
