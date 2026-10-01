import { AppError } from '../../shared/errors/index.js';
import { money, type Currency } from './domain.js';
import type {
  BudgetAllocation,
  BudgetPeriod,
  BudgetSummary,
  BudgetPaceStatus,
} from './budget-contracts.js';

export function validateMonth(month: string) {
  if (!/^[1-9][0-9]{3}-(0[1-9]|1[0-2])$/.test(month) || Number(month.slice(0, 4)) > 9998)
    throw new AppError('VALIDATION_ERROR');
  return month;
}
export function previousMonth(month: string) {
  const year = Number(month.slice(0, 4));
  const value = Number(month.slice(5));
  return `${String(value === 1 ? year - 1 : year).padStart(4, '0')}-${String(value === 1 ? 12 : value - 1).padStart(2, '0')}`;
}
export function timeZone(value: string) {
  try {
    return new Intl.DateTimeFormat('en', { timeZone: value }).resolvedOptions().timeZone;
  } catch {
    throw new AppError('VALIDATION_ERROR');
  }
}
export function budgetMoney(amount: string, currency: Currency) {
  const result = money(amount, currency, false);
  if (result.amountMinor < 0n) throw new AppError('VALIDATION_ERROR');
  return result.amountMinor;
}
export function monthDays(month: string) {
  const date = new Date(0);
  date.setUTCFullYear(Number(month.slice(0, 4)), Number(month.slice(5)), 0);
  return date.getUTCDate();
}
export function elapsedDays(month: string, zone: string, now: Date) {
  const parts = new Intl.DateTimeFormat('en', {
    timeZone: zone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const part = (type: string) => parts.find((p) => p.type === type)!.value;
  const current = `${part('year').padStart(4, '0')}-${part('month')}`;
  return current < month ? 0 : current > month ? monthDays(month) : Number(part('day'));
}
export function utilization(spent: bigint, available: bigint) {
  if (available === 0n) return null;
  const hundredths = (spent * 10000n) / available;
  return `${hundredths / 100n}.${String(hundredths % 100n).padStart(2, '0')}`;
}
export function spendingPace(
  spent: bigint,
  available: bigint,
  elapsed: number,
  days: number,
): { expected: bigint; status: BudgetPaceStatus } {
  const expected = (available * BigInt(elapsed)) / BigInt(days);
  return {
    expected,
    status: spent > available ? 'OVER_BUDGET' : spent > expected ? 'ATTENTION' : 'ON_TRACK',
  };
}
export interface BudgetSnapshot {
  month: string;
  currency: Currency;
  timeZone: string;
  period: BudgetPeriod | null;
  canCopyPrevious: boolean;
  periods: BudgetPeriod[];
  allocations: BudgetAllocation[];
  calendars: { month: string; from: Date; to: Date }[];
  spending: { month: string; categoryId: string | null; spentMinor: string }[];
  categoryNames: { id: string; name: string; isActive: boolean }[];
}
export function calculateBudget(snapshot: BudgetSnapshot, now: Date): BudgetSummary {
  const { month, currency, timeZone: zone } = snapshot;
  const calendar = snapshot.calendars.find((p) => p.month === month)!;
  const days = monthDays(month);
  const elapsed = elapsedDays(month, zone, now);
  const spend = new Map(
    snapshot.spending.map((row) => [`${row.month}:${row.categoryId}`, BigInt(row.spentMinor)]),
  );
  const previous = new Map<string, { available: bigint; spent: bigint }>();
  let categories: BudgetSummary['categories'] = [];
  for (const period of snapshot.periods) {
    const periodCalendar = snapshot.calendars.find((p) => p.month === previousMonth(period.month));
    const progress = snapshot.allocations
      .filter((a) => a.budgetPeriodId === period.id && a.isActive)
      .map((a) => {
        const prior = previous.get(`${previousMonth(period.month)}:${a.categoryId}`);
        const remainder = prior ? prior.available - prior.spent : 0n;
        const rollover =
          a.rolloverPolicy === 'POSITIVE_ONLY' &&
          periodCalendar &&
          periodCalendar.to <= now &&
          remainder > 0n
            ? remainder
            : 0n;
        const base = BigInt(a.amountMinor);
        const available = base + rollover;
        const spent = spend.get(`${period.month}:${a.categoryId}`) ?? 0n;
        previous.set(`${period.month}:${a.categoryId}`, { available, spent });
        const pace = spendingPace(spent, available, elapsed, days);
        return {
          allocationId: a.id,
          categoryId: a.categoryId,
          categoryName: a.categoryName,
          categoryIsActive: a.categoryIsActive,
          rolloverPolicy: a.rolloverPolicy,
          baseMinor: String(base),
          rolloverMinor: String(rollover),
          availableMinor: String(available),
          spentMinor: String(spent),
          remainingMinor: String(available - spent),
          utilizationPercent: utilization(spent, available),
          expectedSpendToDateMinor: String(pace.expected),
          paceStatus: pace.status,
        };
      });
    if (period.month === month) categories = progress;
  }
  const planned = new Set(categories.map((c) => c.categoryId));
  const unbudgetedCategories = snapshot.spending
    .filter(
      (s) => s.month === month && !planned.has(s.categoryId ?? '') && BigInt(s.spentMinor) > 0n,
    )
    .map((s) => {
      const category = snapshot.categoryNames.find((c) => c.id === s.categoryId);
      return {
        categoryId: s.categoryId,
        categoryName: category?.name ?? null,
        categoryIsActive: category?.isActive ?? false,
        spentMinor: s.spentMinor,
      };
    });
  const sum = (key: 'baseMinor' | 'rolloverMinor' | 'availableMinor' | 'spentMinor') =>
    categories.reduce((total, c) => total + BigInt(c[key]), 0n);
  const budget = sum('availableMinor');
  const spentBudgeted = sum('spentMinor');
  const unplanned = unbudgetedCategories.reduce((total, c) => total + BigInt(c.spentMinor), 0n);
  const expenses = spentBudgeted + unplanned;
  const pace = spendingPace(expenses, budget, elapsed, days);
  return {
    month,
    currency,
    timeZone: zone,
    periodId: snapshot.period?.id ?? null,
    from: calendar.from.toISOString(),
    to: calendar.to.toISOString(),
    daysInMonth: days,
    elapsedDays: elapsed,
    canCopyPrevious: snapshot.canCopyPrevious,
    categories,
    unbudgetedCategories,
    baseBudgetTotalMinor: String(sum('baseMinor')),
    rolloverTotalMinor: String(sum('rolloverMinor')),
    budgetedTotalMinor: String(budget),
    spentBudgetedMinor: String(spentBudgeted),
    remainingBudgetedMinor: String(budget - spentBudgeted),
    unbudgetedSpendingMinor: String(unplanned),
    expenseTotalMinor: String(expenses),
    utilizationPercent: utilization(expenses, budget),
    expectedSpendToDateMinor: String(pace.expected),
    paceStatus: pace.status,
  };
}
