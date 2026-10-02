import { describe, it, expect } from 'vitest';
import { calculateGoal, currentGoalMonth, validateGoalInput, validateGoalEvent, type GoalRecord } from '../../src/modules/finance/goal-domain.js';
const now = new Date('2026-10-15T12:00:00Z');
const record = (overrides: Partial<GoalRecord> = {}): GoalRecord => ({ id: '11111111-1111-4111-8111-111111111111', name: 'Reserva', description: null, currency: 'BRL', targetAmountMinor: '1000000', targetMonth: '2026-12', plannedMonthlyMinor: '100000', priority: 'HIGH', status: 'ACTIVE', archivedAt: null, createdAt: now.toISOString(), updatedAt: now.toISOString(), currentAmountMinor: '0', ...overrides });
const view = (overrides: Partial<GoalRecord> = {}) => calculateGoal(record(overrides), 'America/Sao_Paulo', now);
describe('goal exact planning read model', () => {
  it.each([['0', '1000000', '0.00'], ['250000', '750000', '25.00'], ['1000000', '0', '100.00'], ['1200000', '0', '120.00'], ['200000', '800000', '20.00']])('derives current=%s with remaining=%s and progress=%s', (currentAmountMinor, remainingAmountMinor, progressPercent) => {
    expect(view({ currentAmountMinor })).toMatchObject({ currentAmountMinor, remainingAmountMinor, progressPercent });
  });
  it('recalculates after target edit without changing current', () => { expect(view({ targetAmountMinor: '1200000', currentAmountMinor: '200000' })).toMatchObject({ remainingAmountMinor: '1000000', progressPercent: '16.66' }); });
  it('includes current month in slots and rounds needed minor units upward', () => { expect(view()).toMatchObject({ remainingMonthSlots: 3, requiredMonthlyMinor: '333334', estimatedCompletionMonth: '2027-07', planStatus: 'ATTENTION' }); });
  it.each([
    [{ currentAmountMinor: '1000000', targetMonth: '2026-09' }, 'ACHIEVED', '0', '2026-10'],
    [{ targetMonth: '2026-09' }, 'OVERDUE', null, '2027-07'],
    [{ plannedMonthlyMinor: '333334' }, 'ON_TRACK', '333334', '2026-12'],
    [{ plannedMonthlyMinor: '333333' }, 'ATTENTION', '333334', '2027-01'],
    [{ plannedMonthlyMinor: null }, 'NO_PLAN', '333334', null],
    [{ plannedMonthlyMinor: '0' }, 'ATTENTION', '333334', null],
    [{ targetMonth: null }, 'NO_PLAN', null, '2027-07'],
    [{ targetMonth: '2026-10' }, 'ATTENTION', '1000000', '2027-07'],
  ] as const)('has deterministic derived status for %j', (input, planStatus, requiredMonthlyMinor, estimatedCompletionMonth) => { expect(view(input)).toMatchObject({ planStatus, requiredMonthlyMinor, estimatedCompletionMonth }); });
  it('uses profile timezone at a month boundary', () => { const date = new Date('2026-11-01T01:00:00Z'); expect(currentGoalMonth('America/Sao_Paulo', date)).toBe('2026-10'); expect(currentGoalMonth('UTC', date)).toBe('2026-11'); });
  it('keeps huge integers exact and suppresses projections beyond calendar range', () => { expect(view({ targetAmountMinor: '9223372036854775807', plannedMonthlyMinor: '1' })).toMatchObject({ requiredMonthlyMinor: '3074457345618258603', estimatedCompletionMonth: null }); });
  it('does not change money semantics for JPY/KWD or persisted pause/archive', () => { expect(view({ currency: 'JPY', status: 'PAUSED' }).requiredMonthlyMinor).toBe('333334'); expect(view({ currency: 'KWD', status: 'ARCHIVED' }).planStatus).toBe('ATTENTION'); });
});
describe('goal validation', () => {
  it.each(['0', '-1', '1.1', '9223372036854775808'])('rejects target %s', targetAmountMinor => { expect(() => validateGoalInput({ targetAmountMinor }, 'BRL')).toThrow(); });
  it.each(['2026-00', '2026-13', '9999-01', '2026-1'])('rejects month %s', targetMonth => { expect(() => validateGoalInput({ targetMonth }, 'BRL')).toThrow(); });
  it('accepts null/zero plans, trims names, and rejects negative plans or whitespace names', () => { expect(validateGoalInput({ name: ' Reserva ', plannedMonthlyMinor: '0' }, 'BRL')).toEqual({ name: 'Reserva', plannedMonthlyMinor: '0' }); expect(() => validateGoalInput({ plannedMonthlyMinor: '-1' }, 'BRL')).toThrow(); expect(() => validateGoalInput({ name: ' ' }, 'BRL')).toThrow(); });
  it('canonicalizes event content and rejects invalid money/date', () => { const input = { type: 'CONTRIBUTION' as const, amountMinor: '1', occurredAt: '2026-10-10T09:00:00-03:00', note: ' Nota ', idempotencyKey: '11111111-1111-4111-8111-111111111111' }; expect(validateGoalEvent(input, 'BRL')).toMatchObject({ occurredAt: '2026-10-10T12:00:00.000Z', note: 'Nota' }); expect(() => validateGoalEvent({ ...input, amountMinor: '0' }, 'BRL')).toThrow(); expect(() => validateGoalEvent({ ...input, occurredAt: 'bad' }, 'BRL')).toThrow(); });
});
