import { describe, it, expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import {
  validateMonth,
  previousMonth,
  monthDays,
  elapsedDays,
  utilization,
  spendingPace,
  budgetMoney,
  calculateBudget,
  type BudgetSnapshot,
} from '../../src/modules/finance/budget-domain.js';

describe('monthly budget domain', () => {
  it('validates a calendar month, year transition and zero/positive exact allocation', () => {
    expect(validateMonth('2026-10')).toBe('2026-10');
    expect(previousMonth('2026-01')).toBe('2025-12');
    for (const value of ['2026-1', '2026-13', '2026-00', '0000-01', '9999-12'])
      expect(() => validateMonth(value)).toThrow();
    expect(budgetMoney('0', 'JPY')).toBe(0n);
    expect(budgetMoney('9223372036854775807', 'KWD')).toBe(9223372036854775807n);
    for (const value of ['-1', '1.2', '9223372036854775808'])
      expect(() => budgetMoney(value, 'BRL')).toThrow();
  });
  it('uses the profile calendar instead of the server day and handles leap years', () => {
    const instant = new Date('2026-10-01T01:30:00Z');
    expect(elapsedDays('2026-09', 'America/Sao_Paulo', instant)).toBe(30);
    expect(elapsedDays('2026-10', 'America/Sao_Paulo', instant)).toBe(0);
    expect(elapsedDays('2026-10', 'UTC', instant)).toBe(1);
    expect(monthDays('2024-02')).toBe(29);
    expect(monthDays('2026-02')).toBe(28);
  });
  it('keeps utilization exact beyond Number precision and avoids division by zero', () => {
    expect(utilization(10000n, 50000n)).toBe('20.00');
    expect(utilization(1n, 3n)).toBe('33.33');
    expect(utilization(18446744073709551614n, 1n)).toBe('1844674407370955161400.00');
    expect(utilization(1n, 0n)).toBeNull();
  });
  it.each([
    [0n, 30000n, 1, 30, 'ON_TRACK', 1000n],
    [1100n, 30000n, 1, 30, 'ATTENTION', 1000n],
    [15000n, 30000n, 15, 30, 'ON_TRACK', 15000n],
    [15001n, 30000n, 15, 30, 'ATTENTION', 15000n],
    [30000n, 30000n, 30, 30, 'ON_TRACK', 30000n],
    [30001n, 30000n, 30, 30, 'OVER_BUDGET', 30000n],
    [0n, 0n, 1, 30, 'ON_TRACK', 0n],
    [1n, 0n, 1, 30, 'OVER_BUDGET', 0n],
    [0n, 30000n, 0, 30, 'ON_TRACK', 0n],
  ] as const)(
    'spending pace (%s of %s at day %s/%s)',
    (spent, budget, elapsed, days, status, expected) => {
      expect(spendingPace(spent, budget, elapsed, days)).toEqual({ expected, status });
    },
  );
  it('rolls only positive, contiguous, closed prior months; NONE breaks the chain', () => {
    const categoryId = randomUUID();
    const metadata = { createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' };
    const periods = ['2026-08', '2026-09', '2026-10'].map((month) => ({
      ...metadata,
      id: randomUUID(),
      month,
      currency: 'BRL' as const,
      timeZone: 'UTC',
    }));
    const allocations = periods.map((p) => ({
      ...metadata,
      id: randomUUID(),
      budgetPeriodId: p.id,
      categoryId,
      categoryName: 'Food',
      categoryIsActive: true,
      currency: 'BRL' as const,
      amountMinor: '50000',
      rolloverPolicy: 'POSITIVE_ONLY' as 'POSITIVE_ONLY' | 'NONE',
      isActive: true,
    }));
    const s: BudgetSnapshot = {
      month: '2026-10',
      currency: 'BRL',
      timeZone: 'UTC',
      period: periods[2]!,
      canCopyPrevious: true,
      periods,
      allocations,
      calendars: periods.map((p) => ({
        month: p.month,
        from: new Date(p.month + '-01T00:00:00Z'),
        to: new Date(
          p.month === '2026-10'
            ? '2026-11-01T00:00:00Z'
            : p.month === '2026-09'
              ? '2026-10-01T00:00:00Z'
              : '2026-09-01T00:00:00Z',
        ),
      })),
      spending: [
        { month: '2026-08', categoryId, spentMinor: '42000' },
        { month: '2026-09', categoryId, spentMinor: '50000' },
      ],
      categoryNames: [],
    };
    expect(calculateBudget(s, new Date('2026-10-15T00:00:00Z')).categories[0]?.rolloverMinor).toBe(
      '8000',
    );
    expect(calculateBudget(s, new Date('2026-09-15T00:00:00Z')).categories[0]?.rolloverMinor).toBe(
      '0',
    );
    allocations[1]!.rolloverPolicy = 'NONE';
    expect(calculateBudget(s, new Date('2026-10-15T00:00:00Z')).categories[0]?.rolloverMinor).toBe(
      '0',
    );
    allocations[1]!.rolloverPolicy = 'POSITIVE_ONLY';
    allocations[1]!.isActive = false;
    expect(calculateBudget(s, new Date('2026-10-15T00:00:00Z')).categories[0]?.rolloverMinor).toBe(
      '0',
    );
  });
});
