# Project state

| Field | Value |
| --- | --- |
| MODULE | MDL 9 — Debt Management & Payoff Simulator |
| STATUS | COMPLETE |
| MDL9_STATUS | COMPLETE |
| REAL_GATE | PASS; user-approved complete Debt gate on 2026-10-06 |
| READY_FOR_MDL10 | false; closure branch/PR/merge/main CI must all PASS before enabling readiness |
| SCOPE | Private Debt API, exact accounting, versioned terms and read-only payoff simulator |
| BRANCH | codex/mdl9-debt-payoff-simulator; approved MDL9 closure; merge commit required |
| BASELINE_MAIN | 3ca6b092d70645f300967ea24dd2f3f77f535481; approved MDL0–MDL8 preserved; exact main CI PASS before implementation |
| LAST_TESTED_COMMIT | d706f426e628831af597eef5650fe3d9f91a6ab0; final full local regression PASS; closure changes documentation only |
| DONE | New managed debt account; metadata; immutable term versions; atomic split payments; owner idempotency; latest-payment cancellation; paid-off/archive lifecycle; bounded simulation and explicit manual liability conversion |
| ACCOUNTING | Positive input creates negative debt opening principal. Principal=TRANSFER; actual interest/fees=EXPENSE. No mutable second balance, automatic projected interest, FX or recurrence. Budget includes only costs; Net Worth principal transfer is neutral |
| TERMS_RATE | Intervals [effectiveFrom,effectiveTo); atomic future version; effective annual=(1+r)^(1/12)-1; monthly direct; decimal strings/Decimal precision256; money rounded HALF_UP at minor-unit boundary; 0% allowed |
| SIMULATION | Read-only MINIMUM_ONLY/AVALANCHE/SNOWBALL/COMPARE; one currency; 1–20 debts; 600 months; optional schedule; deterministic ties/freed minimum redistribution; NOT_AMORTIZING and HORIZON_EXCEEDED; future versions selected by due DATE |
| PAYMENT_INTEGRITY | Source owner/active/currency; checking/savings/cash/other; sufficient total cash; no overpay; no future/pretracking/out-of-order payments; idempotent canonical retry; atomic linked transfer/interest/fee rollback; stable keyset history |
| CONVERSION | Explicit owned active manual LIABILITY with matching currency/latest principal; atomic archive+new managed debt; no automatic conversion or double counting |
| SECURITY | JWT.sub only; cross-owner404; compound owner/currency/type FKs; private app schema/RLS; client own SELECT only, writes controlled through API; no public DELETE/grants; generic managed-account writes and linked-payment edits blocked |
| DATABASE | 0010_financial_debts applied once to Supabase DEV after disposable PostgreSQL17 PASS; canonical LF migration hashes0001–0010 verified; files0001–0009 unchanged; three new tables with RLS; CHECK adds debt and only reviewed core constraints/indexes/triggers |
| EXISTING_DATA | PASS; read-only closure before/after snapshots of all22 app tables, including real MDL9 gate records; row counts/hashes/schema/indexes/constraints/policies/grants/RLS/functions/triggers unchanged; no hosted writes or fixtures |
| HOSTED_SECURITY | Existing Auth/JWT/JWKS configuration and TLS verify-full preserved; NODE_USE_SYSTEM_CA=1 uses system trust without disabling certificate validation; local env SHA256 unchanged and ignored |
| TESTS | unit230; PostgreSQL17 integration/RLS/ownership150; plus isolated exact Net Worth smoke (0→principal-neutral0→interest-10000 minor) PASS; 500000/-100000→400000/-20000 and Budget expense20000 PASS; lint/typecheck/OpenAPI/contract drift/build/secret scan/harness PASS |
| CI | [Tested DEV HEAD](https://github.com/beter-life/Back/actions/runs/37493053968) PASS; final closure branch/PR/main gates pending |
| MODEL_GATES | DEBT_MODEL=PASS; DEBT_ACCOUNT_TYPE=PASS; TERM_VERSIONING=PASS; RATE_ENGINE=PASS; PAYOFF=PASS; AVALANCHE=PASS; SNOWBALL=PASS; NEGATIVE_AMORTIZATION=PASS; SIMULATION_HORIZON=PASS; MULTI_CURRENCY=PASS |
| ACCOUNTING_GATES | PAYMENTS=PASS; PRINCIPAL_TRANSFER=PASS; INTEREST_EXPENSE=PASS; FEE_EXPENSE=PASS; NO_DOUBLE_COUNTING_DEBT=PASS; PAYMENT_IDEMPOTENCY=PASS; BUDGET_INTEGRATION=PASS; NET_WORTH_INTEGRATION=PASS; MANUAL_LIABILITY_CONVERSION=PASS |
| ISOLATION_GATES | CARD_ISOLATION=PASS; YIELD_ISOLATION=PASS; RECURRENCE_ISOLATION=PASS; complete MDL0–MDL9 regression; no paid APIs or new dependencies |
| CONTRACT_GATES | RLS=PASS; OWNERSHIP=PASS; OPENAPI=PASS; TypeBox source → generated Front Zod; contract drift PASS |
| LOCAL_APP | Back localhost:3001 and Front localhost:3101; /finance/debts human gate approved; .env files unchanged/ignored; verified hosted TLS retained |
| HUMAN_GATE | DEBT=PASS; PAYMENT=PASS; PRINCIPAL_TRANSFER=PASS; INTEREST_FEE_EXPENSE=PASS; NO_DOUBLE_COUNTING_DEBT=PASS; BUDGET_INTEGRATION=PASS; NET_WORTH_INTEGRATION=PASS; RELOAD=PASS; SIMULATOR=PASS; MINIMUM_ONLY=PASS; AVALANCHE=PASS; SNOWBALL=PASS; TERM_VERSIONING=PASS; PAYOFF=PASS; MANUAL_LIABILITY_CONVERSION=PASS; CARD_ISOLATION=PASS; YIELD_ISOLATION=PASS; RECURRENCE_ISOLATION=PASS; OWNERSHIP=PASS |
| CHECKPOINT | checkpoint/mdl9-debt-payoff-simulator-complete-2026-10-06 targets final closure branch commit; DEV/DEV v2 and MDL0–MDL8 checkpoints preserved |
| BLOCKER | NONE; real gate PASS; integration workflow gates pending |
| NEXT | After closure branch CI PASS, open PR to main, require conflict-free PR CI PASS, use merge commit, sync main and require main CI PASS. Only then READY_FOR_MDL10=true; do not start MDL10 |
| MERGED_TO_MAIN | false; integration workflow pending |
