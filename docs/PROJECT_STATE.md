# Project state

| Field | Value |
| --- | --- |
| MODULE | MDL 3 — Monthly Budgeting |
| STATUS | COMPLETE |
| SCOPE | Backend Finance; MDL 2 and Auth preserved |
| BRANCH | codex/mdl3-monthly-budgeting |
| LAST_TESTED_COMMIT | 520fadf9e97a044f5f92b188767e172ae2f27200; final regression 2026-10-02; closure changes documentation only |
| DONE | Monthly periods, EXPENSE allocations, soft removal, exact summary/progress, positive rollover, idempotent copy, unbudgeted spending, linear pace, owned API and generated contracts |
| DECISIONS | Profile timezone snapshot per period; destination POSITIVE_ONLY reads closed prior month; copy preserves existing/removed limits; detailed rules in regras-negocio.md |
| GATES | BUDGET_MODEL/ALLOCATIONS/ROLLOVER/COPY_PREVIOUS/UNBUDGETED_SPENDING/SPENDING_PACE/MONTH_SUMMARY/RLS/OWNERSHIP/OPENAPI/PERSISTENCE=PASS; approved for MDL 3 closure |
| DATABASE | Hosted PostgreSQL 17; migrations 0001–0004 applied; two new budget tables with RLS; private app schema; TLS verify-full/CA/hostname validated |
| TESTS | Final regression 2026-10-02: unit 62; disposable PostgreSQL 17/RLS integration 28; lint, typecheck, OpenAPI, build, secret scan and harness PASS. Finance contract PASS against committed LF bytes; Windows checkout CRLF causes a byte-only false drift. Logs retained in ignored .harness/logs/ |
| CI | Baseline PASS on 520fadf9e97a044f5f92b188767e172ae2f27200; GitHub Actions run 36901064749. Documentation closure push runs the unchanged quality workflow |
| PRESERVED | MDL 0/Auth/MDL 2 and validated MDL 3 functionality; local .env files preserved; final regression used only a disposable database, with no hosted migrations or test writes |
| REAL_GATE | PASS |
| HUMAN_GATE | Approved by user on 2026-10-02: ORÇAMENTO/DESPESA/CÁLCULOS/RELOAD/EDIÇÃO/COPY_PREVIOUS/OWNERSHIP=PASS |
| BLOCKER | None for MDL 3 closure |
| CHECKPOINT | checkpoint/mdl3-monthly-budgeting-complete-2026-10-02; tag on documentation closure commit |
| READY_FOR_MDL4 | true |
| NEXT | MDL 3 complete. Await an explicit request to start MDL 4; MDL 4 has not been started |
