import { AppError } from '../../shared/errors/index.js';
import type { ProfileRepository } from '../profile/repository.js';
import type { RecurrenceRepository } from './recurrence-repository.js';
import type { RecurrenceQuery, RecurrenceInput, RecurrencePatch, CalendarQuery, RadarQuery, Recurrence, SubscriptionRadar } from './recurrence-contracts.js';
import { recurrenceToday, recurrenceView, projectCalendar, validateCalendarRange, addCivilDays, validateRecurrence } from './recurrence-domain.js';
import { dateRange } from './domain.js';
export function recurrenceService(repository: RecurrenceRepository, profiles: ProfileRepository, clock = () => new Date()) {
  const context = async (owner: string) => { const zone = (await profiles.findByAuthUser(owner))?.timezone ?? 'UTC'; return { zone, today: recurrenceToday(zone, clock()) }; };
  return {
    async list(owner: string, query: RecurrenceQuery) {
      if (!!query.cursorAt !== !!query.cursorId) throw new AppError('VALIDATION_ERROR');
      if (query.cursorAt) dateRange(query.cursorAt);
      const c = await context(owner), page = await repository.list(owner, query);
      return { ...page, items: page.items.map(row => recurrenceView(row, c.today, c.zone)) };
    },
    async get(owner: string, id: string) { const row = await repository.get(owner, id); if (!row) throw new AppError('NOT_FOUND'); const c = await context(owner); return recurrenceView(row, c.today, c.zone); },
    async create(owner: string, input: RecurrenceInput) { const row = await repository.create(owner, validateRecurrence(input)), c = await context(owner); return recurrenceView(row, c.today, c.zone); },
    async patch(owner: string, id: string, input: RecurrencePatch) { const row = await repository.patch(owner, id, input), c = await context(owner); return recurrenceView(row, c.today, c.zone); },
    async status(owner: string, id: string, status: Recurrence['status']) { const row = await repository.status(owner, id, status), c = await context(owner); return recurrenceView(row, c.today, c.zone); },
    async calendar(owner: string, query: CalendarQuery) { validateCalendarRange(query.from, query.to); const c = await context(owner); const rows = await repository.eligible(owner, query, query.from, query.to); return projectCalendar(rows, query.from, query.to, c.today, c.zone); },
    async radar(owner: string, query: RadarQuery): Promise<SubscriptionRadar> {
      const c = await context(owner), to = addCivilDays(c.today, 30) ?? '9999-01-01';
      const rows = await repository.eligible(owner, { ...query, recurrenceKind: 'SUBSCRIPTION' });
      const calendar = projectCalendar(rows, c.today, to, c.today, c.zone);
      const totals = new Map<Recurrence['currency'], { subscriptionCount: number; occurrenceCount: number; amount: bigint }>();
      for (const row of rows) { const value = totals.get(row.currency) ?? { subscriptionCount: 0, occurrenceCount: 0, amount: 0n }; value.subscriptionCount++; totals.set(row.currency, value); }
      for (const entry of calendar.entries) { const value = totals.get(entry.currency)!; value.occurrenceCount++; value.amount += BigInt(entry.amountMinor); }
      return { ...calendar, subscriptions: rows.map(row => recurrenceView(row, c.today, c.zone)), totals: [...totals].sort(([a],[b]) => a < b ? -1 : 1).map(([currency,v]) => ({ currency, subscriptionCount: v.subscriptionCount, occurrenceCount: v.occurrenceCount, amountMinor: String(v.amount) })) };
    },
  };
}
