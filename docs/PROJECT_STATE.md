# Project state

| Field | Value |
| --- | --- |
| MODULE | MDL 10 — Safe to Spend / Quanto Posso Gastar com Segurança |
| STATUS | COMPLETE |
| MDL10_STATUS | COMPLETE |
| REAL_GATE | PASS; human gate recorded in SAFE_TO_SPEND.md |
| MERGED_TO_MAIN | true; Back PR #8, [merge commit](https://github.com/beter-life/Back/commit/ca6746c83483d70c69bdfaf31137db6c74546d04) |
| READY_FOR_MDL11 | true |
| SCOPE | Private settings/API; consistent read-only financial snapshot and exact conservative calculation |
| IMPLEMENTATION_BRANCH | codex/mdl10-safe-to-spend; historical implementation branch, merged via PR #8 to main |
| BASELINE_MAIN | 6e8b8bdf4a1d023e8d55d4bff8033b2d2ecc8d27; original pre-implementation baseline; MDL0–MDL9 preserved |
| LAST_TESTED_COMMIT | 6ed87d0d08a050649a54975eea39e8db5977ef3f; historical implementation-branch regression and CI evidence |
| CURRENT_MAIN | ca6746c83483d70c69bdfaf31137db6c74546d04; MDL10 PR #8 merged; [final main CI run 37790612267 PASS](https://github.com/beter-life/Back/actions/runs/37790612267) |
| MODEL | Signed selected cash minus card/debt/future expense obligations, optional recurrence/goal reserves and buffer; Budget is cap, not subtraction; expected income scenario only; floor daily pace and explicit shortfall/warnings |
| SECURITY | JWT.sub only; strict inputs/foreign account404; private RLS own SELECT/backend settings writes, immutable owner/compound FKs; no secrets/logs/env versioned; no new dependencies, FX, AI or paid APIs |
| SNAPSHOT | Repeatable-read/read-only, bounded batch reuse of Cards/Debt/Budget/Goals/Recurrences; 100 accounts/cards/debts and 500 recurrences/goals tested, <=30 SQL calls and <5s disposable read |
| DATABASE | 0011_financial_safe_to_spend applied once to Supabase DEV after PostgreSQL17 PASS; migrations0001–0010 unchanged; two new tables initially empty, private RLS/ownership PASS |
| EXISTING_DATA | PASS; counts/hashes/structure of all22 previous app tables UNCHANGED; no financial fixtures/writes hosted; Auth/JWT/JWKS/TLS preserved |
| TESTS | 254 unit +160 PostgreSQL17 integration/RLS/ownership PASS; previous Net Worth/Debt fixture dates aligned to historical clocks, no production change; lint/typecheck/build/secret scan/harness/OpenAPI/contract drift PASS |
| CI | Implementation [commit](https://github.com/beter-life/Back/actions/runs/37775758286), closure-docs [HEAD](https://github.com/beter-life/Back/actions/runs/37776613974), and final main CI [run 37790612267](https://github.com/beter-life/Back/actions/runs/37790612267) PASS |
| LOCAL_RESUME | 2026-10-15: Node 24.11.1; effective pnpm 11.19.0. Unit 254/254, lint, typecheck, OpenAPI, build, secret scan and harness PASS. Disposable PostgreSQL17 integration/RLS NOT_RUN because Docker daemon was unavailable; this is not a historical-test regression or PASS claim |
| LOCAL_APP | Human gate PASS on hosted DEV; Back live/ready200; Front 3101 served; CORS preflight 204 |
| LIMITS | [Formula, horizon, coverage and bounds](./SAFE_TO_SPEND.md); no obligations invented outside current-month horizon; only own settings are written |
| CHECKPOINT | [checkpoint/mdl10-safe-to-spend-complete-2026-10-08](https://github.com/beter-life/Back/tree/checkpoint/mdl10-safe-to-spend-complete-2026-10-08) exists and points to implementation closure commit `ffb0cc067776c259c7a29aeb2c1c99e00165d359` |
| ADVISORS | No security finding on new tables. Existing backend-only market-rate no-policy INFO and Auth leaked-password WARN left unchanged. New compound-FK coverage/unused-index INFO reviewed: profile PK prefix and owner/account index support bounded lookups; parent identity immutable; 100/500 volume test PASS |
| DELIVERY | MDL10 documentation reconciled on 2026-10-15; no product code, tests, migration, configuration, dependency or database changes in this reconciliation |
| BLOCKER | None for MDL10 closure |
| NEXT | MDL11 is eligible to begin, but has not been started |
