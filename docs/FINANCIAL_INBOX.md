# MDL11 — Financial Ingestion Hub + Financial Inbox

## Boundary and lifecycle

Manual proposal → PENDING → review/edit → CONFIRMED or DISCARDED.
Only confirmation calls the Finance Core posting primitive. Pending/discarded
rows are never included in balances, Budget, Net Worth or Safe to Spend.
This module handles INCOME/EXPENSE only; transfers, managed card purchases,
managed debt payments and external ingestion retain their existing boundaries.

## Storage and contract

Incremental migration `0012_financial_inbox` adds one private table
`app.financial_inbox_candidates`. JWT.sub supplies ownership. Optional account,
category, amount and date allow incomplete proposals; confirmation requires a
valid account, positive exact minor units, currency and instant. Category may
remain unclassified, matching the existing Finance Core contract.
Compound owner/currency/kind FKs, a unique owner/creation key, a unique posted
transaction reference and terminal-state constraints protect integrity.
Own SELECT RLS is defense in depth; no client writes or DELETE policy/grants.

TypeBox is the source of truth; the existing generator produces Front Zod types.
API: GET/POST `/api/v1/finance/inbox`, GET/PATCH `/:id`, POST `/:id/confirm`,
POST `/:id/discard`. List is bounded/keyset-paginated, with status/type/currency
filters. Detail is a review read model including missing fields and duplicate
warnings; the browser does not implement posting rules.

## Concurrency and duplicates

Creation uses a UUID idempotency key and a canonical input fingerprint. Identical
replays return the same candidate; a changed creation payload returns 409.
Edits/discard carry expectedVersion; stale requests return 409. Terminal rows
cannot be edited or reopened. Confirmation of an already confirmed candidate
returns its original transaction reference, even after a lost response/retry.

Inbox mutations acquire one transaction-scoped advisory lock per owner before
locking the candidate. Confirmation revalidates current account/category state,
calls the shared Finance Core primitive, then links/marks the candidate in the
same SQL transaction. Failure at either write rolls everything back.
No network calls occur while locks are held. Account locks remain ordered.
See [PostgreSQL 17 locks](https://www.postgresql.org/docs/17/explicit-locking.html).

Duplicate hints compare the same owner, account, type, currency and amount within
24 hours on either side, against uncancelled ledger rows and pending candidates.
Each source returns at most 10 matches with a truncation indicator. These are
possible duplicates, not automatic reconciliation. Explicit acknowledgement is
required to confirm when a match exists; legitimate repeated purchases remain
possible. Confirmation rechecks hints under the owner lock. Simultaneous generic
Finance Core writes can appear after review; the guarantee of exactly one posting
applies to each candidate, not to unrelated commands entered independently.

## Delivery gate

Validate empty PostgreSQL17 with migrations 0001–0012, real RLS/ownership,
concurrent retries, stale edit/confirm races, forced rollback after ledger insert,
financial isolation and bounded performance using synthetic fixtures only.
Hosted migration requires separate authorization after local gates; no hosted
financial writes are part of development validation. No MDL12 work is included.
