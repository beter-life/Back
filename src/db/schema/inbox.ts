import { sql } from 'drizzle-orm';
import { authenticatedRole } from 'drizzle-orm/supabase';
import { bigint, check, foreignKey, index, integer, pgPolicy, timestamp, unique, uuid, varchar } from 'drizzle-orm/pg-core';
import { appSchema } from './profiles.js';
import { financialAccounts, financialCategories, financialTransactions } from './finance.js';
import { currencyDigits, type Currency } from '../../modules/finance/domain.js';

const currencies = sql.raw(Object.keys(currencyDigits).map(c => `'${c}'`).join(','));
export const inboxCandidates = appSchema.table('financial_inbox_candidates', {
  id: uuid('id').primaryKey().defaultRandom(), authUserId: uuid('auth_user_id').notNull(),
  source: varchar('source', { length: 10 }).notNull().default('MANUAL'),
  status: varchar('status', { length: 10 }).notNull().default('PENDING'),
  version: integer('version').notNull().default(1),
  description: varchar('description', { length: 500 }).notNull(), type: varchar('type', { length: 7 }).notNull(),
  currency: varchar('currency', { length: 3 }).$type<Currency>().notNull(),
  amountMinor: bigint('amount_minor', { mode: 'bigint' }), occurredAt: timestamp('occurred_at', { withTimezone: true }),
  accountId: uuid('account_id'), categoryId: uuid('category_id'),
  idempotencyKey: uuid('idempotency_key').notNull(), creationFingerprint: varchar('creation_fingerprint', { length: 64 }).notNull(),
  transactionId: uuid('transaction_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  processedAt: timestamp('processed_at', { withTimezone: true }),
}, t => [
  unique('inbox_owner_creation_key').on(t.authUserId, t.idempotencyKey),
  unique('inbox_posted_transaction_key').on(t.transactionId),
  foreignKey({ name: 'inbox_account_owner_currency_fk', columns: [t.accountId,t.authUserId,t.currency], foreignColumns: [financialAccounts.id,financialAccounts.authUserId,financialAccounts.currency] }),
  foreignKey({ name: 'inbox_category_owner_kind_fk', columns: [t.categoryId,t.authUserId,t.type], foreignColumns: [financialCategories.id,financialCategories.authUserId,financialCategories.kind] }),
  foreignKey({ name: 'inbox_transaction_owner_fk', columns: [t.transactionId,t.authUserId], foreignColumns: [financialTransactions.id,financialTransactions.authUserId] }),
  index('inbox_owner_status_created_idx').on(t.authUserId,t.status,t.createdAt,t.id),
  index('inbox_owner_created_idx').on(t.authUserId,t.createdAt,t.id),
  index('inbox_pending_duplicate_idx').on(t.authUserId,t.accountId,t.currency,t.type,t.amountMinor,t.occurredAt).where(sql`${t.status}='PENDING'`),
  index('inbox_category_owner_idx').on(t.categoryId,t.authUserId,t.type),
  check('inbox_shape_check', sql`${t.source}='MANUAL' and ${t.type} in ('INCOME','EXPENSE') and ${t.currency} in (${currencies}) and ${t.version}>0 and length(trim(${t.description}))>0 and (${t.amountMinor} is null or ${t.amountMinor}>0) and ${t.creationFingerprint} ~ '^[0-9a-f]{64}$'`),
  check('inbox_state_check', sql`(${t.status}='PENDING' and ${t.transactionId} is null and ${t.processedAt} is null) or (${t.status}='DISCARDED' and ${t.transactionId} is null and ${t.processedAt} is not null) or (${t.status}='CONFIRMED' and ${t.transactionId} is not null and ${t.processedAt} is not null and ${t.accountId} is not null and ${t.amountMinor} is not null and ${t.occurredAt} is not null)`),
  pgPolicy('inbox_select_own', { for: 'select', to: authenticatedRole, using: sql`(select auth.uid())=${t.authUserId}` }),
]).enableRLS();
