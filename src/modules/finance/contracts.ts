import { Type, type Static } from 'typebox';

const strict = { additionalProperties: false };
const Id = Type.String({ format: 'uuid' });
const DateTime = Type.String({ format: 'date-time' });
const Text = Type.String({ minLength: 1, maxLength: 100 });
const Minor = Type.String({
  pattern: '^-?(0|[1-9][0-9]*)$',
  maxLength: 20,
  description: 'Exact integer minor units, serialized as a decimal string. Never a JSON number.',
});
const Positive = Type.String({ pattern: '^[1-9][0-9]*$', maxLength: 19 });
const AggregateMinor = Type.String({
  pattern: '^-?(0|[1-9][0-9]*)$',
  description: 'Exact aggregated minor units; sum may exceed a single BIGINT.',
});
export const Currency = Type.Union([
  Type.Literal('BRL'),
  Type.Literal('USD'),
  Type.Literal('EUR'),
  Type.Literal('GBP'),
  Type.Literal('CAD'),
  Type.Literal('AUD'),
  Type.Literal('CHF'),
  Type.Literal('JPY'),
  Type.Literal('CLP'),
  Type.Literal('KRW'),
  Type.Literal('KWD'),
  Type.Literal('BHD'),
]);
const AccountType = Type.Union([
  Type.Literal('checking'),
  Type.Literal('savings'),
  Type.Literal('cash'),
  Type.Literal('credit'),
  Type.Literal('investment'),
  Type.Literal('other'),
]);
const Kind = Type.Union([Type.Literal('INCOME'), Type.Literal('EXPENSE')]);
const Metadata = { id: Id, createdAt: DateTime, updatedAt: DateTime };
export const AccountInput = Type.Object(
  { name: Text, type: AccountType, currency: Currency, initialBalanceMinor: Minor },
  strict,
);
export const AccountPatch = Type.Object(
  {
    name: Type.Optional(Text),
    type: Type.Optional(AccountType),
    isActive: Type.Optional(Type.Boolean()),
  },
  { ...strict, minProperties: 1 },
);
export const Account = Type.Object(
  {
    ...Metadata,
    ...AccountInput.properties,
    isActive: Type.Boolean(),
    balanceMinor: AggregateMinor,
  },
  strict,
);
export const CategoryInput = Type.Object({ name: Text, kind: Kind }, strict);
export const CategoryPatch = Type.Object(
  { name: Type.Optional(Text), isActive: Type.Optional(Type.Boolean()) },
  { ...strict, minProperties: 1 },
);
export const Category = Type.Object(
  { ...Metadata, ...CategoryInput.properties, isActive: Type.Boolean() },
  strict,
);
export const TransactionInput = Type.Object(
  {
    accountId: Id,
    categoryId: Type.Optional(Id),
    type: Kind,
    amountMinor: Positive,
    currency: Currency,
    description: Type.String({ maxLength: 500 }),
    occurredAt: DateTime,
  },
  strict,
);
export const TransactionPatch = Type.Object(
  {
    description: Type.Optional(Type.String({ maxLength: 500 })),
    isCancelled: Type.Optional(Type.Literal(true)),
  },
  { ...strict, minProperties: 1 },
);
export const TransferInput = Type.Object(
  {
    sourceAccountId: Id,
    destinationAccountId: Id,
    amountMinor: Positive,
    currency: Currency,
    description: Type.String({ maxLength: 500 }),
    occurredAt: DateTime,
    idempotencyKey: Id,
  },
  strict,
);
export const TransferPatch = Type.Object({ isCancelled: Type.Literal(true) }, strict);
export const Transfer = Type.Object(
  { ...Metadata, ...TransferInput.properties, isCancelled: Type.Boolean() },
  strict,
);
export const Transaction = Type.Object(
  {
    ...Metadata,
    accountId: Id,
    destinationAccountId: Type.Union([Id, Type.Null()]),
    categoryId: Type.Union([Id, Type.Null()]),
    type: Type.Union([Kind, Type.Literal('TRANSFER')]),
    amountMinor: Positive,
    currency: Currency,
    description: Type.String(),
    occurredAt: DateTime,
    isCancelled: Type.Boolean(),
  },
  strict,
);
export const TransactionQuery = Type.Object(
  {
    accountId: Type.Optional(Id),
    categoryId: Type.Optional(Id),
    type: Type.Optional(Type.Union([Kind, Type.Literal('TRANSFER')])),
    from: Type.Optional(DateTime),
    to: Type.Optional(DateTime),
    limit: Type.Optional(Type.String({ pattern: '^([1-9]|[1-4][0-9]|50)$' })),
    cursorAt: Type.Optional(DateTime),
    cursorId: Type.Optional(Id),
  },
  strict,
);
export const SummaryQuery = Type.Object({ from: DateTime, to: DateTime }, strict);
export const Summary = Type.Object(
  {
    from: DateTime,
    to: DateTime,
    currencies: Type.Array(
      Type.Object(
        {
          currency: Currency,
          totalBalanceMinor: AggregateMinor,
          incomeMinor: AggregateMinor,
          expenseMinor: AggregateMinor,
          netMinor: AggregateMinor,
        },
        strict,
      ),
    ),
  },
  strict,
);
export const TransactionPage = Type.Object(
  {
    items: Type.Array(Transaction),
    nextCursor: Type.Union([Type.Object({ occurredAt: DateTime, id: Id }, strict), Type.Null()]),
  },
  strict,
);
export const IdParams = Type.Object({ id: Id }, strict);
export type AccountInput = Static<typeof AccountInput>;
export type AccountPatch = Static<typeof AccountPatch>;
export type Account = Static<typeof Account>;
export type CategoryInput = Static<typeof CategoryInput>;
export type CategoryPatch = Static<typeof CategoryPatch>;
export type Category = Static<typeof Category>;
export type TransactionInput = Static<typeof TransactionInput>;
export type TransactionPatch = Static<typeof TransactionPatch>;
export type Transaction = Static<typeof Transaction>;
export type TransferInput = Static<typeof TransferInput>;
export type Transfer = Static<typeof Transfer>;
export type TransferPatch = Static<typeof TransferPatch>;
export type TransactionQuery = Static<typeof TransactionQuery>;
export type TransactionPage = Static<typeof TransactionPage>;
export type Summary = Static<typeof Summary>;
