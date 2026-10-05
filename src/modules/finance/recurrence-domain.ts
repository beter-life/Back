import { AppError } from '../../shared/errors/index.js';
import { money, name } from './domain.js';
import { timeZone } from './budget-domain.js';
import type { Recurrence, RecurrenceInput, CalendarEntry, FinancialCalendar } from './recurrence-contracts.js';
export type RecurrenceRecord = Omit<Recurrence, 'nextOccurrenceDate' | 'today' | 'timeZone'>;
export const recurrenceLimits = { WEEKLY: 52, MONTHLY: 24, YEARLY: 10 } as const;
export const maxProjectionRules = 500;
const leap = (y: number) => y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0);
const monthDays = (y: number, m: number) => [31, leap(y) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1]!;
const yearDays = (y: number) => (y - 1) * 365 + Math.floor((y - 1) / 4) - Math.floor((y - 1) / 100) + Math.floor((y - 1) / 400);
const dateText = (y: number, m: number, d: number) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
export function civilDate(value: string, exclusiveUpper = false) {
  const match = /^([1-9][0-9]{3})-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/.exec(value);
  if (!match) throw new AppError('VALIDATION_ERROR');
  const y = Number(match[1]), m = Number(match[2]), d = Number(match[3]);
  if ((y > 9998 && !(exclusiveUpper && value === '9999-01-01')) || d > monthDays(y, m)) throw new AppError('VALIDATION_ERROR');
  return { y, m, d };
}
export function civilOrdinal(value: string, exclusiveUpper = false) {
  const { y, m, d } = civilDate(value, exclusiveUpper);
  let result = yearDays(y) + d - 1;
  for (let month = 1; month < m; month++) result += monthDays(y, month);
  return result;
}
export function civilFromOrdinal(day: number): string | null {
  if (!Number.isInteger(day) || day < yearDays(1000) || day > yearDays(9999)) return null;
  if (day === yearDays(9999)) return '9999-01-01'; // Exclusive upper bound, never a rule's start or occurrence.
  let low = 1000, high = 9998;
  while (low < high) { const mid = Math.ceil((low + high) / 2); if (yearDays(mid) <= day) low = mid; else high = mid - 1; }
  let rest = day - yearDays(low), month = 1;
  while (rest >= monthDays(low, month)) { rest -= monthDays(low, month); month++; }
  return dateText(low, month, rest + 1);
}
export function addCivilDays(date: string, days: number) { return civilFromOrdinal(civilOrdinal(date) + days); }
export function recurrenceToday(zone: string, now: Date) {
  const parts = new Intl.DateTimeFormat('en', { timeZone: timeZone(zone), year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  const result = ['year','month','day'].map(type => parts.find(p => p.type === type)!.value).join('-');
  civilDate(result); return result;
}
export function validateRecurrence(input: RecurrenceInput) {
  money(input.amountMinor, input.currency); civilDate(input.startDate);
  if (input.endDate !== null && input.endDate !== undefined) { civilDate(input.endDate); if (input.endDate < input.startDate) throw new AppError('VALIDATION_ERROR'); }
  if (!Number.isInteger(input.intervalCount) || input.intervalCount < 1 || input.intervalCount > recurrenceLimits[input.frequency]) throw new AppError('VALIDATION_ERROR');
  if (input.recurrenceKind === 'SUBSCRIPTION' && input.transactionType !== 'EXPENSE') throw new AppError('VALIDATION_ERROR');
  return { ...input, name: name(input.name), description: input.description?.trim() || null, accountId: input.accountId?.toLowerCase() ?? null, categoryId: input.categoryId?.toLowerCase() ?? null, endDate: input.endDate ?? null };
}
type Rule = Pick<RecurrenceRecord, 'startDate' | 'endDate' | 'frequency' | 'intervalCount' | 'status'>;
function occurrenceAt(rule: Rule, index: number): string | null {
  const a = civilDate(rule.startDate);
  if (rule.frequency === 'WEEKLY') { const result = addCivilDays(rule.startDate, index * rule.intervalCount * 7); return result === '9999-01-01' ? null : result; }
  const ordinal = a.y * 12 + a.m - 1 + index * rule.intervalCount * (rule.frequency === 'YEARLY' ? 12 : 1);
  const y = Math.floor(ordinal / 12), m = ordinal % 12 + 1;
  if (y > 9998) return null;
  return dateText(y, m, Math.min(a.d, monthDays(y, m)));
}
function firstIndex(rule: Rule, from: string) {
  const a = civilDate(rule.startDate), f = civilDate(from);
  let index = rule.frequency === 'WEEKLY' ? Math.ceil((civilOrdinal(from) - civilOrdinal(rule.startDate)) / (7 * rule.intervalCount)) : Math.floor(((f.y - a.y) * 12 + f.m - a.m) / (rule.intervalCount * (rule.frequency === 'YEARLY' ? 12 : 1)));
  index = Math.max(index, 0);
  const candidate = occurrenceAt(rule, index);
  return candidate && candidate < from ? index + 1 : index;
}
export function nextOccurrence(rule: Rule, today: string) {
  civilDate(today);
  if (rule.status !== 'ACTIVE') return null;
  const date = occurrenceAt(rule, firstIndex(rule, today));
  return date && (!rule.endDate || date <= rule.endDate) ? date : null;
}
export function validateCalendarRange(from: string, to: string) {
  try { const length = civilOrdinal(to, true) - civilOrdinal(from); if (length <= 0 || length > 366) throw new Error('range'); }
  catch { throw new AppError('RECURRENCE_RANGE_INVALID'); }
}
export function occurrenceDates(rule: Rule, from: string, to: string) {
  validateCalendarRange(from, to);
  if (rule.status !== 'ACTIVE') return [];
  const dates: string[] = [];
  let index = firstIndex(rule, from);
  // At most 53 weekly dates in 366 days, plus one terminating probe. Seek from the anchor without replaying its past.
  for (let probe = 0; probe < 54; probe++, index++) {
    const date = occurrenceAt(rule, index);
    if (!date || date >= to || (rule.endDate && date > rule.endDate)) break;
    dates.push(date);
  }
  return dates;
}
export function recurrenceView(row: RecurrenceRecord, today: string, zone: string): Recurrence { return { ...row, today, timeZone: zone, nextOccurrenceDate: nextOccurrence(row, today) }; }
export function projectCalendar(rows: RecurrenceRecord[], from: string, to: string, today: string, zone: string): FinancialCalendar {
  validateCalendarRange(from, to);
  if (rows.length > maxProjectionRules) throw new AppError('RECURRENCE_PROJECTION_LIMIT');
  const entries: CalendarEntry[] = rows.flatMap(row => occurrenceDates(row, from, to).map(date => ({ recurrenceId: row.id, occurrenceKey: `${row.id}:${date}`, date, name: row.name, transactionType: row.transactionType, recurrenceKind: row.recurrenceKind, amountMinor: row.amountMinor, currency: row.currency, account: row.account, category: row.category })));
  entries.sort((a,b) => a.date < b.date ? -1 : a.date > b.date ? 1 : a.recurrenceId < b.recurrenceId ? -1 : a.recurrenceId > b.recurrenceId ? 1 : 0);
  const amounts = new Map<Recurrence['currency'], { income: bigint; expense: bigint }>();
  for (const entry of entries) { const total = amounts.get(entry.currency) ?? { income: 0n, expense: 0n }; total[entry.transactionType === 'INCOME' ? 'income' : 'expense'] += BigInt(entry.amountMinor); amounts.set(entry.currency, total); }
  const totals = [...amounts].sort(([a],[b]) => a < b ? -1 : 1).map(([currency,v]) => ({ currency, incomeMinor: String(v.income), expenseMinor: String(v.expense), projectedNetMinor: String(v.income - v.expense) }));
  return { from, to, today, timeZone: zone, entries, totals };
}
