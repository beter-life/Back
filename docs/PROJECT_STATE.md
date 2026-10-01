# Project state

| Field | Value |
| --- | --- |
| MODULE | MDL 2 — Financial Core |
| STATUS | COMPLETE |
| SCOPE | Backend Finance |
| BRANCH | codex/mdl2-financial-core |
| LAST_TESTED_COMMIT | 5e65e5e76ae48845407cfbd7b779d36280a78144 |
| DONE | Accounts, categories, income/expense, atomic idempotent transfers, exact calculated balances, ownership, paginated filters, summary and audit-preserving cancellation/deactivation |
| GATES | ACCOUNTS=PASS; CATEGORIES=PASS; INCOME=PASS; EXPENSE=PASS; TRANSFER=PASS; BALANCE_MODEL=PASS; PERSISTENCE=PASS; RLS=PASS; OWNERSHIP=PASS; OPENAPI=PASS; POSTGRES_INTEGRATION=PASS |
| REAL_GATE | PASS — user approved real authenticated flow and Supabase persistence (2 accounts, 2 categories, 2 transactions, 1 transfer) |
| DATABASE | Hosted PostgreSQL 17; migrations 0001/0002 preserved; 0003 applied; four Finance tables with RLS; TLS verify-full |
| TESTS | Unit 49; PostgreSQL/RLS integration 14; lint, typecheck, integration, OpenAPI, contract drift, build, secret scan and harness PASS |
| CI | PASS on 5e65e5e76ae48845407cfbd7b779d36280a78144 |
| PRESERVED | MDL 0 harness; Auth V2; existing data and migrations; no MDL 3 features |
| READY_FOR_MDL3 | true |
| NEXT | Wait for an explicit request before starting MDL 3 |
