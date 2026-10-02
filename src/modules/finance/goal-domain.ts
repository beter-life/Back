import { AppError } from '../../shared/errors/index.js';
import { money, name, dateRange } from './domain.js';
import { validateMonth, timeZone, utilization } from './budget-domain.js';
import type { Goal, GoalInput, GoalPatch, GoalEventInput } from './goal-contracts.js';
export type GoalRecord = Omit<Goal, 'currentMonth' | 'timeZone' | 'remainingMonthSlots' | 'requiredMonthlyMinor' | 'estimatedCompletionMonth' | 'planStatus' | 'remainingAmountMinor' | 'progressPercent'>;
export function currentGoalMonth(zone: string, now: Date) {
  const parts = new Intl.DateTimeFormat('en', { timeZone: timeZone(zone), year: 'numeric', month: '2-digit' }).formatToParts(now);
  return validateMonth(`${parts.find(p => p.type === 'year')!.value.padStart(4, '0')}-${parts.find(p => p.type === 'month')!.value}`);
}
const ordinal = (month: string) => Number(month.slice(0, 4)) * 12 + Number(month.slice(5)) - 1;
export function calculateGoal(row: GoalRecord, zone: string, now: Date): Goal {
  const currentMonth = currentGoalMonth(zone, now);
  const target = BigInt(row.targetAmountMinor), current = BigInt(row.currentAmountMinor);
  const remaining = target > current ? target - current : 0n;
  const slots = row.targetMonth ? Math.max(ordinal(row.targetMonth) - ordinal(currentMonth) + 1, 0) : null;
  const required = remaining === 0n ? 0n : slots && slots > 0 ? (remaining + BigInt(slots) - 1n) / BigInt(slots) : null;
  const planned = row.plannedMonthlyMinor === null ? null : BigInt(row.plannedMonthlyMinor);
  let estimated: string | null = remaining === 0n ? currentMonth : null;
  if (remaining > 0n && planned && planned > 0n) {
    const steps = (remaining + planned - 1n) / planned;
    const end = BigInt(ordinal(currentMonth)) + steps - 1n;
    if (end <= BigInt(9998 * 12 + 11)) estimated = `${end / 12n}-${String(end % 12n + 1n).padStart(2, '0')}`;
  }
  const planStatus = remaining === 0n ? 'ACHIEVED' : slots === 0 ? 'OVERDUE' : required !== null && planned !== null ? planned >= required ? 'ON_TRACK' : 'ATTENTION' : 'NO_PLAN';
  return { ...row, currentMonth, timeZone: zone, remainingAmountMinor: String(remaining), progressPercent: utilization(current, target)!, remainingMonthSlots: slots, requiredMonthlyMinor: required === null ? null : String(required), estimatedCompletionMonth: estimated, planStatus };
}
export function validateGoalInput<T extends GoalInput | GoalPatch>(input: T, currency: Goal['currency']): T {
  if (input.targetAmountMinor !== undefined) money(input.targetAmountMinor, currency);
  if (input.plannedMonthlyMinor != null && money(input.plannedMonthlyMinor, currency, false).amountMinor < 0n) throw new AppError('VALIDATION_ERROR');
  if (input.targetMonth != null) validateMonth(input.targetMonth);
  return { ...input, ...(input.name !== undefined ? { name: name(input.name) } : {}), ...(input.description !== undefined ? { description: input.description?.trim() || null } : {}) };
}
export function validateGoalEvent(input: GoalEventInput, currency: Goal['currency']) {
  money(input.amountMinor, currency);
  dateRange(input.occurredAt);
  return { ...input, idempotencyKey: input.idempotencyKey.toLowerCase(), occurredAt: new Date(input.occurredAt).toISOString(), note: input.note?.trim() || null };
}
