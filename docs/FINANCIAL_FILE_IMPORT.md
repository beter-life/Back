# MDL12 - Financial File Import

MDL12_STATUS=REAL_GATE_PASS_PENDING_MERGE; REAL_GATE=PASS; MDL12_HUMAN_GATE=PASS;
MDL12_HUMAN_TESTS=9/9; MIGRATION_0013_DEV=PASS; DRIZZLE_MIGRATIONS=13/13;
READY_FOR_MDL13=false. The user reported all nine human scenarios PASS on2026-10-16.
Closure prepares two PRs; merging requires separate explicit authorization.

## Baseline and boundary

MDL11 is merged: Back `0b039738287b10c94ac3ae1074bbb495852f81bc`, PR10,
[CI38888458337 PASS](https://github.com/beter-life/Back/actions/runs/38888458337);
Front `ce0d7322a36e45240fb4e726bf1fef43ea47fd7c`, PR12,
[CI38896972365 PASS](https://github.com/beter-life/Front/actions/runs/38896972365).
Both local mains fast-forwarded cleanly; ignored env files preserved byte-for-byte.

File -> bounded parser -> explicit mapping/format/account -> preview -> selected
valid rows -> PENDING Inbox proposals -> separate existing MDL11 confirmation ->
unchanged Finance Core. Import never calls the posting primitive. No MDL13,
rebranding, external AI/OCR or paid integrations. The agent created no hosted
financial fixtures or uploads; human gate results are attributed to the user.

## Architecture decisions

Two private tables store batch metadata/temporary parsed cells and immutable row
receipts. Original file bytes are not persisted. Preview cells expire after24h;
expired data is scrubbed on access/new analysis. Minimal receipts, hashes and Inbox
references remain for history and retry identity. Same-file analysis is owner/hash
idempotent; upload keys cannot be reused for different bytes. Mapping freezes after
the first imported row. Reupload can replenish an expired preview without reposting
its receipts. Limits:200 batches per owner,10 live previews,20MiB parsed payload per
owner,4MiB per preview. Reaching quota fails explicitly rather than dropping history.

Selection is versioned, at most100 rows per command. It takes the existing Inbox
owner advisory lock before batch/account locks. Pending candidate creation and row
receipts commit in the same transaction; retries consult immutable receipts.
External IDs explicitly mapped as unique per account use an account/currency/ID
identity. Matching identity with divergent normalized input is blocked; identical
identity reuses the original candidate. Same value/date without a stable ID is only
a possible match, including repeated rows and existing ledger/pending proposals.
Explicit duplicate acknowledgement allows legitimate repeats. MDL11 also rechecks
its own duplicate warnings at financial confirmation.

Migration0013 extends the source CHECK to FILE_CSV/FILE_OFX/FILE_PDF and adds the
compound identity key required by receipt owner FKs. It preserves MANUAL rows,
terminal trigger, posting logic and historical0001-0012 SQL. No new ledger.
JWT.sub ownership, own SELECT RLS, backend-only writes, private schema and restricted
functions follow MDL11. Migration0013 was separately authorized and applied only to
Supabase `beter-life-dev` on2026-10-16, using the official project Drizzle migrator
and SQL from `d262b26adc4ce843d09474f0ac67a403d025d3ee`. Ledger13/13, zero pending;
historical0001–0012 SQL and ledger entries remain exact. Deployment and closure do
not modify existing financial records, Production, TLS/Auth/JWT/JWKS settings,
certificates or env. User-selected financial confirmations belong to the human gate.

Preflight confirmed PostgreSQL17, certificate/hostname verification,12/12 ledger
hashes, one pending migration, Inbox compatibility and an exact25-table baseline
against disposable PG17. Before execution, a consistent snapshot-backed pg_dump17
of `app` and `drizzle` was encrypted with AES-256-GCM, with its key protected by
Windows DPAPI CurrentUser and a restricted directory ACL. Manifest/HMAC, decrypted
archive hash, complete TOC and full pg_restore read passed; no restore was run.
This integrity check is **not a restoration test**. Managed Supabase Auth/Storage,
roles and platform configuration are outside this application-scoped archive.
Keep the ignored `.harness/tmp/mdl12-dev-deployment/backup-verified/` directory;
`RECOVERY.md` documents scope, recovery, and the same-Windows-profile/machine key
requirement. Do not clean it as ordinary temporary harness output.

Post-migration DDL matched the expected two-table reference exactly: constraints,
indexes, RLS, owner-only SELECT policies, denied anon/authenticated writes, guard
function and triggers. All25 existing tables retained counts and sorted row
SHA-256 digests; both new tables were empty at the deployment check before the
human gate, with zero financial records changed by the migration.
Existing MANUAL and all three FILE sources pass the reviewed Inbox constraint.
Auth database functions and877 DDL objects outside app/drizzle were unchanged.
Expected DDL differences and unexpected differences (none) are recorded separately
in ignored `.harness/tmp/mdl12-dev-deployment/` evidence. No manual alternative DDL
was executed; canonical LF Git SQL was staged verbatim for the official migrator
to preserve Drizzle hashes despite Windows checkout line endings.

## Parsing and normalization

CSV has a header, comma/semicolon, quoted delimiters/newlines, reordered columns,
UTF-8/BOM or explicitly selected Windows-1252. Explicit date (ISO/DMY/MDY) and
number (BR/INT) formats are required before normalization. Header mapping is by
column index; optional type/currency/external ID columns are never invented.
Signed numbers become exact BIGINT minor units using Core currency exponents and
bounds. A nonnegative amount without type/sign certainty is blocked where needed;
type/sign disagreement, unknown operation types, invalid dates, totals/balances,
currency mismatch and truncated descriptions are blocked, never silently coerced.
Date-only rows use noon in the owner's profile timezone, avoiding midnight DST
gaps; explicit OFX offsets are honored. Nonexistent/ambiguous local times fail.

OFX scope: one bank STMTRS, OFX1.x SGML with optional leaf closings, or OFX2 XML.
Retain FITID identity, memo/name, date/offset, signed amount, CURDEF and masked
account hint. Credit-card/investment statements, transfers and unknown semantics
and correction/delete records are unsupported. Safe debit/credit bank operation allowlist is documented in code.
DTD/entity declarations and excessive XML nesting are refused; entity expansion
is disabled. Fixed schemas and sign consistency prevent transfer/yield guessing.

PDF scope: extractable digital text with EXTRATO, MOEDA: CODE, and DATA DESCRICAO
VALOR header; rows use DD/MM/YYYY, description and explicitly signed BR amount.
This is a documented simple statement layout, not universal bank PDF support.
Scans/no text, encrypted PDFs, unknown structure and ambiguous lines are reported.
All currency declarations must use the exact supported header and agree across
pages; mixed or ambiguous currency declarations reject the entire PDF.
No OCR or document scripts are executed.

All parsers run in bounded Node workers (application isolation, not development
agents):2MiB file,1000 rows,32 columns,8192-character records,10 PDF pages,
bounded extracted text,128MiB worker heap,5-second deadline, at most2 active workers.
No user paths, subprocess commands, network document fetch, raw content/error logs,
public buckets or automatic ledger writes. All API DTOs are TypeBox -> OpenAPI ->
official generated Front Zod.

## Dependencies and primary references

Pinned csv-parse7.0.3 (MIT), fast-xml-parser5.11.2 (MIT), pdfjs-dist6.4.299
(Apache-2.0) avoid bespoke CSV/XML/PDF engines. Registry engines support Node24.
The PDF parser receives bytes only, disables XFA/font/network fetch options,
and is isolated even though PDF.js itself uses its Node fake-worker path.
The heap cap covers V8 allocations, not total operating-system RSS. Excess parallel
work returns a transient429 without retaining an unsupported-file result.
[CSV limits](https://csv.js.org/parse/options/max_record_size/),
[XML entity advisory](https://github.com/NaturalIntelligence/fast-xml-parser/security/advisories/GHSA-m7jm-9gc2-mpf2),
[PDF.js API](https://mozilla.github.io/pdf.js/api/draft/module-pdfjsLib.html),
[RLS](https://supabase.com/docs/guides/database/postgres/row-level-security).
Supabase changelog reviewed2026-10-16: the announced CBC cipher removal affects
old HTTP clients, not direct Postgres/pooler connections; no TLS change is needed.
[Official notice](https://supabase.com/changelog/cbc-tls-ciphers-deprecated).

## Verification and delivery

TDD parser/domain cases precede implementation. Synthetic-only fixtures cover
CSV/SGML/XML/PDF, exact currencies, timezone, ambiguous/hostile inputs and caps.
Real disposable PG17 covers0001-0013, ownership/RLS, immutable receipts, replay,
concurrency, forced rollback, preserved MANUAL candidates and unchanged financial
tables until an explicit ordinary MDL11 confirmation. Reproducible volume target:
1000-row analysis<5s,50-row preview<2.5s,100-row selection<5s on local PG17;
these are regression bounds, not hosted-load certification.
The user reported the hosted human gate9/9 PASS. Closure reruns the full Back/Front
suites and verifies CI on each actual final branch and PR HEAD. No COMPLETE
checkpoint, MDL12 merge or MDL13 is authorized. The Front guide preserves the nine
ordered scenarios and synthetic examples. This closure makes no Supabase DEV
operations and does not rerun migration0013.

Initial implementation verification2026-10-16:292 unit,196 PostgreSQL17 integration, lint,
typecheck, build (including compiled JavaScript PDF worker smoke), official OpenAPI,
both generated Zod drift checks, secret scan, production dependency audit and
harness PASS. Historical0001–0012 SQL and local env files are unchanged.
The heap restriction is not an OS security sandbox; browser/device accessibility
and hosted-load certification remain outside these automated checks.

Deployment smoke checks: Back live/ready200, public JWKS200, CORS and missing/invalid
token401; Auth signature/claim/JWKS regression passed. Fresh anonymous desktop and
mobile browsers loaded the protected import URL and Auth V2 login without uncaught
JavaScript errors. The user subsequently reported all nine human scenarios PASS.
No real-account session or financial posting was exercised automatically.

Supabase security advisors after deployment: no error finding. Existing
`financial_market_rates` has RLS without client SELECT policies by design (the
unchanged baseline denies direct client access). Auth reports
[leaked-password protection disabled](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).
This existing Auth setting was preserved; changing it is outside the0013
authorization. It is not a new migration DDL difference.


## Preview expiration evidence and limits

The PostgreSQL integration test [expires raw preview after 24h while keeping
receipts, replay and recovery without duplication](../tests/integration/import.test.ts#L88)
advances the injected clock by86400001ms. It checks EXPIRED, empty cells/no draft,
parsed=NULL, parsed_bytes=0, preserved receipt/candidate identity, replay of the
same candidate and recovery of the same batch without duplicate proposals. This
is actual automated database coverage, not a mock of the repository. The existing
Front integration and Playwright tests cover presentation of an expired preview
using a controlled HTTP boundary; they do not independently measure the24h clock.

Expiry is logical at24h. Physical cleanup is triggered on subsequent owner access
(preview/history/mapping) or new analysis; there is no background cleanup scheduler.
No separate24h wall-clock DEV wait or deletion precisely at the deadline has been
observed or claimed. That operational observation remains unperformed, separately
from the user's reported9/9 human gate and the controlled-clock automated PASS.
No extra hosted tests were run for closure.

## Operational limits and follow-up

- PDF supports only the documented extractable digital layout; scans, arbitrary
  bank layouts and password-protected files are unsupported. OCR is not implemented.
- CSV and bank OFX SGML/XML support only the documented encodings, structures and
  transaction semantics. File import is not complete bank reconciliation and does
  not reconcile statement totals, balances or all bank transaction classes.
- The encrypted app+Drizzle backup was decrypted and read successfully; recovery
  has not been proven by restoring and validating an isolated database. It excludes
  managed Supabase Auth/Storage/roles and its DPAPI key depends on this Windows
  profile/machine. A restore exercise remains pending; never call it restore-tested.
- Leaked-password protection was already disabled at the deployment advisor check.
  It remains an operational security follow-up, with no Auth setting change here.
- Browser coverage uses Chromium desktop/mobile emulation and selected widths,
  themes and keyboard interactions. It does not certify every physical device,
  Safari/Firefox, assistive technology, screen reader or full WCAG compliance.
- Load bounds are local regression targets; hosted-load certification and deletion
  exactly at24h without later owner access are not proven.

Final commit hashes and links to branch and pull-request CI runs belong to the PR
descriptions and delivery record, after new closure commits are published. Initial
deployment HEADs are provenance and are not reused as final-head evidence.
