import { sql } from 'drizzle-orm';
import { authenticatedRole } from 'drizzle-orm/supabase';
import { bigint, check, date, foreignKey, index, pgPolicy, timestamp, unique, uuid, varchar } from 'drizzle-orm/pg-core';
import { appSchema } from './profiles.js';
import { currencyDigits, type Currency } from '../../modules/finance/domain.js';
const currencies = sql.raw(Object.keys(currencyDigits).map(c => `'${c}'`).join(','));
export const netWorthItems = appSchema.table('financial_net_worth_items', {
  id: uuid('id').primaryKey().defaultRandom(), authUserId: uuid('auth_user_id').notNull(),
  name: varchar('name', { length: 100 }).notNull(), description: varchar('description', { length: 1000 }),
  kind: varchar('kind', { length: 9 }).$type<'ASSET' | 'LIABILITY'>().notNull(), category: varchar('category', { length: 10 }).notNull(), currency: varchar('currency', { length: 3 }).$type<Currency>().notNull(),
  status: varchar('status', { length: 8 }).$type<'ACTIVE' | 'ARCHIVED'>().notNull().default('ACTIVE'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(), updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(), archivedAt: timestamp('archived_at', { withTimezone: true }),
}, t => [
  unique('net_worth_items_id_owner_unique').on(t.id, t.authUserId),
  check('net_worth_items_name_check', sql`length(trim(${t.name})) > 0`),
  check('net_worth_items_currency_check', sql`${t.currency} in (${currencies})`),
  check('net_worth_items_category_check', sql`(${t.kind} = 'ASSET' and ${t.category} in ('PROPERTY','VEHICLE','BUSINESS','VALUABLE','OTHER')) or (${t.kind} = 'LIABILITY' and ${t.category} in ('MORTGAGE','LOAN','FINANCING','OTHER'))`),
  check('net_worth_items_status_check', sql`${t.status} in ('ACTIVE','ARCHIVED')`),
  check('net_worth_items_archive_check', sql`(${t.status} = 'ARCHIVED') = (${t.archivedAt} is not null)`),
  index('net_worth_items_owner_created_idx').on(t.authUserId, t.createdAt, t.id),
  pgPolicy('net_worth_items_select_own', { for: 'select', to: authenticatedRole, using: sql`(select auth.uid()) = ${t.authUserId}` }),
  pgPolicy('net_worth_items_insert_own', { for: 'insert', to: authenticatedRole, withCheck: sql`(select auth.uid()) = ${t.authUserId}` }),
  pgPolicy('net_worth_items_update_own', { for: 'update', to: authenticatedRole, using: sql`(select auth.uid()) = ${t.authUserId}`, withCheck: sql`(select auth.uid()) = ${t.authUserId}` }),
]).enableRLS();
export const netWorthValuations = appSchema.table('financial_net_worth_valuations', {
  id: uuid('id').primaryKey().defaultRandom(), authUserId: uuid('auth_user_id').notNull(), itemId: uuid('item_id').notNull(),
  valueMinor: bigint('value_minor', { mode: 'bigint' }).notNull(), valuationDate: date('valuation_date', { mode: 'string' }).notNull(), note: varchar('note', { length: 1000 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, t => [
  foreignKey({ name: 'net_worth_valuations_item_owner_fk', columns: [t.itemId,t.authUserId], foreignColumns: [netWorthItems.id,netWorthItems.authUserId] }),
  check('net_worth_valuations_value_check', sql`${t.valueMinor} >= 0`),
  check('net_worth_valuations_date_check', sql`${t.valuationDate} between date '1000-01-01' and date '9998-12-31'`),
  index('net_worth_valuations_owner_item_date_idx').on(t.authUserId,t.itemId,t.valuationDate,t.createdAt,t.id),
  pgPolicy('net_worth_valuations_select_own', { for: 'select', to: authenticatedRole, using: sql`(select auth.uid()) = ${t.authUserId}` }),
  pgPolicy('net_worth_valuations_insert_own', { for: 'insert', to: authenticatedRole, withCheck: sql`(select auth.uid()) = ${t.authUserId} and exists (select 1 from app.financial_net_worth_items i where i.id = ${t.itemId} and i.auth_user_id = ${t.authUserId} and i.status = 'ACTIVE')` }),
]).enableRLS();
