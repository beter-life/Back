# Project state

| Field | Value |
| --- | --- |
| MODULE | MDL 2 — Financial Core |
| STATUS | AWAITING_REAL_GATE |
| SCOPE | Backend |
| BRANCH | codex/mdl2-financial-core |
| LAST_TESTED_COMMIT | 0d2ad207501412d50eee5e9c7ee931c4032d356f |
| DONE | Finance domain/application/repository/TypeBox routes; own accounts/categories; income/expense; atomic idempotent transfers; computed exact balances; cancellation/history; bounded filters/summary; generated frontend contract |
| DATABASE | Hosted beter-life-dev PostgreSQL 17; Shared Pooler Session, TLS verify-full preserved; Drizzle 0003_finance_core applied (3 migrations total). Four Finance tables have RLS/3 policies each; profiles keeps its 4 policies; no financial gate data inserted by SQL |
| TESTS | Unit 49; real disposable PostgreSQL integration 14 including RLS A/B, rollback, concurrency, cancellation and huge exact aggregates; lint/typecheck/build/OpenAPI/contract drift/secret scan/harness PASS. Existing API contracts unchanged |
| LOCAL | Back localhost:3001 live/ready 200 against hosted database; Finance unauthenticated 401; CORS POST/PATCH permits Front localhost:3101 |
| PRESERVED | MDL 0 harness; Identity/JWT/profile/Auth; existing data/migrations; no SMTP or Auth changes |
| SECURITY | No secrets tracked. Supabase advisor has only the existing Auth leaked-password-protection warning; Finance has no security advisor findings. Remediation: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection |
| REAL_GATE | PENDING_MANUAL; local/hosted infrastructure checks do not prove the user's financial flow |
| BLOCKERS | User approval of the real financial gate is required before COMPLETE; no technical migration blocker |
| READY_FOR_MDL3 | false |
| NEXT | With a real session in Front, create two BRL accounts, category, income/expense, confirm balance/transfer/reload and own-data-only GETs; approve MDL 2 explicitly |
