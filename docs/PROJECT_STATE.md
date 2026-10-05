# Project state

| Field | Value |
| --- | --- |
| MODULE | MDL 7 — Yield Engine / Rendimentos |
| STATUS | COMPLETE |
| MDL7_STATUS | COMPLETE |
| REAL_GATE | PASS; user approved the real hosted Yield gate on 2026-10-05 |
| READY_FOR_MDL8 | true; both closure branch/PR/main CI and merge commits PASS; MDL8 not started |
| MERGED_TO_MAIN | true; [PR5](https://github.com/beter-life/Back/pull/5), merge commit b04156bc60d95690e4d4ce1719af0d7dd5a3864f; no squash/rebase |
| SCOPE | Versioned Finance Yield API, decimal calculator and private BCB cache |
| BRANCH | main; MDL0–MDL7 integrated, origin/main synchronized |
| BASELINE_MAIN | 35bfdd85d8684510239f69712575c2394a37e225; approved MDL0–MDL6 preserved |
| LAST_TESTED_COMMIT | b04156bc60d95690e4d4ce1719af0d7dd5a3864f; full main CI PASS; final handoff changes documentation only |
| DONE | ZERO/fixed/CDI/Selic/savings, immutable chronological versions, archive/history, gross/net projection, estimated IR/IOF, read-only comparison and per-currency totals |
| CALCULATION | Minor-unit strings; Decimal precision50/output rounding. Historical daily counterfactual composition; savings minimum real balance/complete anniversary. Future CURRENT_RATE, weekday-only BUSINESS_252/no complete holiday calendar |
| LIMITATIONS | Estimates not confirmed gains/tax liability; no tax lots/come-cotas, FX, bank inference, paid source or scheduler. 10-year window,500 profiles/versions each,10000 movements/combined versions |
| DATABASE | Existing Supabase DEV PostgreSQL17/Shared Pooler/TLS verify-full revalidated read-only. All8 migration hashes including0008 intact; no reapplication, hosted writes, new grants or Auth/JWT/JWKS/TLS changes |
| EXISTING_DATA | Closure before/after counts/hashes of all12 earlier tables and schema/policy/grant definitions unchanged; financial isolation test PASS; no remote fixtures |
| OWNERSHIP | JWT.sub only, foreign IDs404, strict TypeBox/OpenAPI/generated Zod, compound FKs/private RLS. Rules immutable, intervals cannot overlap; no public DELETE; market cache backend-controlled |
| TESTS | Back unit184 + disposable PG17 integration/RLS112; Front unit56/integration53/browser80 desktop/mobile PASS; tablet/keyboard. lint/typecheck/build/OpenAPI/contract drift/secret scans/harness PASS |
| BCB | SGS12/4389/11/1178/432/226 configured; deterministic fixtures in CI; CURRENT/STALE/UNAVAILABLE, bounded cache/deduplication, no invented rates |
| CI | [Closure branch](https://github.com/beter-life/Back/actions/runs/37353474357), [PR](https://github.com/beter-life/Back/actions/runs/37354134229), [main](https://github.com/beter-life/Back/actions/runs/37355028160): PASS; documentation handoff runs the unchanged complete workflow |
| CHECKPOINT | checkpoint/mdl7-yield-engine-complete-2026-10-05 targets f013cec547924fa0cbd699231801cae9f052030f, final branch closure commit; prior dev/COMPLETE checkpoints preserved |
| AUTOMATED_GATES | YIELD_MODEL=PASS; PROFILE_VERSIONING=PASS; FIXED_RATE=PASS; CDI=PASS; SELIC=PASS; SAVINGS=PASS; MARKET_RATE_PROVIDER=PASS; BCB_CACHE=PASS; STALE_FALLBACK=PASS; GROSS_PROJECTION=PASS; NET_PROJECTION=PASS; IR_ESTIMATE=PASS; IOF_ESTIMATE=PASS; ACCOUNT_BALANCE_ISOLATION=PASS; NET_WORTH_ISOLATION=PASS; MULTI_CURRENCY=PASS; RLS=PASS; OWNERSHIP=PASS; OPENAPI=PASS |
| HUMAN_GATE | BENCHMARKS=PASS; FIXED_RATE=PASS; RELOAD=PASS; CDI_100=PASS; CDI_115=PASS; PROFILE_VERSIONING=PASS; PROJECTIONS=PASS; IR_IOF=PASS; SAVINGS=PASS; COMPARISON=PASS; ARCHIVE_HISTORY=PASS; MULTI_CURRENCY=PASS; ACCOUNT_BALANCE_ISOLATION=PASS; NET_WORTH_ISOLATION=PASS; OWNERSHIP=PASS |
| BLOCKER | NONE |
| NEXT | Await an explicit MDL8 request; do not create its branch or implement cards/invoices/installments automatically |
