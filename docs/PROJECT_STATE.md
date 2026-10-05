# Project state

| Field | Value |
| --- | --- |
| MODULE | MDL 7 — Yield Engine / Rendimentos |
| STATUS | AWAITING_REAL_GATE |
| MDL7_STATUS | AWAITING_REAL_GATE |
| REAL_GATE | PENDING |
| READY_FOR_MDL8 | false |
| SCOPE | Versioned Finance Yield API, decimal calculator and private BCB cache |
| BRANCH | codex/mdl7-yield-engine; published; no PR/merge |
| BASELINE_MAIN | 35bfdd85d8684510239f69712575c2394a37e225; approved MDL0–MDL6, main CI PASS |
| LAST_TESTED_COMMIT | 00196ff74c4a68a8bd70604784f962ae1c13c7be; complete branch CI PASS; final handoff changes documentation only |
| DONE | ZERO/fixed/CDI/Selic/savings, immutable chronological versions, archive/history, gross/net projection, estimated IR/IOF, comparison and per-currency totals |
| CALCULATION | Minor-unit strings; Decimal precision50, output-only rounding. Historical daily counterfactual composition; savings minimum real balance/complete anniversary. Future CURRENT_RATE, weekday-only BUSINESS_252, no complete holiday calendar |
| LIMITATIONS | Estimates are not confirmed gains/tax liability; no tax lots/come-cotas, FX, bank inference, paid source or scheduler. 10-year window,500 profiles/versions each,10000 movements/combined versions; explicit limits |
| OWNERSHIP | JWT.sub only, foreign IDs404, strict TypeBox/OpenAPI/generated Zod, compound FKs, private RLS. No public DELETE/market cache policies or new Data API grants |
| DATABASE | Reviewed generated 0008 applied to existing Supabase DEV only after disposable PG17/RLS PASS. Hosted PostgreSQL17, Shared Pooler Session, TLS verify-full authorized; old migrations/Auth/JWT/TLS unchanged |
| EXISTING_DATA | Exact row counts/hashes and schema/policy/grant definitions of all12 earlier tables unchanged before/after migration; no hosted user/financial fixtures |
| BCB | Official live6-series smoke PASS and persisted public cache. CURRENT/STALE/UNAVAILABLE, bounded requests and deduplication; CI uses frozen fixtures, never live BCB |
| ISOLATION | Estimates never write accounts/ledger/net worth/budgets/goals/recurrences; historical/forward gains exist only in memory |
| TESTS | Back unit184 + disposable PG17 integration/RLS112; Front unit56/integration53/browser80 desktop/mobile PASS; tablet/keyboard/visual checks. lint/typecheck/build, OpenAPI/contract drift, secret scans and harness PASS |
| TEST_LIMITS | Synthetic identity/disposable PostgreSQL and real SDK with intercepted external boundaries; hosted human Yield gate still PENDING |
| LOCAL | Back http://localhost:3001 live200/ready200 on hosted DB; NODE_USE_SYSTEM_CA=1. Front http://localhost:3101/finance/yield responds200; real login required |
| CI | [Feature workflow](https://github.com/beter-life/Back/actions/runs/37344197806) PASS; documentation-only handoff retains the complete branch workflow |
| CHECKPOINT | checkpoint/mdl7-yield-engine-dev-2026-10-05; development only, earlier checkpoints preserved |
| BLOCKER | NONE |
| NEXT | Human gate at /finance/yield per YIELD_ENGINE.md: configure/reload/version/compare/history/savings/isolation. Await explicit approval; no COMPLETE/PR/merge or MDL8 |
