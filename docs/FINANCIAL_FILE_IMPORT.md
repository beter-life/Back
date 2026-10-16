# MDL12 - Financial File Import

## Baseline and boundary

MDL11 is merged: Back `0b039738287b10c94ac3ae1074bbb495852f81bc`, PR10,
[CI38888458337 PASS](https://github.com/beter-life/Back/actions/runs/38888458337);
Front `ce0d7322a36e45240fb4e726bf1fef43ea47fd7c`, PR12,
[CI38896972365 PASS](https://github.com/beter-life/Front/actions/runs/38896972365).
Both local mains fast-forwarded cleanly; ignored env files preserved byte-for-byte.

File -> bounded parser -> explicit mapping/format/account -> preview -> selected
valid rows -> PENDING Inbox proposals -> separate existing MDL11 confirmation ->
unchanged Finance Core. Import never calls the posting primitive. No MDL13,
rebranding, external AI/OCR, hosted uploads or paid integrations.

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
functions follow MDL11. DEV migration is **not authorized**; local disposable PG17
only. Production/DEV database, TLS, Auth, JWT/JWKS, certificates and env are untouched.

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
Full Back/Front official suites and exact published HEAD CIs are required. DEV
checkpoint only after local gates. No COMPLETE, MDL12 merge or MDL13. Hosted gate
remains pending separate migration authorization. The Front branch includes
the human gate and synthetic CSV/OFX/PDF examples in docs/FINANCIAL_FILE_IMPORT.md.

Local verification2026-10-16:291 unit,196 PostgreSQL17 integration, lint,
typecheck, build (including compiled JavaScript PDF worker smoke), official OpenAPI,
both generated Zod drift checks, secret scan, production dependency audit and
harness PASS. Historical0001–0012 SQL and local env files are unchanged.
The heap restriction is not an OS security sandbox; browser/device accessibility
and hosted-load certification remain outside these automated checks.
