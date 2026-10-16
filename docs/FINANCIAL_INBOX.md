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

DEV migration0012 was explicitly authorized and applied once on2026-10-15 using
the official `db:migrate` script, with SQL matching commit
`d809ffa20bd0e18b0e895b5b46137f8603b6715b`. Drizzle12/12, no pending migrations;
new table empty,8 constraints/7 indexes/function/trigger/RLS/restricted grants
verified. The24 pre-existing app tables retain identical row counts/hashes and
structure; existing app functions and historical ledger rows are unchanged.
TLS verify-full, CA and hostname verification passed. A consistent app+drizzle
pg_dump17 recovery archive is retained locally, outside Git, encrypted with
Windows DPAPI CurrentUser and a restricted ACL. Decryption and archive contents
were verified; a restoration drill was not performed. It is an app/Drizzle
recovery point, not a full Supabase/Auth/Storage backup or managed PITR.
Local health live/ready200 and Inbox JWT guard401 were verified. A valid-session
Inbox read was reserved for an explicitly chosen human test account;
no automatic signup/login, financial fixtures, final PR or merge were performed.

The user subsequently approved the real MDL11 human gate:7/7 PASS, including the
final linked-card identification/UX fix and page/sidebar floating scrollbars.
Cards (including archived cards) are identified by their official accountId, not
names or credit account type. This UI correction does not change backend code,
ledger rules, RLS, migrations or the date-sensitive MANAGED_ACCOUNT condition.
Fresh Back regression passed260 unit and181 disposable PostgreSQL17 integration
tests, lint/typecheck/OpenAPI/contract drift/build. No hosted database requests or
financial writes were made for this correction. No COMPLETE checkpoint or merge.

## Promotion status

`MDL11_HUMAN_GATE=PASS`, `MDL11_HUMAN_TESTS=7/7`,
`CARD_ACCOUNT_UX_FIX=PASS`, `FINANCIAL_BEHAVIOR_UNCHANGED=PASS`,
`REGRESSION_FRONT=PASS`, `REGRESSION_BACK=PASS`, `SCROLLBARS=INCLUDED`.
Finance Core is preserved. The authorized DEV deployment remains migration0012,
Drizzle12/12; this documentary closure performs no hosted database operations.

`STATUS=REAL_GATE_PASS_PENDING_MERGE`, `READY_FOR_MDL12=false`.
Documentary commits and separate Back/Front PRs to main are authorized. Verify
their exact HEAD checks and conflicts, then request explicit user promotion
approval. No automatic merge, premature merged flag or COMPLETE checkpoint.
The existing DEV checkpoint and Beter Life branding remain unchanged.

Pre-closure exact HEAD CI: [Back dd17779 PASS](https://github.com/beter-life/Back/actions/runs/38770011019)
and [Front b9a03fc PASS](https://github.com/beter-life/Front/actions/runs/38773621856).
New documentary HEAD/PR checks remain required. Known limits: manual candidates
only; duplicate hints are bounded heuristics rather than ingestion/reconciliation;
Front browser coverage uses Chromium/emulated devices with documented skips.
No CSV/OFX/PDF, email ingestion, AI, voice or MDL12 is included.
