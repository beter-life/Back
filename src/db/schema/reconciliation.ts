import { sql } from 'drizzle-orm';
import { authenticatedRole } from 'drizzle-orm/supabase';
import { bigint, boolean, check, foreignKey, index, integer, pgPolicy, timestamp, unique, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';
import { appSchema } from './profiles.js';
import { financialAccounts, financialTransactions } from './finance.js';
import { importBatches } from './imports.js';
import type { Currency } from '../../modules/finance/domain.js';

const identity = () => ({id:uuid('id').primaryKey().defaultRandom(),authUserId:uuid('auth_user_id').notNull(),createdAt:timestamp('created_at',{withTimezone:true}).notNull().defaultNow()});
export const statementEvidence=appSchema.table('financial_statement_evidence',{
  ...identity(),accountId:uuid('account_id').notNull(),currency:varchar('currency',{length:3}).$type<Currency>().notNull(),
  type:varchar('type',{length:7}).$type<'INCOME'|'EXPENSE'>().notNull(),amountMinor:bigint('amount_minor',{mode:'bigint'}).notNull(),
  occurredAt:timestamp('occurred_at',{withTimezone:true}).notNull(),description:varchar('description',{length:500}).notNull(),
  fingerprint:varchar('fingerprint',{length:64}).notNull(),sourceKey:varchar('source_key',{length:70}).notNull(),
},t=>[
  unique('statement_evidence_id_owner_key').on(t.id,t.authUserId),unique('statement_evidence_source_key').on(t.authUserId,t.sourceKey),
  foreignKey({name:'statement_evidence_account_owner_fk',columns:[t.accountId,t.authUserId,t.currency],foreignColumns:[financialAccounts.id,financialAccounts.authUserId,financialAccounts.currency]}),
  index('statement_evidence_owner_account_date_idx').on(t.authUserId,t.accountId,t.occurredAt,t.id),
  check('statement_evidence_shape',sql`${t.amountMinor}>0 and ${t.type} in ('INCOME','EXPENSE') and length(trim(${t.description}))>0 and ${t.fingerprint} ~ '^[0-9a-f]{64}$' and ${t.sourceKey} ~ '^(file|id):[0-9a-f]{64}$'`),
  pgPolicy('statement_evidence_select_own',{for:'select',to:authenticatedRole,using:sql`(select auth.uid())=${t.authUserId}`}),
]).enableRLS();
export const evidenceOrigins=appSchema.table('financial_evidence_origins',{
  ...identity(),evidenceId:uuid('evidence_id').notNull(),batchId:uuid('batch_id').notNull(),rowNumber:integer('row_number').notNull(),
},t=>[
  unique('evidence_origin_batch_row_key').on(t.authUserId,t.batchId,t.rowNumber),
  foreignKey({name:'evidence_origin_evidence_owner_fk',columns:[t.evidenceId,t.authUserId],foreignColumns:[statementEvidence.id,statementEvidence.authUserId]}),
  foreignKey({name:'evidence_origin_batch_owner_fk',columns:[t.batchId,t.authUserId],foreignColumns:[importBatches.id,importBatches.authUserId]}),
  index('evidence_origin_evidence_owner_idx').on(t.evidenceId,t.authUserId),
  check('evidence_origin_row_check',sql`${t.rowNumber} between 1 and 1000`),
  pgPolicy('evidence_origin_select_own',{for:'select',to:authenticatedRole,using:sql`(select auth.uid())=${t.authUserId}`}),
]).enableRLS();
export const reconciliations=appSchema.table('financial_reconciliations',{
  ...identity(),evidenceId:uuid('evidence_id').notNull(),transactionId:uuid('transaction_id').notNull(),
  idempotencyKey:uuid('idempotency_key').notNull(),dateAcknowledged:boolean('date_acknowledged').notNull(),
  transactionFingerprint:varchar('transaction_fingerprint',{length:64}).notNull(),
  reversedAt:timestamp('reversed_at',{withTimezone:true}),reversalKey:uuid('reversal_key'),
},t=>[
  unique('reconciliation_command_key').on(t.authUserId,t.idempotencyKey),unique('reconciliation_reversal_key').on(t.authUserId,t.reversalKey),
  foreignKey({name:'reconciliation_evidence_owner_fk',columns:[t.evidenceId,t.authUserId],foreignColumns:[statementEvidence.id,statementEvidence.authUserId]}),
  foreignKey({name:'reconciliation_transaction_owner_fk',columns:[t.transactionId,t.authUserId],foreignColumns:[financialTransactions.id,financialTransactions.authUserId]}),
  uniqueIndex('reconciliation_active_evidence_key').on(t.authUserId,t.evidenceId).where(sql`${t.reversedAt} is null`),
  uniqueIndex('reconciliation_active_transaction_key').on(t.authUserId,t.transactionId).where(sql`${t.reversedAt} is null`),
  index('reconciliation_evidence_owner_idx').on(t.evidenceId,t.authUserId),index('reconciliation_transaction_owner_idx').on(t.transactionId,t.authUserId),
  index('reconciliation_owner_created_idx').on(t.authUserId,t.createdAt,t.id),
  check('reconciliation_reversal_shape',sql`(${t.reversedAt} is null and ${t.reversalKey} is null) or (${t.reversedAt} is not null and ${t.reversedAt}>=${t.createdAt} and ${t.reversalKey} is not null)`),
  check('reconciliation_fingerprint_shape',sql`${t.transactionFingerprint} ~ '^[0-9a-f]{64}$'`),
  pgPolicy('reconciliation_select_own',{for:'select',to:authenticatedRole,using:sql`(select auth.uid())=${t.authUserId}`}),
]).enableRLS();
