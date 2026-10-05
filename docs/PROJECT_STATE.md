# Project state

| Field | Value |
| --- | --- |
| MODULE | MDL 7 — Yield Engine / Rendimentos |
| STATUS | COMPLETE |
| MDL7_STATUS | COMPLETE |
| REAL_GATE | PASS; user approved the real hosted Yield gate on 2026-10-05 |
| READY_FOR_MDL8 | false; release only after closure branch/PR/main CI and both merge commits PASS |
| MERGED_TO_MAIN | false; authorized closure workflow pending |
| SCOPE | Versioned Finance Yield API, decimal calculator and private BCB cache |
| BRANCH | codex/mdl7-yield-engine |
| BASELINE_MAIN | 35bfdd85d8684510239f69712575c2394a37e225; approved MDL0–MDL6 preserved |
| LAST_TESTED_COMMIT | ddd1d96a6b6c3abc387042fe16a02ce71fdccbbe; full local final regression PASS; closure changes documentation only |
| DONE | ZERO/fixed/CDI/Selic/savings, immutable chronological versions, archive/history, gross/net projection, estimated IR/IOF, read-only comparison and per-currency totals |
| CALCULATION | Minor-unit strings; Decimal precision50/output rounding. Historical daily counterfactual composition; savings minimum real balance/complete anniversary. Future CURRENT_RATE, weekday-only BUSINESS_252/no complete holiday calendar |
| LIMITATIONS | Estimates not confirmed gains/tax liability; no tax lots/come-cotas, FX, bank inference, paid source or scheduler. 10-year window,500 profiles/versions each,10000 movements/combined versions |
| DATABASE | Existing Supabase DEV PostgreSQL17/Shared Pooler/TLS verify-full revalidated read-only. All8 migration hashes including0008 intact; no reapplication, hosted writes, new grants or Auth/JWT/JWKS/TLS changes |
| EXISTING_DATA | Closure before/after counts/hashes of all12 earlier tables and schema/policy/grant definitions unchanged; financial isolation test PASS; no remote fixtures |
| OWNERSHIP | JWT.sub only, foreign IDs404, strict TypeBox/OpenAPI/generated Zod, compound FKs/private RLS. Rules immutable, intervals cannot overlap; no public DELETE; market cache backend-controlled |
| TESTS | Back unit184 + disposable PG17 integration/RLS112; Front unit56/integration53/browser80 desktop/mobile PASS; tablet/keyboard. lint/typecheck/build/OpenAPI/contract drift/secret scans/harness PASS |
| BCB | SGS12/4389/11/1178/432/226 configured; deterministic fixtures in CI; CURRENT/STALE/UNAVAILABLE, bounded cache/deduplication, no invented rates |
| CI | [Previous exact branch workflow](https://github.com/beter-life/Back/actions/runs/37344818844) PASS; closure branch/PR/main checks still required |
| CHECKPOINT | checkpoint/mdl7-yield-engine-complete-2026-10-05 targets final branch closure commit; prior dev/COMPLETE checkpoints preserved |
| AUTOMATED_GATES | YIELD_MODEL=PASS; PROFILE_VERSIONING=PASS; FIXED_RATE=PASS; CDI=PASS; SELIC=PASS; SAVINGS=PASS; MARKET_RATE_PROVIDER=PASS; BCB_CACHE=PASS; STALE_FALLBACK=PASS; GROSS_PROJECTION=PASS; NET_PROJECTION=PASS; IR_ESTIMATE=PASS; IOF_ESTIMATE=PASS; ACCOUNT_BALANCE_ISOLATION=PASS; NET_WORTH_ISOLATION=PASS; MULTI_CURRENCY=PASS; RLS=PASS; OWNERSHIP=PASS; OPENAPI=PASS |
| HUMAN_GATE | BENCHMARKS=PASS; FIXED_RATE=PASS; RELOAD=PASS; CDI_100=PASS; CDI_115=PASS; PROFILE_VERSIONING=PASS; PROJECTIONS=PASS; IR_IOF=PASS; SAVINGS=PASS; COMPARISON=PASS; ARCHIVE_HISTORY=PASS; MULTI_CURRENCY=PASS; ACCOUNT_BALANCE_ISOLATION=PASS; NET_WORTH_ISOLATION=PASS; OWNERSHIP=PASS |
| BLOCKER | NONE |
| NEXT | Publish closure, await branch CI, PR to main, PR CI, merge commit and main CI. Do not start MDL8; await a separate request after stable main |
