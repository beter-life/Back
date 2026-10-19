import { Type, type Static } from 'typebox';
import { Currency } from './contracts.js';

const strict = { additionalProperties: false };
const Id = Type.String({ format: 'uuid' });
const Instant = Type.String({ format: 'date-time' });
const Positive = Type.String({ pattern: '^[1-9][0-9]*$', maxLength: 19 });
const NullableId = Type.Union([Id, Type.Null()]);
export const InboxStatus = Type.Union([Type.Literal('PENDING'), Type.Literal('CONFIRMED'), Type.Literal('DISCARDED')]);
export const InboxKind = Type.Union([Type.Literal('INCOME'), Type.Literal('EXPENSE')]);
export const InboxSource = Type.Union([Type.Literal('MANUAL'),Type.Literal('FILE_CSV'),Type.Literal('FILE_OFX'),Type.Literal('FILE_PDF')]);
export const InboxDraft = Type.Object({
  description: Type.String({ minLength: 1, maxLength: 500 }),
  type: InboxKind, currency: Currency,
  accountId: NullableId, categoryId: NullableId,
  amountMinor: Type.Union([Positive, Type.Null()]),
  occurredAt: Type.Union([Instant, Type.Null()]),
}, strict);
export const InboxCreate = Type.Object({ ...InboxDraft.properties, idempotencyKey: Id }, strict);
export const InboxEdit = Type.Object({ ...InboxDraft.properties, expectedVersion: Type.Integer({ minimum: 1, maximum: 2147483646 }) }, strict);
export const InboxConfirm = Type.Object({ expectedVersion: Type.Integer({ minimum: 1, maximum: 2147483646 }), acknowledgeDuplicates: Type.Boolean() }, strict);
export const InboxDiscard = Type.Object({ expectedVersion: Type.Integer({ minimum: 1, maximum: 2147483646 }) }, strict);
export const InboxItem = Type.Object({
  ...InboxDraft.properties, id: Id, source: InboxSource, status: InboxStatus,
  version: Type.Integer({ minimum: 1 }), transactionId: NullableId,
  createdAt: Instant, updatedAt: Instant, processedAt: Type.Union([Instant, Type.Null()]),
}, strict);
export const InboxQuery = Type.Object({
  status: Type.Optional(InboxStatus), type: Type.Optional(InboxKind), currency: Type.Optional(Currency),
  limit: Type.Optional(Type.String({ pattern: '^([1-9]|[1-4][0-9]|50)$' })),
  cursorAt: Type.Optional(Instant), cursorId: Type.Optional(Id),
}, strict);
export const InboxPage = Type.Object({ items: Type.Array(InboxItem), nextCursor: Type.Union([Type.Object({ createdAt: Instant, id: Id }, strict), Type.Null()]) }, strict);
export const InboxDuplicate = Type.Object({
  id: Id, source: Type.Union([Type.Literal('CANDIDATE'), Type.Literal('TRANSACTION')]),
  description: Type.String(), amountMinor: Positive, currency: Currency, occurredAt: Instant,
}, strict);
export const InboxIssue = Type.Union([Type.Literal('ACCOUNT_REQUIRED'), Type.Literal('AMOUNT_REQUIRED'), Type.Literal('DATE_REQUIRED'), Type.Literal('ACCOUNT_UNAVAILABLE'), Type.Literal('CATEGORY_UNAVAILABLE'), Type.Literal('MANAGED_ACCOUNT')]);
export const InboxReview = Type.Object({ candidate: InboxItem, issues: Type.Array(InboxIssue), canConfirm: Type.Boolean(), duplicates: Type.Array(InboxDuplicate), duplicatesTruncated: Type.Boolean() }, strict);
export type InboxDraft = Static<typeof InboxDraft>;
export type InboxCreate = Static<typeof InboxCreate>;
export type InboxEdit = Static<typeof InboxEdit>;
export type InboxConfirm = Static<typeof InboxConfirm>;
export type InboxDiscard = Static<typeof InboxDiscard>;
export type InboxItem = Static<typeof InboxItem>;
export type InboxQuery = Static<typeof InboxQuery>;
export type InboxPage = Static<typeof InboxPage>;
export type InboxReview = Static<typeof InboxReview>;
export type InboxDuplicate = Static<typeof InboxDuplicate>;
export type InboxIssue = Static<typeof InboxIssue>;
