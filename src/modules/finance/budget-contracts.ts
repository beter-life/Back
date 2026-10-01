import { Type, type Static } from 'typebox';
import { Currency } from './contracts.js';

const strict = { additionalProperties: false };
const Id = Type.String({ format: 'uuid' });
const Instant = Type.String({ format: 'date-time' });
const Minor = Type.String({ pattern: '^-?(0|[1-9][0-9]*)$' });
const Amount = Type.String({ pattern: '^(0|[1-9][0-9]*)$', maxLength: 19 });
const Percent = Type.Union([Type.String({ pattern: '^(0|[1-9][0-9]*)\\.[0-9]{2}$' }), Type.Null()]);
const Metadata = { id: Id, createdAt: Instant, updatedAt: Instant };
export const BudgetMonth = Type.String({
  pattern: '^[1-9][0-9]{3}-(0[1-9]|1[0-2])$',
  description: 'Calendar month YYYY-MM, years 1000–9998.',
});
export const BudgetRolloverPolicy = Type.Union([
  Type.Literal('NONE'),
  Type.Literal('POSITIVE_ONLY'),
]);
export const BudgetPaceStatus = Type.Union([
  Type.Literal('ON_TRACK'),
  Type.Literal('ATTENTION'),
  Type.Literal('OVER_BUDGET'),
]);
export const BudgetMonthParams = Type.Object({ month: BudgetMonth }, strict);
export const BudgetCategoryParams = Type.Object({ month: BudgetMonth, categoryId: Id }, strict);
export const BudgetCurrencyQuery = Type.Object({ currency: Currency }, strict);
export const BudgetPeriodInput = Type.Object({ currency: Currency }, strict);
export const BudgetAllocationInput = Type.Object(
  { currency: Currency, amountMinor: Amount, rolloverPolicy: BudgetRolloverPolicy },
  strict,
);
export const BudgetPeriod = Type.Object(
  {
    ...Metadata,
    month: BudgetMonth,
    currency: Currency,
    timeZone: Type.String({ minLength: 1, maxLength: 100 }),
  },
  strict,
);
export const BudgetAllocation = Type.Object(
  {
    ...Metadata,
    budgetPeriodId: Id,
    categoryId: Id,
    categoryName: Type.String(),
    categoryIsActive: Type.Boolean(),
    currency: Currency,
    amountMinor: Minor,
    rolloverPolicy: BudgetRolloverPolicy,
    isActive: Type.Boolean(),
  },
  strict,
);
export const BudgetView = Type.Object(
  {
    month: BudgetMonth,
    currency: Currency,
    timeZone: Type.String(),
    period: Type.Union([BudgetPeriod, Type.Null()]),
    allocations: Type.Array(BudgetAllocation),
    canCopyPrevious: Type.Boolean(),
  },
  strict,
);
export const BudgetCopyResult = Type.Object(
  {
    period: BudgetPeriod,
    copiedCount: Type.Integer({ minimum: 0 }),
    alreadyPresentCount: Type.Integer({ minimum: 0 }),
    skippedInactiveCount: Type.Integer({ minimum: 0 }),
  },
  strict,
);
export const BudgetCategoryProgress = Type.Object(
  {
    allocationId: Id,
    categoryId: Id,
    categoryName: Type.String(),
    categoryIsActive: Type.Boolean(),
    rolloverPolicy: BudgetRolloverPolicy,
    baseMinor: Minor,
    rolloverMinor: Minor,
    availableMinor: Minor,
    spentMinor: Minor,
    remainingMinor: Minor,
    utilizationPercent: Percent,
    expectedSpendToDateMinor: Minor,
    paceStatus: BudgetPaceStatus,
  },
  strict,
);
export const BudgetUnplannedCategory = Type.Object(
  {
    categoryId: Type.Union([Id, Type.Null()]),
    categoryName: Type.Union([Type.String(), Type.Null()]),
    categoryIsActive: Type.Boolean(),
    spentMinor: Minor,
  },
  strict,
);
export const BudgetSummary = Type.Object(
  {
    month: BudgetMonth,
    currency: Currency,
    timeZone: Type.String(),
    periodId: Type.Union([Id, Type.Null()]),
    from: Instant,
    to: Instant,
    daysInMonth: Type.Integer({ minimum: 28, maximum: 31 }),
    elapsedDays: Type.Integer({ minimum: 0, maximum: 31 }),
    canCopyPrevious: Type.Boolean(),
    categories: Type.Array(BudgetCategoryProgress),
    unbudgetedCategories: Type.Array(BudgetUnplannedCategory),
    baseBudgetTotalMinor: Minor,
    rolloverTotalMinor: Minor,
    budgetedTotalMinor: Minor,
    spentBudgetedMinor: Minor,
    remainingBudgetedMinor: Minor,
    unbudgetedSpendingMinor: Minor,
    expenseTotalMinor: Minor,
    utilizationPercent: Percent,
    expectedSpendToDateMinor: Minor,
    paceStatus: BudgetPaceStatus,
  },
  strict,
);
export type BudgetPeriodInput = Static<typeof BudgetPeriodInput>;
export type BudgetAllocationInput = Static<typeof BudgetAllocationInput>;
export type BudgetPeriod = Static<typeof BudgetPeriod>;
export type BudgetAllocation = Static<typeof BudgetAllocation>;
export type BudgetView = Static<typeof BudgetView>;
export type BudgetCopyResult = Static<typeof BudgetCopyResult>;
export type BudgetSummary = Static<typeof BudgetSummary>;
export type BudgetRolloverPolicy = Static<typeof BudgetRolloverPolicy>;
export type BudgetPaceStatus = Static<typeof BudgetPaceStatus>;
