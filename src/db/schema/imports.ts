import { sql } from 'drizzle-orm';
import { authenticatedRole } from 'drizzle-orm/supabase';
import { check,foreignKey,index,integer,jsonb,pgPolicy,timestamp,unique,uuid,varchar,type AnyPgColumn } from 'drizzle-orm/pg-core';
import { appSchema } from './profiles.js';
import { financialAccounts } from './finance.js';
import { inboxCandidates } from './inbox.js';
import type { Currency } from '../../modules/finance/domain.js';
import type { ImportFormat,ImportMapping,ImportIssue,ImportUpload } from '../../modules/finance/import-contracts.js';
import type { ParsedImport } from '../../modules/finance/import-parser.js';
export const importBatches=appSchema.table('financial_import_batches',{
  id:uuid('id').primaryKey().defaultRandom(),authUserId:uuid('auth_user_id').notNull(),
  idempotencyKey:uuid('idempotency_key').notNull(),fileHash:varchar('file_hash',{length:64}).notNull(),
  fileName:varchar('file_name',{length:120}).notNull(),format:varchar('format',{length:3}).$type<ImportFormat>().notNull(),
  fileSize:integer('file_size').notNull(),version:integer('version').notNull().default(1),rowCount:integer('row_count').notNull(),
  parserOptions:jsonb('parser_options').$type<Pick<ImportUpload,'encoding'|'delimiter'>>().notNull(),
  parsed:jsonb('parsed').$type<ParsedImport|null>(),parsedBytes:integer('parsed_bytes').notNull().default(0),
  issues:jsonb('issues').$type<ImportIssue[]>().notNull().default(sql`'[]'::jsonb`),
  accountHint:varchar('account_hint',{length:8}),mapping:jsonb('mapping').$type<ImportMapping|null>(),
  accountId:uuid('account_id'),currency:varchar('currency',{length:3}).$type<Currency>(),timeZone:varchar('time_zone',{length:100}).notNull().default('UTC'),
  createdAt:timestamp('created_at',{withTimezone:true}).notNull().defaultNow(),updatedAt:timestamp('updated_at',{withTimezone:true}).notNull().defaultNow(),expiresAt:timestamp('expires_at',{withTimezone:true}).notNull(),
},t=>[
  unique('import_batch_id_owner_key').on(t.id,t.authUserId),unique('import_batch_owner_key').on(t.authUserId,t.idempotencyKey),unique('import_batch_owner_hash_key').on(t.authUserId,t.fileHash),
  foreignKey({name:'import_batch_account_owner_fk',columns:[t.accountId,t.authUserId,t.currency],foreignColumns:[financialAccounts.id,financialAccounts.authUserId,financialAccounts.currency]}),
  index('import_batch_owner_created_idx').on(t.authUserId,t.createdAt,t.id),index('import_batch_account_idx').on(t.accountId,t.authUserId,t.currency),
  check('import_batch_shape_check',sql`${t.fileHash} ~ '^[0-9a-f]{64}$' and ${t.format} in ('CSV','OFX','PDF') and ${t.fileSize} between 1 and 2097152 and ${t.rowCount} between 0 and 1000 and ${t.version}>0 and ${t.parsedBytes} between 0 and 4194304 and ((${t.mapping} is null and ${t.accountId} is null and ${t.currency} is null) or (${t.mapping} is not null and ${t.accountId} is not null and ${t.currency} is not null and ${t.mapping}->>'accountId'=${t.accountId}::text))`),
  pgPolicy('import_batch_select_own',{for:'select',to:authenticatedRole,using:sql`(select auth.uid())=${t.authUserId}`}),
]).enableRLS();
export const importRows=appSchema.table('financial_import_rows',{
  id:uuid('id').primaryKey().defaultRandom(),authUserId:uuid('auth_user_id').notNull(),batchId:uuid('batch_id').notNull(),rowNumber:integer('row_number').notNull(),
  candidateId:uuid('candidate_id').notNull(),fingerprint:varchar('fingerprint',{length:64}).notNull(),externalId:varchar('external_id',{length:160}),
  sourceIdentity:varchar('source_identity',{length:64}),matchedReceiptId:uuid('matched_receipt_id'),createdAt:timestamp('created_at',{withTimezone:true}).notNull().defaultNow(),
},t=>[
  unique('import_row_id_owner_key').on(t.id,t.authUserId),unique('import_row_batch_number_key').on(t.batchId,t.authUserId,t.rowNumber),unique('import_row_external_key').on(t.authUserId,t.sourceIdentity),
  foreignKey({name:'import_row_batch_owner_fk',columns:[t.batchId,t.authUserId],foreignColumns:[importBatches.id,importBatches.authUserId]}),
  foreignKey({name:'import_row_candidate_owner_fk',columns:[t.candidateId,t.authUserId],foreignColumns:[inboxCandidates.id,inboxCandidates.authUserId]}),
  foreignKey({name:'import_row_match_owner_fk',columns:[t.matchedReceiptId,t.authUserId],foreignColumns:[t.id as AnyPgColumn,t.authUserId as AnyPgColumn]}),
  index('import_row_candidate_idx').on(t.candidateId,t.authUserId),index('import_row_match_idx').on(t.matchedReceiptId,t.authUserId),
  check('import_row_shape_check',sql`${t.rowNumber} between 1 and 1000 and ${t.fingerprint} ~ '^[0-9a-f]{64}$' and (${t.sourceIdentity} is null or ${t.sourceIdentity} ~ '^[0-9a-f]{64}$') and (${t.matchedReceiptId} is null or ${t.sourceIdentity} is null)`),
  pgPolicy('import_row_select_own',{for:'select',to:authenticatedRole,using:sql`(select auth.uid())=${t.authUserId}`}),
]).enableRLS();
