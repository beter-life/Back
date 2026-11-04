# MDL13 — Financial Reconciliation: architecture decision

Status: implemented and validated locally; the architecture decision below was
recorded before schema changes. Main MDL12
merges and their exact CI runs are SUCCESS: Back2717959 (PR11/run39243412570),
Front64d3bcb (PR13/run39243421590). DEV read-only verification:13 migrations,
latest hash equals canonical0013 SQL; no migration needs repeating.

## Boundaries established by the audit

Statement bytes → temporary parsed rows → explicit MDL12 mapping → selected
Inbox proposals + immutable import receipts → separate MDL11 confirmation →
Finance Core transaction. MDL13 adds evidence and review links, never posting.

- Original statement row: parsed source cells; logically expires after24h.
- Inbox proposal: editable PENDING intent, not a ledger entry; may be discarded.
- Confirmed transaction: Finance Core ledger row, including cancellation state.
- Import receipt: selected row/candidate identity and fingerprint, not all rows
  of an account statement and not an immutable copy of current candidate fields.
- Match suggestion: comparison, not proof and not reconciliation.
- Reconciled movement: explicit owner-confirmed active evidence/transaction link.

Receipts cannot recover expired original amounts/dates from an edited candidate.
No backfill, inferred bank balance, invented coverage or historical reinterpretation.
An absent retained evidence is NOT proof that the bank statement lacks a movement.

## Minimal persistent evidence, explicit retention

New0014 structures: immutable normalized statement evidence, immutable source
occurrences and reconciliation records with one-way audited reversal. Evidence
capture is an explicit user action on selected valid, mapped, unexpired MDL12
preview rows, independent of sending proposals or posting. It uses the existing
normalizer; parsers and old receipts are unchanged. Old expired previews require
user reupload before capture; existing receipts/proposals remain visible as such.

Retain account/currency/operation/exact minor units/instant/normalized description,
fingerprint and hashed source identity; source occurrence keeps batch/row provenance.
Never retain file bytes, raw cells, bank credentials or full statement balances.
This explicitly retained accounting evidence follows the existing retained financial
history lifecycle; the24h temporary-preview policy remains unchanged. UI explains
that capture preserves selected normalized data, not the whole statement, until
an application-wide account/data-erasure policy is provided. No silent retention.

Canonical evidence identity: owner + account/currency/external ID when explicitly
mapped as reliable by MDL12, otherwise owner + account/currency/file hash/row.
Same identity/input reuses evidence; changed input conflicts. Separate immutable
source occurrences retain every captured batch/row, including reimports/aliases.

## Matching, ownership and concurrency

Account/currency/type/exact amount must agree; cancelled transactions cannot be
confirmed. Persistent receipt→candidate→transaction references with compatible
snapshot fields are proven origin links, but still need manual reconciliation.
Other comparisons are suggestions, ambiguous when multiple eligible movements
exist. Description alone never proves a match. Date differences require explicit
acknowledgement; maximum manual date distance31days, suggestions bounded likewise.
Amount/date diagnostics describe candidate pairs, not fabricated bank discrepancies.

Confirmation/reversal uses the existing owner advisory-lock namespace, then row
locks. Partial unique indexes allow one active link per evidence and per ledger
transaction. Owner/command keys provide replay identity; reversal cannot accidentally
undo a later reconciliation. Immutable IDs/payloads/creation metadata, no DELETE;
only one-way reversal timestamp/key may change. Trigger/FKs defend the invariant.
JWT.sub only, compound owner FKs, private app schema, owner SELECT RLS and denied
anon/authenticated writes/EXECUTE. No security-definer shortcuts.

Transfers are displayed as transfers, never converted to income/expense; MDL12
does not preserve supported transfer evidence, so transfer matching is unavailable.
Managed card/debt accounts retain their module/date boundaries. MDL13 performs
no write to Finance Core, Inbox, Imports, Budget, Net Worth, Safe to Spend, Goals,
Recurrences, Cards, Debt or Yield. Later ledger cancellation/edit is shown as an
invalidated match, not silently corrected or marked compatible.

Managed installment and debt interest/fee transactions also remain excluded even
when represented in an otherwise ordinary source account. The card cutoff is
evaluated on each target movement; eligible pre-tracking history is not blocked
just because a later statement date passes the cutoff. Captured source rows keep
their first interpretation: remapping a live preview cannot silently replace it.

## Local validation evidence

Baseline: Back292 unit+196 PostgreSQL17; original exact main CI SUCCESS in both
repositories. Final Backend gates:302 unit and217 disposable PostgreSQL17
integration tests PASS, including real RLS, ownership, atomic rollback, races,
CSV/OFX/PDF evidence capture and complete old-table before/after preservation.
Lint, typecheck, build, OpenAPI, generated Front contract drift, secret scan and
harness PASS. Existing OpenAPI paths/client exports are structurally unchanged.
Synthetic1000-row capture/page/review limits passed; no hosted financial fixtures
or writes. Front278 unit/integration tests and eight new browser cases PASS.
Final full Front browser regression:214 PASS,4 existing skips, zero failures
(desktop/mobile Chromium with tablet widths, themes and keyboard). Tested source:
Back6fa33bfb8477cb259f0df24f6e34229957347f12 and
Frontc1137032c7f37fefa65cbce017eb976598609b37. Final checkpoint commits change
documentation only; exact published-HEAD CI is checked separately in GitHub Actions.

Validation diagnostics retained locally, never shipped: an initial mixed-activity
browser run had two login/bootstrap timeouts; both isolated cases passed without
Auth or timeout changes. A traced diagnostic run was stopped after an old account
heading selector proved ambiguous with the sidebar and a visual inventory timed
out under continuous tracing. Only that test selector was scoped to main content;
the original financial assertions, timeouts, retries and coverage are unchanged.
The normal frozen-source full suite then passed. Four prior conditional skips
remain (before-capture screenshots, mobile sidebar-only and tablet-only cases).

## Contract, UI and reproducible gates

Back TypeBox/OpenAPI → existing generated Zod pipeline → protected Front route
`/finance/reconciliation`, private owner-scoped query cache, V2.3 components.
Bounded keyset pages, strict queries, period<=366days, at most100 evidence captures
per command and50 suggestions per review; truncation is explicit. No external APIs.

Before volume tests: synthetic1000 evidences/transactions; page/review<2500ms,
capture100<5000ms on disposable PostgreSQL17, no unbounded whole-owner scans.
Test real RLS/ownership, replay, races, rollback, immutable history, preview expiry,
reimports, managed boundaries, transfers and all-table before/after isolation.
Preserve prior suites, run OpenAPI/drift/security/harness and full browser gates.
No hosted0014 without separate authorization; DEV human gate remains PENDING.

Operational limits retained: isolated backup restoration NOT_RUN; leaked-password
protection DISABLED_PREEXISTING; no Auth changes. No PR/merge/COMPLETE/MDL14.

References: [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security),
[PostgreSQL locks](https://www.postgresql.org/docs/17/explicit-locking.html),
[existing import retention and receipts](./FINANCIAL_FILE_IMPORT.md).
