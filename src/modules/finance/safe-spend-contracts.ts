import { Type, type Static } from 'typebox';
import { Currency } from './contracts.js';
const strict = { additionalProperties: false };
const Id = Type.String({ format: 'uuid' });
const Minor = Type.String({ pattern: '^-?(0|[1-9][0-9]*)$' });
const DateText = Type.String({ format: 'date' });
const nullableMinor = Type.Union([Minor, Type.Null()]);
export const SafeSpendQuery = Type.Object({ currency: Currency }, strict);
export const SafeSpendSettingsInput = Type.Object({
  currency: Currency, accountIds: Type.Array(Id, { minItems: 1, maxItems: 100, uniqueItems: true }),
  safetyBufferMinor: Type.String({ pattern: '^(0|[1-9][0-9]*)$', maxLength: 19 }),
  respectBudget: Type.Boolean(), reserveRecurrences: Type.Boolean(), reserveGoalPlans: Type.Boolean(),
}, strict);
export const SafeSpendSettings = Type.Object({ ...SafeSpendSettingsInput.properties, id: Id, createdAt: Type.String({ format: 'date-time' }), updatedAt: Type.String({ format: 'date-time' }) }, strict);
export const SafeSpendSettingsResponse = Type.Union([SafeSpendSettings, Type.Null()]);
export const SafeSpendSource = Type.Object({
  sourceType: Type.Union([Type.Literal('CARD_INVOICE'),Type.Literal('DEBT_MINIMUM'),Type.Literal('FUTURE_EXPENSE'),Type.Literal('RECURRENCE'),Type.Literal('GOAL_PLAN'),Type.Literal('SAFETY_BUFFER'),Type.Literal('EXPECTED_INCOME')]),
  sourceId: Type.String(), label: Type.String(), date: Type.Union([DateText, Type.Null()]), amountMinor: Minor,
  certainty: Type.Union([Type.Literal('CONFIRMED'), Type.Literal('PLANNED'), Type.Literal('PROJECTED')]), included: Type.Boolean(), reason: Type.String(),
}, strict);
export const SafeSpendWarning = Type.Union([Type.Literal('NO_BUDGET_FOR_CURRENT_MONTH'),Type.Literal('POTENTIAL_RECURRENCE_OVERLAP'),Type.Literal('EXPECTED_INCOME_EXCLUDED_FROM_BASE'),Type.Literal('GOALS_ARE_PLANNING_ONLY'),Type.Literal('NO_RECURRENCE_RESERVE'),Type.Literal('NEGATIVE_LIQUID_ACCOUNT'),Type.Literal('LIMITED_DATA_COVERAGE')]);
export const SafeSpendView = Type.Object({
  currency: Currency, today: DateText, periodEndExclusive: DateText, timeZone: Type.String(), asOf: Type.String({ format: 'date-time' }),
  status: Type.Union([Type.Literal('AVAILABLE'), Type.Literal('OVERCOMMITTED')]),
  liquidFundsMinor: Minor, hardCommitmentsMinor: Minor, cardCommitmentsMinor: Minor, debtCommitmentsMinor: Minor,
  futureConfirmedExpensesMinor: Minor, projectedRecurrenceExpensesMinor: Minor, plannedRecurrenceReserveMinor: Minor,
  goalReserveMinor: Minor, safetyBufferMinor: Minor, cashCapacityMinor: Minor, budgetHeadroomMinor: nullableMinor,
  budgetOverrunMinor: Minor, budgetCapApplied: Type.Boolean(), rawSafeToSpendMinor: Minor, safeToSpendMinor: Minor,
  shortfallMinor: Minor, projectedIncomeMinor: Minor, safeToSpendWithExpectedIncomeMinor: Minor,
  remainingDaysInclusive: Type.Integer({ minimum: 1, maximum: 31 }), dailySafeToSpendMinor: Minor,
  accounts: Type.Array(Type.Object({ id: Id, name: Type.String(), balanceMinor: Minor }, strict)),
  items: Type.Array(SafeSpendSource), warnings: Type.Array(SafeSpendWarning), assumptions: Type.Array(Type.String()),
}, strict);
export const SafeSpendSummary = Type.Array(SafeSpendView, { maxItems: 12 });
export type SafeSpendSettingsInput = Static<typeof SafeSpendSettingsInput>;
export type SafeSpendSettings = Static<typeof SafeSpendSettings>;
export type SafeSpendView = Static<typeof SafeSpendView>;
export type SafeSpendSource = Static<typeof SafeSpendSource>;
export type SafeSpendWarning = Static<typeof SafeSpendWarning>;
