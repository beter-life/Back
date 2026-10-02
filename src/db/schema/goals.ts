import { sql } from 'drizzle-orm';
import { authenticatedRole } from 'drizzle-orm/supabase';
import { bigint, check, foreignKey, index, pgPolicy, timestamp, unique, uuid, varchar, type AnyPgColumn } from 'drizzle-orm/pg-core';
import { appSchema } from './profiles.js';
import { currencyDigits, type Currency } from '../../modules/finance/domain.js';
const currencies = sql.raw(Object.keys(currencyDigits).map(c => `'${c}'`).join(','));
const own = (column: AnyPgColumn) => sql`(select auth.uid()) = ${column}`;
export const financialGoals = appSchema.table('financial_goals', {
  id: uuid('id').primaryKey().defaultRandom(), authUserId: uuid('auth_user_id').notNull(), name: varchar('name', { length: 100 }).notNull(), description: varchar('description', { length: 1000 }),
  currency: varchar('currency', { length: 3 }).$type<Currency>().notNull(), targetAmountMinor: bigint('target_amount_minor', { mode: 'bigint' }).notNull(), targetMonth: varchar('target_month', { length: 7 }), plannedMonthlyMinor: bigint('planned_monthly_minor', { mode: 'bigint' }),
  priority: varchar('priority', { length: 6 }).$type<'LOW' | 'MEDIUM' | 'HIGH'>().notNull(), status: varchar('status', { length: 8 }).$type<'ACTIVE' | 'PAUSED' | 'ARCHIVED'>().notNull().default('ACTIVE'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(), updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(), archivedAt: timestamp('archived_at', { withTimezone: true }),
}, t => [
  unique('financial_goals_owner_key').on(t.id, t.authUserId), index('financial_goals_owner_status_idx').on(t.authUserId, t.status), index('financial_goals_owner_currency_idx').on(t.authUserId, t.currency),
  check('financial_goals_name_check', sql`length(trim(${t.name})) > 0`), check('financial_goals_currency_check', sql`${t.currency} in (${currencies})`), check('financial_goals_target_check', sql`${t.targetAmountMinor} > 0`),
  check('financial_goals_planned_check', sql`${t.plannedMonthlyMinor} >= 0`), check('financial_goals_month_check', sql`${t.targetMonth} ~ '^[1-9][0-9]{3}-(0[1-9]|1[0-2])$' and left(${t.targetMonth},4)::integer <= 9998`),
  check('financial_goals_priority_check', sql`${t.priority} in ('LOW','MEDIUM','HIGH')`), check('financial_goals_status_check', sql`${t.status} in ('ACTIVE','PAUSED','ARCHIVED')`), check('financial_goals_archive_check', sql`(${t.status} = 'ARCHIVED') = (${t.archivedAt} is not null)`),
  pgPolicy('financial_goals_select_own', { for: 'select', to: authenticatedRole, using: own(t.authUserId) }), pgPolicy('financial_goals_insert_own', { for: 'insert', to: authenticatedRole, withCheck: own(t.authUserId) }), pgPolicy('financial_goals_update_own', { for: 'update', to: authenticatedRole, using: own(t.authUserId), withCheck: own(t.authUserId) }),
]).enableRLS();
export const financialGoalEvents = appSchema.table('financial_goal_events', {
  id: uuid('id').primaryKey().defaultRandom(), authUserId: uuid('auth_user_id').notNull(), goalId: uuid('goal_id').notNull(), type: varchar('type', { length: 12 }).$type<'CONTRIBUTION' | 'WITHDRAWAL'>().notNull(), amountMinor: bigint('amount_minor', { mode: 'bigint' }).notNull(), occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull(), note: varchar('note', { length: 1000 }), idempotencyKey: uuid('idempotency_key').notNull(), createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, t => [
  unique('financial_goal_events_owner_idempotency_key').on(t.authUserId, t.idempotencyKey), index('financial_goal_events_goal_occurred_idx').on(t.goalId, t.occurredAt, t.id),
  foreignKey({ name: 'financial_goal_events_goal_owner_fk', columns: [t.goalId, t.authUserId], foreignColumns: [financialGoals.id, financialGoals.authUserId] }), check('financial_goal_events_amount_check', sql`${t.amountMinor} > 0`), check('financial_goal_events_type_check', sql`${t.type} in ('CONTRIBUTION','WITHDRAWAL')`),
  pgPolicy('financial_goal_events_select_own', { for: 'select', to: authenticatedRole, using: own(t.authUserId) }),
  // App schema is private. Clients get no direct event-write policy: append-only writes require the backend's locking/idempotency/withdrawal invariants.
]).enableRLS();
