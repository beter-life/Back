# Project state

| Field | Value |
| --- | --- |
| MODULE | MDL 4 — Financial Goals |
| STATUS | COMPLETE |
| SCOPE | Personal planning goals in Finance; Auth and MDL 2/3 preserved |
| BRANCH | codex/mdl4-financial-goals |
| BASELINE_MAIN | b95addc3e1f22aba3f7aded269f451251ab74faa contains approved MDL 0–3; merge commit from [PR #1](https://github.com/beter-life/Back/pull/1); main CI [37027480851](https://github.com/beter-life/Back/actions/runs/37027480851) PASS |
| LAST_TESTED_COMMIT | 6d56f8d7e22945a3ba1992dea726de1f174e47d6; final regression 2026-10-02; closure changes documentation only |
| DONE | Owned goal CRUD/status/filter API; immutable contribution/withdrawal history; owner-scoped canonical idempotency and concurrent overdraft prevention; deterministic progress/remaining/required monthly/estimate/status; fixed currency, priority, generated OpenAPI/client |
| DECISIONS | Planning declarations never change accounts/transactions/transfers/budgets; BigInt strings; timezone from profile, UTC fallback; inclusive month slots; first planned contribution in current month; floor progress to two decimals; PAUSED rejects new events, ARCHIVED terminal; safe replay allowed in any status |
| DATABASE | Migration 0005_financial_goals applied to Supabase DEV after disposable PostgreSQL 17/RLS PASS; TLS verify-full; exact snapshots of profiles and six existing Finance tables unchanged; no goal test records inserted remotely; two new private app tables with RLS and composite owner FK |
| SECURITY | JWT owner only; foreign goal IDs uniformly 404; unknown/derived fields rejected; event client policies read-only to prevent invariant bypass; no new hosted grants; event writes only through locked backend transactions |
| TESTS | Final closure regression 2026-10-02: Unit 90, disposable PostgreSQL 17 integration/RLS 53 PASS, including Auth/MDL 2/3; lint, typecheck, OpenAPI, contract drift, build, secret scan and harness PASS; commands via compact runner; complete logs in ignored .harness/logs/ |
| CI | Pre-closure branch CI PASS on 6d56f8d (run 37032029831); final closure branch/PR/main runs require confirmation |
| LOCAL | Back localhost:3001; Front localhost:3101/finance/goals; local env files preserved |
| GATES | GOAL_MODEL=PASS; GOAL_EVENTS=PASS; CONTRIBUTIONS=PASS; WITHDRAWALS=PASS; IDEMPOTENCY=PASS; PROGRESS=PASS; REQUIRED_MONTHLY=PASS; ESTIMATED_COMPLETION=PASS; GOAL_STATUS=PASS; PRIORITY=PASS; MULTI_CURRENCY=PASS; RLS=PASS; OWNERSHIP=PASS; OPENAPI=PASS; PERSISTENCE=PASS; ISOLATION_FROM_ACCOUNTS=PASS; ISOLATION_FROM_TRANSACTIONS=PASS; ISOLATION_FROM_TRANSFERS=PASS; ISOLATION_FROM_BUDGETS=PASS |
| MERGED_TO_MAIN | false; automatic integration pending required CI |
| REAL_GATE | PASS |
| HUMAN_GATE | Approved by user on 2026-10-02: META=PASS; CONTRIBUIÇÃO=PASS; RETIRADA=PASS; CÁLCULOS=PASS; RELOAD=PASS; EDIÇÃO=PASS; PAUSE_RESUME=PASS; PROJEÇÃO=PASS; ISOLAMENTO_FINANCEIRO=PASS; OWNERSHIP=PASS |
| BLOCKER | None for module closure; branch/PR/main CI must remain green for automatic integration |
| CHECKPOINT | checkpoint/mdl4-financial-goals-complete-2026-10-02; tag on final MDL 4 branch closure commit; earlier module checkpoints preserved |
| READY_FOR_MDL5 | true |
| NEXT | Complete the authorized PR/merge integration only after green branch/PR gates, then verify main CI. Do not start MDL 5 or change the roadmap |
