import { Type, type Static } from 'typebox';
import { Currency } from './contracts.js';
import { BudgetMonth } from './budget-contracts.js';
const strict = { additionalProperties: false };
const Id = Type.String({ format: 'uuid' });
const Instant = Type.String({ format: 'date-time' });
const Amount = Type.String({ pattern: '^(0|[1-9][0-9]*)$', maxLength: 19 });
const Minor = Type.String({ pattern: '^(0|[1-9][0-9]*)$' });
const Text = Type.String({ maxLength: 1000 });
const NullableText = Type.Union([Text, Type.Null()]);
const NullableMonth = Type.Union([BudgetMonth, Type.Null()]);
const NullableAmount = Type.Union([Amount, Type.Null()]);
export const GoalPriority = Type.Union([Type.Literal('LOW'), Type.Literal('MEDIUM'), Type.Literal('HIGH')]);
export const GoalStatus = Type.Union([Type.Literal('ACTIVE'), Type.Literal('PAUSED'), Type.Literal('ARCHIVED')]);
export const GoalPlanStatus = Type.Union([Type.Literal('ACHIEVED'), Type.Literal('ON_TRACK'), Type.Literal('ATTENTION'), Type.Literal('OVERDUE'), Type.Literal('NO_PLAN')]);
export const GoalEventType = Type.Union([Type.Literal('CONTRIBUTION'), Type.Literal('WITHDRAWAL')]);
const editable = {
  name: Type.String({ minLength: 1, maxLength: 100 }),
  description: NullableText,
  targetAmountMinor: Amount,
  targetMonth: NullableMonth,
  plannedMonthlyMinor: NullableAmount,
  priority: GoalPriority,
};
export const GoalInput = Type.Object({ ...editable, description: Type.Optional(NullableText), targetMonth: Type.Optional(NullableMonth), plannedMonthlyMinor: Type.Optional(NullableAmount), currency: Currency }, strict);
export const GoalPatch = Type.Partial(Type.Object({ ...editable, status: GoalStatus }), { ...strict, minProperties: 1 });
export const GoalQuery = Type.Object({ status: Type.Optional(GoalStatus), currency: Type.Optional(Currency) }, strict);
export const GoalParams = Type.Object({ goalId: Id }, strict);
export const Goal = Type.Object({
  id: Id, ...editable, currency: Currency, status: GoalStatus, archivedAt: Type.Union([Instant, Type.Null()]), createdAt: Instant, updatedAt: Instant,
  currentAmountMinor: Minor, remainingAmountMinor: Minor, progressPercent: Type.String({ pattern: '^(0|[1-9][0-9]*)\\.[0-9]{2}$' }),
  currentMonth: BudgetMonth, timeZone: Type.String(), remainingMonthSlots: Type.Union([Type.Integer({ minimum: 0 }), Type.Null()]),
  requiredMonthlyMinor: Type.Union([Minor, Type.Null()]), estimatedCompletionMonth: NullableMonth, planStatus: GoalPlanStatus,
}, strict);
export const GoalEventInput = Type.Object({ type: GoalEventType, amountMinor: Amount, occurredAt: Instant, note: Type.Optional(NullableText), idempotencyKey: Id }, strict);
export const GoalEvent = Type.Object({ id: Id, goalId: Id, type: GoalEventType, amountMinor: Minor, currency: Currency, occurredAt: Instant, note: NullableText, idempotencyKey: Id, createdAt: Instant }, strict);
export const GoalEventsQuery = Type.Object({ limit: Type.Optional(Type.String({ pattern: '^([1-9]|[1-9][0-9]|100)$' })), cursorAt: Type.Optional(Instant), cursorId: Type.Optional(Id) }, strict);
export const GoalEventsPage = Type.Object({ items: Type.Array(GoalEvent), nextCursor: Type.Union([Type.Object({ occurredAt: Instant, id: Id }, strict), Type.Null()]) }, strict);
export type GoalInput = Static<typeof GoalInput>;
export type GoalPatch = Static<typeof GoalPatch>;
export type Goal = Static<typeof Goal>;
export type GoalQuery = Static<typeof GoalQuery>;
export type GoalEventInput = Static<typeof GoalEventInput>;
export type GoalEvent = Static<typeof GoalEvent>;
export type GoalEventsQuery = Static<typeof GoalEventsQuery>;
export type GoalEventsPage = Static<typeof GoalEventsPage>;
