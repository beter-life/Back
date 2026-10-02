# Project state

| Field | Value |
| --- | --- |
| MODULE | MDL 4 — Financial Goals |
| STATUS | AWAITING_REAL_GATE |
| SCOPE | Personal planning goals in Finance; Auth and MDL 2/3 preserved |
| BRANCH | codex/mdl4-financial-goals |
| BASELINE_MAIN | b95addc3e1f22aba3f7aded269f451251ab74faa contains approved MDL 0–3; merge commit from [PR #1](https://github.com/beter-life/Back/pull/1); main CI [37027480851](https://github.com/beter-life/Back/actions/runs/37027480851) PASS |
| LAST_TESTED_COMMIT | 04a430e4f4ea5777935d8545c9ae1e4f77ed931a; local full regression 2026-10-02; subsequent checkpoint changes documentation only |
| DONE | Owned goal CRUD/status/filter API; immutable contribution/withdrawal history; owner-scoped canonical idempotency and concurrent overdraft prevention; deterministic progress/remaining/required monthly/estimate/status; fixed currency, priority, generated OpenAPI/client |
| DECISIONS | Planning declarations never change accounts/transactions/transfers/budgets; BigInt strings; timezone from profile, UTC fallback; inclusive month slots; first planned contribution in current month; floor progress to two decimals; PAUSED rejects new events, ARCHIVED terminal; safe replay allowed in any status |
| DATABASE | Migration 0005_financial_goals applied to Supabase DEV after disposable PostgreSQL 17/RLS PASS; TLS verify-full; exact snapshots of profiles and six existing Finance tables unchanged; no goal test records inserted remotely; two new private app tables with RLS and composite owner FK |
| SECURITY | JWT owner only; foreign goal IDs uniformly 404; unknown/derived fields rejected; event client policies read-only to prevent invariant bypass; no new hosted grants; event writes only through locked backend transactions |
| TESTS | Unit 90, disposable PostgreSQL 17 integration/RLS 53 PASS, including Auth/MDL 2/3; lint, typecheck, OpenAPI, contract drift, build, secret scan and harness PASS; commands via compact runner; complete logs in ignored .harness/logs/ |
| CI | [Implementation run 37031789789](https://github.com/beter-life/Back/actions/runs/37031789789) PASS on LAST_TESTED_COMMIT; documentation checkpoint runs the unchanged quality workflow |
| LOCAL | Back localhost:3001; Front localhost:3101/finance/goals; local env files preserved |
| REAL_GATE | PENDING |
| HUMAN_GATE | Next: real-session create BRL target 10,000/plan 1,000/future month; contribute 2,500 (25%), reload, withdraw 500 (20%), edit target 12,000 (16.66%), pause/resume, check projection/ownership and unchanged accounts/transactions/transfers/budgets |
| BLOCKER | Human MDL 4 approval remains required before closure or merge |
| CHECKPOINT | Implementation commits 6a53450 and 04a430e; approved MDL 3 tag checkpoint/mdl3-monthly-budgeting-complete-2026-10-02 preserved |
| READY_FOR_MDL5 | false |
| NEXT | User performs MDL 4 real gate; stop development here. No MDL 4 merge, MDL 5, recurrence, Yield Engine, Conflict Detector, Safe to Spend, AI or Open Finance |
