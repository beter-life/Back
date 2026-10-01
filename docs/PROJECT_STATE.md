# Project state

| Field | Value |
| --- | --- |
| MODULE | MDL 3 — Monthly Budgeting |
| STATUS | AWAITING_REAL_GATE |
| SCOPE | Backend Finance; MDL 2 and Auth preserved |
| BRANCH | codex/mdl3-monthly-budgeting |
| LAST_TESTED_COMMIT | 0f359a70baeb0e4dc95ae7ad5d663774fb2a077e |
| DONE | Monthly periods, EXPENSE allocations, soft removal, exact summary/progress, positive rollover, idempotent copy, unbudgeted spending, linear pace, owned API and generated contracts |
| DECISIONS | Profile timezone snapshot per period; destination POSITIVE_ONLY reads closed prior month; copy preserves existing/removed limits; detailed rules in regras-negocio.md |
| GATES | BUDGET_MODEL/ALLOCATIONS/ROLLOVER/COPY_PREVIOUS/UNBUDGETED_SPENDING/SPENDING_PACE/MONTH_SUMMARY/RLS/OWNERSHIP/OPENAPI=PASS (automated) |
| DATABASE | Hosted PostgreSQL 17; migrations 0001–0004 applied; two new budget tables with RLS; private app schema; TLS verify-full/CA/hostname validated |
| TESTS | Unit 62; PostgreSQL/RLS integration 28; lint, typecheck, OpenAPI, contract drift, build, secret scan and harness PASS |
| CI | PASS on 0f359a70baeb0e4dc95ae7ad5d663774fb2a077e; GitHub Actions run 36900584671 |
| PRESERVED | MDL 0/Auth/MDL 2; hosted 2 accounts, 2 categories, 2 transactions, 1 transfer; no budget test data inserted remotely |
| REAL_GATE | PENDING — manual authenticated budget flow not yet executed |
| BLOCKER | User real-gate approval; pre-existing Auth password-protection advisory is unchanged |
| READY_FOR_MDL4 | false |
| NEXT | In Front create monthly limit 500, expense 100; confirm remaining 400/20%, reload, edit and copy following month. Confirm ownership; do not start MDL 4 |
