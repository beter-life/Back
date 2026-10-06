# Project state

| Field | Value |
| --- | --- |
| MODULE | MDL 9 — Debt Management & Payoff Simulator |
| STATUS | AWAITING_REAL_GATE |
| MDL9_STATUS | AWAITING_REAL_GATE |
| REAL_GATE | PENDING; automated tests do not replace the user's real gate |
| READY_FOR_MDL10 | false |
| SCOPE | Private Debt API, exact accounting, versioned terms and read-only payoff simulator |
| BRANCH | codex/mdl9-debt-payoff-simulator; DEV only; no PR or merge |
| BASELINE_MAIN | 3ca6b092d70645f300967ea24dd2f3f77f535481; approved MDL0–MDL8 preserved; exact main CI PASS before implementation |
| LAST_TESTED_COMMIT | 3477fe12b82b29c8a9219af2b039925f7837c28b; complete exact-HEAD CI PASS; same product code as locally tested fae947d3c5877647e064741ef5be5fdb3d8df659 |
| DONE | New managed debt account; metadata; immutable term versions; atomic split payments; owner idempotency; latest-payment cancellation; paid-off/archive lifecycle; bounded simulation and explicit manual liability conversion |
| ACCOUNTING | Positive input creates negative debt opening principal. Principal=TRANSFER; actual interest/fees=EXPENSE. No mutable second balance, automatic projected interest, FX or recurrence. Budget includes only costs; Net Worth principal transfer is neutral |
| TERMS_RATE | Intervals [effectiveFrom,effectiveTo); atomic future version; effective annual=(1+r)^(1/12)-1; monthly direct; decimal strings/Decimal precision256; money rounded HALF_UP at minor-unit boundary; 0% allowed |
| SIMULATION | Read-only MINIMUM_ONLY/AVALANCHE/SNOWBALL/COMPARE; one currency; 1–20 debts; 600 months; optional schedule; deterministic ties/freed minimum redistribution; NOT_AMORTIZING and HORIZON_EXCEEDED; future versions selected by due DATE |
| PAYMENT_INTEGRITY | Source owner/active/currency; checking/savings/cash/other; sufficient total cash; no overpay; no future/pretracking/out-of-order payments; idempotent canonical retry; atomic linked transfer/interest/fee rollback; stable keyset history |
| CONVERSION | Explicit owned active manual LIABILITY with matching currency/latest principal; atomic archive+new managed debt; no automatic conversion or double counting |
| SECURITY | JWT.sub only; cross-owner404; compound owner/currency/type FKs; private app schema/RLS; client own SELECT only, writes controlled through API; no public DELETE/grants; generic managed-account writes and linked-payment edits blocked |
| DATABASE | 0010_financial_debts applied once to Supabase DEV after disposable PostgreSQL17 PASS; canonical LF migration hashes0001–0010 verified; files0001–0009 unchanged; three new tables with RLS; CHECK adds debt and only reviewed core constraints/indexes/triggers |
| EXISTING_DATA | PASS; original safe before/after counts+SHA256 for all19 existing app tables match; existing columns/policies/RLS unchanged and other objects preserved; no hosted fixtures or automatic debts; existing human Cards data preserved |
| HOSTED_SECURITY | Existing Auth/JWT/JWKS configuration and TLS verify-full preserved; NODE_USE_SYSTEM_CA=1 uses system trust without disabling certificate validation; local env SHA256 unchanged and ignored |
| TESTS | unit230; PostgreSQL17 integration/RLS/ownership150; lint/typecheck/OpenAPI/contract drift/build/secret scan/harness PASS |
| CI | [Exact tested HEAD run](https://github.com/beter-life/Back/actions/runs/37491782273) PASS for 3477fe12b82b29c8a9219af2b039925f7837c28b; subsequent checkpoint changes PROJECT_STATE only and reruns the same workflow; final documentation HEAD CI reported at handoff |
| MODEL_GATES | DEBT_MODEL=PASS; DEBT_ACCOUNT_TYPE=PASS; TERM_VERSIONING=PASS; RATE_ENGINE=PASS; PAYOFF=PASS; AVALANCHE=PASS; SNOWBALL=PASS; NEGATIVE_AMORTIZATION=PASS; SIMULATION_HORIZON=PASS; MULTI_CURRENCY=PASS |
| ACCOUNTING_GATES | PAYMENTS=PASS; PRINCIPAL_TRANSFER=PASS; INTEREST_EXPENSE=PASS; FEE_EXPENSE=PASS; NO_DOUBLE_COUNTING_DEBT=PASS; PAYMENT_IDEMPOTENCY=PASS; BUDGET_INTEGRATION=PASS; NET_WORTH_INTEGRATION=PASS; MANUAL_LIABILITY_CONVERSION=PASS |
| ISOLATION_GATES | CARD_ISOLATION=PASS; YIELD_ISOLATION=PASS; existing MDL0–MDL8 regressions PASS; no paid APIs or new production dependencies |
| CONTRACT_GATES | RLS=PASS; OWNERSHIP=PASS; OPENAPI=PASS; TypeBox source → generated Front Zod; contract drift PASS |
| LOCAL_APP | Back localhost:3001 live/ready200; Front localhost:3101/finance/debts200; authenticated browser shows Debt dashboard without hosted writes; unauthenticated Debt API401; processes kept running for human gate |
| HUMAN_GATE | PENDING: create10,000 debt/12% effective annual/minimum500/due10; payment400 principal+90 interest+10fee; reload; compare extra500/month; two-debt priorities; future terms; small-debt full payoff; Budget/Net Worth/Cards/Yield/recurrence isolation; second-user ownership if available |
| CHECKPOINT | checkpoint/mdl9-debt-payoff-simulator-dev-2026-10-06-v2; DEV snapshot; previous DEV and MDL0–MDL8 checkpoints preserved; no COMPLETE checkpoint |
| BLOCKER | NONE for development handoff; real human approval remains outstanding |
| NEXT | User performs MDL9 real gate at /finance/debts. Await explicit results before closure/PR/merge. Do not start MDL10 |
