import { sql } from 'drizzle-orm';
import { authenticatedRole } from 'drizzle-orm/supabase';
import { bigint, check, date, foreignKey, index, integer, pgPolicy, timestamp, unique, uuid, varchar } from 'drizzle-orm/pg-core';
import { appSchema } from './profiles.js';
import { financialAccounts, financialCategories, financialTransactions } from './finance.js';
import type { Currency } from '../../modules/finance/domain.js';
const identity = () => ({ id: uuid('id').primaryKey().defaultRandom(), authUserId: uuid('auth_user_id').notNull(), createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow() });
const own = (owner: unknown) => sql`(select auth.uid()) = ${owner}`;
export const creditCards = appSchema.table('financial_credit_cards', {
  ...identity(), accountId: uuid('account_id').notNull(), currency: varchar('currency', { length: 3 }).$type<Currency>().notNull(), displayName: varchar('display_name', { length: 100 }).notNull(), issuerName: varchar('issuer_name', { length: 100 }), brand: varchar('brand', { length: 100 }), last4: varchar('last4', { length: 4 }), creditLimitMinor: bigint('credit_limit_minor', { mode: 'bigint' }), trackingStartDate: date('tracking_start_date').notNull(), status: varchar('status', { length: 8 }).$type<'ACTIVE' | 'ARCHIVED'>().notNull().default('ACTIVE'), updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(), archivedAt: timestamp('archived_at', { withTimezone: true }),
}, t => [
  unique('card_account_unique').on(t.accountId), unique('card_id_owner_unique').on(t.id, t.authUserId), unique('card_id_owner_currency_unique').on(t.id, t.authUserId, t.currency),
  foreignKey({ name: 'card_account_owner_currency_fk', columns: [t.accountId, t.authUserId, t.currency], foreignColumns: [financialAccounts.id, financialAccounts.authUserId, financialAccounts.currency] }),
  check('card_shape_check', sql`length(trim(${t.displayName}))>0 and (${t.last4} is null or ${t.last4} ~ '^[0-9]{4}$') and (${t.creditLimitMinor} is null or ${t.creditLimitMinor}>0) and ((${t.status}='ACTIVE' and ${t.archivedAt} is null) or (${t.status}='ARCHIVED' and ${t.archivedAt} is not null)) and ${t.trackingStartDate} between date '1000-01-01' and date '9993-12-31'`),
  index('card_owner_idx').on(t.authUserId),
  pgPolicy('card_select_own', { for: 'select', to: authenticatedRole, using: own(t.authUserId) }),
  pgPolicy('card_insert_own', { for: 'insert', to: authenticatedRole, withCheck: own(t.authUserId) }),
  pgPolicy('card_update_own', { for: 'update', to: authenticatedRole, using: own(t.authUserId), withCheck: own(t.authUserId) }),
]).enableRLS();
export const cardBillingRules = appSchema.table('financial_card_billing_rules', {
  ...identity(), cardId: uuid('card_id').notNull(), effectiveFrom: date('effective_from').notNull(), effectiveTo: date('effective_to'), closingDay: integer('closing_day').notNull(), dueDay: integer('due_day').notNull(),
}, t => [
  foreignKey({ name: 'card_rule_owner_fk', columns: [t.cardId, t.authUserId], foreignColumns: [creditCards.id, creditCards.authUserId] }), unique('card_rule_start_unique').on(t.cardId, t.effectiveFrom), index('card_rule_owner_date_idx').on(t.authUserId, t.cardId, t.effectiveFrom),
  check('card_rule_shape_check', sql`${t.closingDay} between 1 and 31 and ${t.dueDay} between 1 and 31 and (${t.effectiveTo} is null or ${t.effectiveTo}>${t.effectiveFrom})`),
  pgPolicy('card_rule_select_own', { for: 'select', to: authenticatedRole, using: own(t.authUserId) }),
  // Rule insertion and version closure are backend-controlled atomic commands.
]).enableRLS();
export const cardPurchases = appSchema.table('financial_card_purchases', {
  ...identity(), cardId: uuid('card_id').notNull(), currency: varchar('currency', { length: 3 }).$type<Currency>().notNull(), categoryId: uuid('category_id').notNull(), categoryKind: varchar('category_kind', { length: 7 }).notNull().default('EXPENSE'), description: varchar('description', { length: 400 }).notNull(), merchantName: varchar('merchant_name', { length: 100 }), purchaseDate: date('purchase_date').notNull(), totalAmountMinor: bigint('total_amount_minor', { mode: 'bigint' }).notNull(), installmentCount: integer('installment_count').notNull(), idempotencyKey: uuid('idempotency_key').notNull(), requestFingerprint: varchar('request_fingerprint', { length: 64 }).notNull(), status: varchar('status', { length: 9 }).$type<'ACTIVE' | 'CANCELLED'>().notNull().default('ACTIVE'), cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
}, t => [
  foreignKey({ name: 'card_purchase_owner_currency_fk', columns: [t.cardId, t.authUserId, t.currency], foreignColumns: [creditCards.id, creditCards.authUserId, creditCards.currency] }),
  foreignKey({ name: 'card_purchase_category_owner_kind_fk', columns: [t.categoryId, t.authUserId, t.categoryKind], foreignColumns: [financialCategories.id, financialCategories.authUserId, financialCategories.kind] }),
  unique('card_purchase_owner_key_unique').on(t.authUserId, t.idempotencyKey), unique('card_purchase_id_owner_card_unique').on(t.id, t.authUserId, t.cardId), index('card_purchase_owner_date_idx').on(t.authUserId, t.cardId, t.createdAt, t.id),
  check('card_purchase_shape_check', sql`${t.totalAmountMinor} >= ${t.installmentCount} and ${t.installmentCount} between 1 and 60 and ${t.categoryKind}='EXPENSE' and length(trim(${t.description}))>0 and ((${t.status}='ACTIVE' and ${t.cancelledAt} is null) or (${t.status}='CANCELLED' and ${t.cancelledAt} is not null))`),
  pgPolicy('card_purchase_select_own', { for: 'select', to: authenticatedRole, using: own(t.authUserId) }),
]).enableRLS();
export const cardInstallments = appSchema.table('financial_card_installments', {
  ...identity(), cardId: uuid('card_id').notNull(), purchaseId: uuid('purchase_id').notNull(), transactionId: uuid('transaction_id').notNull(), installmentNumber: integer('installment_number').notNull(), amountMinor: bigint('amount_minor', { mode: 'bigint' }).notNull(), scheduledDate: date('scheduled_date').notNull(),
}, t => [
  foreignKey({ name: 'card_installment_purchase_owner_card_fk', columns: [t.purchaseId, t.authUserId, t.cardId], foreignColumns: [cardPurchases.id, cardPurchases.authUserId, cardPurchases.cardId] }),
  foreignKey({ name: 'card_installment_transaction_owner_fk', columns: [t.transactionId, t.authUserId], foreignColumns: [financialTransactions.id, financialTransactions.authUserId] }),
  unique('card_installment_number_unique').on(t.purchaseId, t.installmentNumber), unique('card_installment_transaction_unique').on(t.transactionId), index('card_installment_owner_date_idx').on(t.authUserId, t.cardId, t.scheduledDate),
  check('card_installment_shape_check', sql`${t.amountMinor}>0 and ${t.installmentNumber} between 1 and 60`),
  pgPolicy('card_installment_select_own', { for: 'select', to: authenticatedRole, using: own(t.authUserId) }),
]).enableRLS();
