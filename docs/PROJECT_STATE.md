# Project state

| Field | Value |
| --- | --- |
| MODULE | MDL 5 — Recurrences, Subscriptions & Financial Calendar |
| STATUS | COMPLETE |
| REAL_GATE | PASS; human gate approved by the user on 2026-10-05 |
| READY_FOR_MDL6 | false |
| BRANCH | codex/mdl5-recurring-calendar; created exclusively from synchronized main |
| BASELINE_MAIN | 7f8dd4c632b8192d485aa12c173e998f37a2d9ea; approved MDL0–4, MDL4 COMPLETE/REAL_GATE=PASS/MERGED_TO_MAIN=true; main unchanged |
| SCOPE | Owned recurrence rules, deterministic DATE engine, read-only financial calendar and subscription radar |
| LAST_TESTED_COMMIT | fe78cbada2d772abba8ec0df551eac4fa8666d97; final local Unit141, lint/typecheck, OpenAPI/contract drift, build, secret scan and harness PASS; closure changes documentation only |
| CI | Final branch/PR/main checks pending. PostgreSQL17 integration/RLS must pass in the existing disposable CI service; local Docker startup is blocked by dockerInference socket failure |
| DONE | Nine strict TypeBox/JWT endpoints, original-anchor weekly/monthly/yearly projection without drift, month-end/leap restoration, next occurrence, exact per-currency totals, optional own account/category, locked pause/resume/archive, RLS/composite FKs, generated OpenAPI/Zod |
| DECISIONS | Recurrence != transaction; expectations never change confirmed ledger, accounts, transfers, budgets or goals. Type/currency fixed after creation; archive terminal. Edits replace rule and recalculate projections, no historical occurrence ledger. SUBSCRIPTION is a user classification requiring EXPENSE; no autodetection/matching/automatic posting |
| DATES | DATE / YYYY-MM-DD years 1000–9998; 9999-01-01 only exclusive upper calendar bound; original anchor retained after clamp. Profile timezone discovers today, UTC fallback; projected dates never become UTC-midnight timestamps |
| MONEY | BIGINT >0 and JSON integer strings; exact BigInt aggregation/formatting by currency; no FX. Projected net is income minus expense, never available balance |
| LIMITS | WEEKLY 1–52, MONTHLY 1–24, YEARLY 1–10; inclusive optional end; calendar [from,to) 1–366 days; list default50/max100 with createdAt+id cursor; explicit 409 above 500 eligible rules. Calendar loads rules once, no occurrence N+1 |
| RADAR | ACTIVE subscriptions in [today,today+30), actual repeated charges by currency, no monthly equivalent. Counts include active future/ended subscriptions; zero charges permitted and ended next date null |
| OWNERSHIP | JWT sub only; no owner input; foreign rule/account/category IDs 404; joins scoped to owner; own active new links, account currency/category type compatible; existing later-inactive associations preserved |
| DATABASE | 0006_financial_recurrences reviewed and applied to existing Supabase DEV after disposable PostgreSQL17 migration/RLS PASS; verified TLS, no destructive operations, no changed 0001–0005 migration, no fixture records inserted remotely |
| EXISTING_DATA | Exact before/after hashes of profiles plus eight previous Finance tables (accounts/categories/transactions/transfers/budget periods/allocations/goals/events) unchanged; integration also proves isolated writes with nonempty profile/budget/ledger/goal data |
| SECURITY | New private app table has owner SELECT/INSERT/UPDATE USING+WITH CHECK and no DELETE policy; composite owner+currency/type FKs; no new hosted grants/Data API exposure; local env files preserved, scans PASS |
| CONTRACT | Back TypeBox → OpenAPI/client → byte-identical copied Front Zod; no backend runtime filesystem dependency; all Auth/MDL2/3/4 functionality retained |
| TESTS | Unit141 + disposable PostgreSQL17 integration/RLS91 PASS; lint, typecheck, OpenAPI, client drift, build, secret scan and harness PASS |
| TEST_LIMITS | Disposable integration uses synthetic JWT/Auth schema for ownership/RLS; it does not replace hosted human login and gate |
| LOCAL | Back http://localhost:3001 (ready200, protected recurrence401 without JWT); Front http://localhost:3101/finance/recurrences and /finance/calendar (200), approved CORS; apps running for human gate |
| AUTOMATED_GATES | RECURRENCE_MODEL=PASS; RECURRENCE_ENGINE=PASS; WEEKLY=PASS; MONTHLY=PASS; YEARLY=PASS; MONTH_END_CLAMP=PASS; LEAP_YEAR=PASS; SUBSCRIPTIONS=PASS; SUBSCRIPTION_RADAR=PASS; NEXT_OCCURRENCE=PASS; FINANCIAL_CALENDAR=PASS; PROJECTED_TOTALS=PASS; MULTI_CURRENCY=PASS; ACCOUNT_LINK=PASS; CATEGORY_LINK=PASS; PAUSE_RESUME=PASS; ARCHIVE=PASS; FINANCIAL_ISOLATION=PASS; RLS=PASS; OWNERSHIP=PASS; OPENAPI=PASS |
| PERSISTENCE | PASS; human reload gate approved |
| HUMAN_GATE | ASSINATURA=PASS; MONTH_END_CLAMP=PASS; RADAR=PASS; PAUSE_RESUME=PASS; RECEITA_RECORRENTE=PASS; CALENDÁRIO=PASS; PROJECTED_TOTALS=PASS; RELOAD=PASS; ARCHIVE=PASS; ISOLAMENTO_FINANCEIRO=PASS; OWNERSHIP=PASS |
| CHECKPOINT | checkpoint/mdl5-recurring-calendar-complete-2026-10-05 will point to the final branch closure commit; previous checkpoints preserved |
| MERGED_TO_MAIN | false; merge requires final branch and PR CI PASS |
| BLOCKER | Final CI/merge validation pending; no application regression found |
| NEXT | Validate final CI, checkpoint and merge using merge commits only; validate main CI. Do not initiate MDL6 |
