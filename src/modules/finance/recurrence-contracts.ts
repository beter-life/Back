import { Type, type Static } from 'typebox';
import { Currency } from './contracts.js';
const strict = { additionalProperties: false };
const Id = Type.String({ format: 'uuid' });
const Instant = Type.String({ format: 'date-time' });
const nullable = <T extends ReturnType<typeof Type.String>>(value: T) => Type.Union([value, Type.Null()]);
const Amount = Type.String({ pattern: '^(0|[1-9][0-9]*)$', maxLength: 19 });
const Minor = Type.String({ pattern: '^(0|[1-9][0-9]*)$' });
export const RecurrenceDate = Type.String({ pattern: '^[1-9][0-9]{3}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$' });
export const RecurrenceType = Type.Union([Type.Literal('INCOME'), Type.Literal('EXPENSE')]);
export const RecurrenceKind = Type.Union([Type.Literal('STANDARD'), Type.Literal('SUBSCRIPTION')]);
export const RecurrenceFrequency = Type.Union([Type.Literal('WEEKLY'), Type.Literal('MONTHLY'), Type.Literal('YEARLY')]);
export const RecurrenceStatus = Type.Union([Type.Literal('ACTIVE'), Type.Literal('PAUSED'), Type.Literal('ARCHIVED')]);
const editable = {
  name: Type.String({ minLength: 1, maxLength: 100 }), description: nullable(Type.String({ maxLength: 1000 })),
  amountMinor: Amount, accountId: nullable(Id), categoryId: nullable(Id), recurrenceKind: RecurrenceKind,
  frequency: RecurrenceFrequency, intervalCount: Type.Integer({ minimum: 1, maximum: 52 }), startDate: RecurrenceDate, endDate: nullable(RecurrenceDate),
};
export const RecurrenceInput = Type.Object({ ...editable, description: Type.Optional(editable.description), accountId: Type.Optional(editable.accountId), categoryId: Type.Optional(editable.categoryId), endDate: Type.Optional(editable.endDate), currency: Currency, transactionType: RecurrenceType }, strict);
export const RecurrencePatch = Type.Partial(Type.Object(editable), { ...strict, minProperties: 1 });
const filters = { transactionType: Type.Optional(RecurrenceType), recurrenceKind: Type.Optional(RecurrenceKind), currency: Type.Optional(Currency), accountId: Type.Optional(Id), categoryId: Type.Optional(Id) };
export const RecurrenceFilters = Type.Object(filters, strict);
export const RecurrenceQuery = Type.Object({ ...filters, status: Type.Optional(RecurrenceStatus), limit: Type.Optional(Type.String({ pattern: '^([1-9]|[1-9][0-9]|100)$' })), cursorAt: Type.Optional(Instant), cursorId: Type.Optional(Id) }, strict);
export const RecurrenceParams = Type.Object({ recurrenceId: Id }, strict);
export const RecurrenceEmptyBody = Type.Object({}, strict);
const AccountLink = Type.Object({ id: Id, name: Type.String(), isActive: Type.Boolean() }, strict);
const CategoryLink = Type.Object({ id: Id, name: Type.String(), kind: RecurrenceType, isActive: Type.Boolean() }, strict);
const associations = { account: Type.Union([AccountLink, Type.Null()]), category: Type.Union([CategoryLink, Type.Null()]) };
export const Recurrence = Type.Object({ id: Id, ...editable, currency: Currency, transactionType: RecurrenceType, status: RecurrenceStatus, createdAt: Instant, updatedAt: Instant, archivedAt: nullable(Instant), ...associations, nextOccurrenceDate: nullable(RecurrenceDate), today: RecurrenceDate, timeZone: Type.String() }, strict);
export const RecurrencePage = Type.Object({ items: Type.Array(Recurrence), nextCursor: Type.Union([Type.Object({ createdAt: Instant, id: Id }, strict), Type.Null()]) }, strict);
export const CalendarQuery = Type.Object({ from: RecurrenceDate, to: RecurrenceDate, ...filters }, strict);
export const CalendarEntry = Type.Object({ recurrenceId: Id, occurrenceKey: Type.String(), date: RecurrenceDate, name: Type.String(), transactionType: RecurrenceType, recurrenceKind: RecurrenceKind, amountMinor: Minor, currency: Currency, ...associations }, strict);
export const CalendarTotal = Type.Object({ currency: Currency, incomeMinor: Minor, expenseMinor: Minor, projectedNetMinor: Type.String({ pattern: '^-?(0|[1-9][0-9]*)$' }) }, strict);
export const FinancialCalendar = Type.Object({ from: RecurrenceDate, to: RecurrenceDate, today: RecurrenceDate, timeZone: Type.String(), entries: Type.Array(CalendarEntry), totals: Type.Array(CalendarTotal) }, strict);
export const RadarQuery = Type.Object({ currency: Type.Optional(Currency) }, strict);
export const SubscriptionRadar = Type.Object({ from: RecurrenceDate, to: RecurrenceDate, today: RecurrenceDate, timeZone: Type.String(), subscriptions: Type.Array(Recurrence), entries: Type.Array(CalendarEntry), totals: Type.Array(Type.Object({ currency: Currency, subscriptionCount: Type.Integer({ minimum: 0 }), occurrenceCount: Type.Integer({ minimum: 0 }), amountMinor: Minor }, strict)) }, strict);
export type RecurrenceInput = Static<typeof RecurrenceInput>;
export type RecurrencePatch = Static<typeof RecurrencePatch>;
export type Recurrence = Static<typeof Recurrence>;
export type RecurrenceFilters = Static<typeof RecurrenceFilters>;
export type RecurrenceQuery = Static<typeof RecurrenceQuery>;
export type RecurrencePage = Static<typeof RecurrencePage>;
export type CalendarQuery = Static<typeof CalendarQuery>;
export type CalendarEntry = Static<typeof CalendarEntry>;
export type FinancialCalendar = Static<typeof FinancialCalendar>;
export type RadarQuery = Static<typeof RadarQuery>;
export type SubscriptionRadar = Static<typeof SubscriptionRadar>;
