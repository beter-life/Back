# Project state

| Field | Value |
| --- | --- |
| MODULE | MDL 7 — Yield Engine / Rendimentos |
| STATUS | IN_PROGRESS |
| MDL7_STATUS | IN_PROGRESS |
| REAL_GATE | PENDING |
| READY_FOR_MDL8 | false |
| SCOPE | Versioned Yield API, decimal calculator, private BCB cache and RLS |
| BRANCH | codex/mdl7-yield-engine; no PR/merge |
| BASELINE_MAIN | 35bfdd85d8684510239f69712575c2394a37e225; approved MDL0–MDL6; exact main CI PASS |
| LAST_TESTED_COMMIT | 35bfdd85d8684510239f69712575c2394a37e225; new working-tree MDL7 automated tests passed, not yet committed |
| DONE | ZERO/fixed/CDI/Selic/savings, chronological immutable versions, history, projection, comparison, estimated IR/IOF, archive and per-currency totals |
| MONEY | Integer minor-unit strings; normalized decimal rates; Decimal precision50, output rounding only. No FX |
| ASSUMPTIONS | CURRENT_RATE future, BUSINESS_252 weekdays without complete holiday calendar; historical daily counterfactual composition, savings minimum real balance/complete anniversary; taxes estimated without lots |
| OWNERSHIP | JWT.sub only, foreign IDs404, strict generated DTO, compound FKs, private RLS; no public DELETE or market cache policies |
| DATABASE | Reviewed generated 0008; disposable PG17/RLS PASS. Hosted application still pending; previous migrations/Auth/TLS unchanged |
| ISOLATION | Calculator never writes ledger/net worth/budgets/goals/recurrences; all twelve earlier table hashes unchanged in disposable integration |
| TESTS | Back unit184/integration110; Front unit56/integration53/browser80 desktop/mobile PASS. Additional direct RLS/NULL proofs running. lint/typecheck/build/OpenAPI PASS; final scans/harness/CI pending |
| LIMITS | 10 years/window; 500 profiles/versions per profile,10000 movements/combined versions; BCB bounded body/window/timeout and cached STALE/UNAVAILABLE |
| LOCAL | Back3001/Front3101; final build restart and hosted readiness pending |
| CI | MDL7 not yet published |
| CHECKPOINT | Pending final development checkpoint; preserve earlier tags |
| BLOCKER | NONE |
| NEXT | Complete docs/security/harness, hosted migration safety and exact branch CI; then human /finance/yield gate. Do not start MDL8 |
