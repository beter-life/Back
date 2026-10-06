import { sql } from 'drizzle-orm';
import { authenticatedRole } from 'drizzle-orm/supabase';
import { bigint, check, date, foreignKey, index, integer, numeric, pgPolicy, timestamp, unique, uuid, varchar } from 'drizzle-orm/pg-core';
import { appSchema } from './profiles.js';
import { financialAccounts as accounts, financialTransactions as transactions, financialTransfers as transfers } from './finance.js';
import type * as C from '../../modules/finance/debt-contracts.js';
const identity = () => ({ id: uuid('id').primaryKey().defaultRandom(), authUserId: uuid('auth_user_id').notNull(), createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow() });
// All writes are authenticated backend commands: direct writes could bypass the
// ledger, lifecycle or version closure. No Data API grants or DELETE policy.
const policy = (owner: unknown, prefix: string) => pgPolicy(prefix + '_select_own', { for: 'select', to: authenticatedRole, using: sql`(select auth.uid())=${owner}` });
export const financialDebts = appSchema.table('financial_debts', {
  ...identity(), accountId: uuid('account_id').notNull(), accountType: varchar('account_type', { length: 20 }).notNull().default('debt'), currency: varchar('currency', { length: 3 }).$type<C.Debt['currency']>().notNull(), name: varchar('name', { length: 100 }).notNull(), lender: varchar('lender', { length: 100 }), debtType: varchar('debt_type', { length: 25 }).$type<C.Debt['debtType']>().notNull(), trackingStartDate: date('tracking_start_date').notNull(), status: varchar('status', { length: 8 }).$type<C.Debt['status']>().notNull().default('ACTIVE'), updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(), paidOffAt: timestamp('paid_off_at', { withTimezone: true }), archivedAt: timestamp('archived_at', { withTimezone: true }),
}, t => [
  unique('debt_account_unique').on(t.accountId), unique('debt_id_owner_key').on(t.id, t.authUserId), unique('debt_id_owner_currency_key').on(t.id, t.authUserId, t.currency),
  foreignKey({ name: 'debt_account_owner_currency_type_fk', columns: [t.accountId, t.authUserId, t.currency, t.accountType], foreignColumns: [accounts.id, accounts.authUserId, accounts.currency, accounts.type] }),
  check('debt_shape_check', sql`${t.accountType}='debt' and length(trim(${t.name}))>0 and ${t.debtType} in ('PERSONAL_LOAN','MORTGAGE','VEHICLE_FINANCING','CONSUMER_FINANCING','STUDENT','MEDICAL','TAX','OTHER') and ${t.trackingStartDate} between date '1000-01-01' and date '9998-12-31' and ((${t.status}='ACTIVE' and ${t.paidOffAt} is null and ${t.archivedAt} is null) or (${t.status}='PAID_OFF' and ${t.paidOffAt} is not null and ${t.archivedAt} is null) or (${t.status}='ARCHIVED' and ${t.paidOffAt} is not null and ${t.archivedAt} is not null))`),
  index('debt_owner_idx').on(t.authUserId), policy(t.authUserId, 'debt'),
]).enableRLS();
export const financialDebtTerms = appSchema.table('financial_debt_terms', {
  ...identity(), debtId: uuid('debt_id').notNull(), effectiveFrom: date('effective_from').notNull(), effectiveTo: date('effective_to'), rate: numeric('rate', { precision: 11, scale: 10 }).notNull(), ratePeriod: varchar('rate_period', { length: 20 }).$type<C.Term['ratePeriod']>().notNull(), minimumPaymentMinor: bigint('minimum_payment_minor', { mode: 'bigint' }).notNull(), dueDay: integer('due_day').notNull(),
}, t => [
  foreignKey({ name: 'debt_term_owner_fk', columns: [t.debtId, t.authUserId], foreignColumns: [financialDebts.id, financialDebts.authUserId] }), unique('debt_term_start_key').on(t.debtId, t.effectiveFrom), index('debt_term_owner_date_idx').on(t.authUserId, t.debtId, t.effectiveFrom),
  check('debt_term_shape_check', sql`${t.rate} between 0 and 1 and ${t.ratePeriod} in ('EFFECTIVE_ANNUAL','EFFECTIVE_MONTHLY') and ${t.minimumPaymentMinor}>0 and ${t.dueDay} between 1 and 31 and (${t.effectiveTo} is null or ${t.effectiveTo}>${t.effectiveFrom})`), policy(t.authUserId, 'debt_term'),
]).enableRLS();
export const financialDebtPayments = appSchema.table('financial_debt_payments', {
  ...identity(), debtId: uuid('debt_id').notNull(), sourceAccountId: uuid('source_account_id').notNull(), currency: varchar('currency', { length: 3 }).$type<C.Debt['currency']>().notNull(), principalAmountMinor: bigint('principal_amount_minor', { mode: 'bigint' }).notNull(), interestAmountMinor: bigint('interest_amount_minor', { mode: 'bigint' }).notNull(), feeAmountMinor: bigint('fee_amount_minor', { mode: 'bigint' }).notNull(), remainingPrincipalMinor: bigint('remaining_principal_minor', { mode: 'bigint' }).notNull(), transferId: uuid('transfer_id'), interestTransactionId: uuid('interest_transaction_id'), feeTransactionId: uuid('fee_transaction_id'), paidAt: timestamp('paid_at', { withTimezone: true }).notNull(), idempotencyKey: uuid('idempotency_key').notNull(), requestFingerprint: varchar('request_fingerprint', { length: 64 }).notNull(), status: varchar('status', { length: 9 }).$type<C.Payment['status']>().notNull().default('ACTIVE'), cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
}, t => [
  foreignKey({ name: 'debt_payment_owner_currency_fk', columns: [t.debtId, t.authUserId, t.currency], foreignColumns: [financialDebts.id, financialDebts.authUserId, financialDebts.currency] }),
  foreignKey({ name: 'debt_payment_source_owner_currency_fk', columns: [t.sourceAccountId, t.authUserId, t.currency], foreignColumns: [accounts.id, accounts.authUserId, accounts.currency] }),
  foreignKey({ name: 'debt_payment_transfer_owner_fk', columns: [t.transferId, t.authUserId], foreignColumns: [transfers.id, transfers.authUserId] }),
  foreignKey({ name: 'debt_payment_interest_owner_fk', columns: [t.interestTransactionId, t.authUserId], foreignColumns: [transactions.id, transactions.authUserId] }),
  foreignKey({ name: 'debt_payment_fee_owner_fk', columns: [t.feeTransactionId, t.authUserId], foreignColumns: [transactions.id, transactions.authUserId] }),
  unique('debt_payment_owner_key').on(t.authUserId, t.idempotencyKey), unique('debt_payment_transfer_unique').on(t.transferId), unique('debt_payment_interest_unique').on(t.interestTransactionId), unique('debt_payment_fee_unique').on(t.feeTransactionId), index('debt_payment_owner_date_idx').on(t.authUserId, t.debtId, t.createdAt, t.id),
  check('debt_payment_shape_check', sql`${t.principalAmountMinor}>=0 and ${t.interestAmountMinor}>=0 and ${t.feeAmountMinor}>=0 and ${t.principalAmountMinor}::numeric+${t.interestAmountMinor}+${t.feeAmountMinor}>0 and ${t.remainingPrincipalMinor}>=0 and (${t.principalAmountMinor}>0)=(${t.transferId} is not null) and (${t.interestAmountMinor}>0)=(${t.interestTransactionId} is not null) and (${t.feeAmountMinor}>0)=(${t.feeTransactionId} is not null) and ((${t.status}='ACTIVE' and ${t.cancelledAt} is null) or (${t.status}='CANCELLED' and ${t.cancelledAt} is not null))`), policy(t.authUserId, 'debt_payment'),
]).enableRLS();
