# Project state

| Field | Value |
| --- | --- |
| MODULE | MDL 4 — Financial Goals |
| STATUS | COMPLETE |
| SCOPE | Personal planning goals in Finance; Auth and MDL 2/3 preserved |
| BRANCH | main; codex/mdl4-financial-goals retained at the closure checkpoint |
| BASELINE_MAIN | 6dccef863b20f7af5b36cd8daf459c35eb2dfc38 contains approved MDL 0–4; merge commit from [PR #2](https://github.com/beter-life/Back/pull/2) |
| LAST_TESTED_COMMIT | 6dccef863b20f7af5b36cd8daf459c35eb2dfc38; post-merge main CI 37037038905 PASS includes the full regression; subsequent integration snapshot changes documentation only |
| DONE | Owned goal CRUD/status/filter API; immutable contribution/withdrawal history; owner-scoped canonical idempotency and concurrent overdraft prevention; deterministic progress/remaining/required monthly/estimate/status; fixed currency, priority, generated OpenAPI/client |
| DECISIONS | Planning declarations never change accounts/transactions/transfers/budgets; BigInt strings; timezone from profile, UTC fallback; inclusive month slots; first planned contribution in current month; floor progress to two decimals; PAUSED rejects new events, ARCHIVED terminal; safe replay allowed in any status |
| DATABASE | Migration 0005_financial_goals applied to Supabase DEV after disposable PostgreSQL 17/RLS PASS; TLS verify-full; exact snapshots of profiles and six existing Finance tables unchanged; no goal test records inserted remotely; two new private app tables with RLS and composite owner FK |
| SECURITY | JWT owner only; foreign goal IDs uniformly 404; unknown/derived fields rejected; event client policies read-only to prevent invariant bypass; no new hosted grants; event writes only through locked backend transactions |
| TESTS | Final closure regression 2026-10-02: Unit 90, disposable PostgreSQL 17 integration/RLS 53 PASS, including Auth/MDL 2/3; lint, typecheck, OpenAPI, contract drift, build, secret scan and harness PASS; commands via compact runner; complete logs in ignored .harness/logs/ |
| CI | Final closure branch [37034371794](https://github.com/beter-life/Back/actions/runs/37034371794) PASS; PR [37034655269](https://github.com/beter-life/Back/actions/runs/37034655269) PASS; post-merge main [37037038905](https://github.com/beter-life/Back/actions/runs/37037038905) PASS. The documentation snapshot runs the unchanged quality workflow |
| LOCAL | Back localhost:3001; Front localhost:3101/finance/goals; local env files preserved |
| GATES | GOAL_MODEL=PASS; GOAL_EVENTS=PASS; CONTRIBUTIONS=PASS; WITHDRAWALS=PASS; IDEMPOTENCY=PASS; PROGRESS=PASS; REQUIRED_MONTHLY=PASS; ESTIMATED_COMPLETION=PASS; GOAL_STATUS=PASS; PRIORITY=PASS; MULTI_CURRENCY=PASS; RLS=PASS; OWNERSHIP=PASS; OPENAPI=PASS; PERSISTENCE=PASS; ISOLATION_FROM_ACCOUNTS=PASS; ISOLATION_FROM_TRANSACTIONS=PASS; ISOLATION_FROM_TRANSFERS=PASS; ISOLATION_FROM_BUDGETS=PASS |
| MERGED_TO_MAIN | true |
| REAL_GATE | PASS |
| HUMAN_GATE | Approved by user on 2026-10-02: META=PASS; CONTRIBUIÇÃO=PASS; RETIRADA=PASS; CÁLCULOS=PASS; RELOAD=PASS; EDIÇÃO=PASS; PAUSE_RESUME=PASS; PROJEÇÃO=PASS; ISOLAMENTO_FINANCEIRO=PASS; OWNERSHIP=PASS |
| BLOCKER | None; human gate, final local regression, branch CI, PR CI, merge and post-merge main CI PASS |
| CLOSURE_COMMIT | 3dc7397eb6af40dc7977e5431e2ac1912ba1d172; final branch closure commit and checkpoint target |
| CHECKPOINT | checkpoint/mdl4-financial-goals-complete-2026-10-02; tag on final MDL 4 branch closure commit; earlier module checkpoints preserved |
| READY_FOR_MDL5 | true |
| NEXT | MDL 4 complete and integrated into main. Stop here and await a separate user instruction; MDL 5 has not been started |
