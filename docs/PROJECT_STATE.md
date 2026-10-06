# Project state

| Field | Value |
| --- | --- |
| MODULE | MDL 8 — Cards, Invoices & Installments |
| STATUS | COMPLETE |
| MDL8_STATUS | COMPLETE |
| REAL_GATE | PASS; user-approved Cards gate on 2026-10-06; validation records preserved |
| READY_FOR_MDL9 | false; final branch/PR/merge/main CI pending; no Debt implementation |
| SCOPE | Private Cards API, credit ledger integration and derived invoices |
| BRANCH | codex/mdl8-cards-invoices-installments; origin is beter-life/Back |
| BASELINE_MAIN | 5ed1be1a0a71389c340840ece0cb60e2490a6235; approved MDL0–MDL7 preserved |
| LAST_TESTED_COMMIT | 291731246e8cd1b27d37d549b6dd488495a0804f; complete final local regression PASS; closure changes documentation only |
| DONE | Cards/new or linked credit accounts, safe metadata, immutable billing versions, atomic idempotent purchases1–60, derived invoices/status/limits, partial/FIFO/excess transfer payments, corrective cancellation and terminal archive |
| ACCOUNTING | Purchase=EXPENSE; payment=TRANSFER. Exact minor units/remainder last; recognized balance and future commitments separate. No duplicate Net Worth liability, FX, processing, interest, refunds or paid services |
| DATES | User-local DATE/UTC fallback; original monthly anchor/clamp; due strictly after close; closing-day charge included. Checked DATE→instant; no scheduler |
| INTEGRITY | JWT.sub/foreign404; TypeBox→OpenAPI→generated Zod; compound FKs/RLS; no public DELETE/new grants. Managed generic debits/outgoing transfers blocked; safe legacy tracking boundary |
| DATABASE | 0009_financial_cards already applied once to DEV after disposable PG17 PASS; migration hashes0001–0009 verified; Auth/JWT/JWKS unchanged; Shared Pooler/TLS verify-full preserved |
| EXISTING_DATA | Closure read-only comparison PASS for19 app tables including human Cards records; counts/hashes/schema/indexes/policies/grants/FKs unchanged. No hosted writes or extra fixtures |
| TESTS | unit212; disposable PostgreSQL17 integration/RLS/ownership131; lint/typecheck/build/OpenAPI/contract drift/secret scan/harness PASS. Fixed only historical test fixture created_at, not product code |
| CI | Previous exact branch workflow PASS; final closure branch/PR/main workflows pending |
| MODEL_GATES | CARD_MODEL/CREDIT_ACCOUNT_INTEGRATION/BILLING_RULE_VERSIONING/INVOICE_ENGINE/INVOICE_STATUS/PURCHASES/INSTALLMENTS/INSTALLMENT_SPLIT/MONTH_END_CLAMP=PASS |
| ACCOUNTING_GATES | PAYMENTS/PARTIAL_PAYMENTS/PAYMENT_FIFO/NO_DOUBLE_COUNTING/FUTURE_COMMITMENTS/CREDIT_LIMIT/LEGACY_BALANCE/CANCELLATION/ARCHIVE/MULTI_CURRENCY/BUDGET_INTEGRATION/NET_WORTH_INTEGRATION/FINANCIAL_ISOLATION=PASS |
| SECURITY_GATES | RLS/OWNERSHIP/OPENAPI/CARD_DATA_SECURITY=PASS |
| HUMAN_GATE | CARD/PURCHASE_1X/PAYMENT/NO_DOUBLE_COUNTING/INSTALLMENTS/INSTALLMENT_SPLIT/FUTURE_COMMITMENTS/RELOAD/BILLING_RULE_VERSIONING/CANCELLATION/ARCHIVE/BUDGET_INTEGRATION/NET_WORTH_INTEGRATION/FINANCIAL_ISOLATION/OWNERSHIP=PASS |
| FINANCIAL_CALENDAR | DEFERRED; preserve MDL5 recurrence-only contract; Cards exposes due dates |
| LOCAL_APP | Approved real gate on Back3001/Front3101; .env unchanged/ignored; hosted TLS verify-full; NODE_USE_SYSTEM_CA=1 when needed |
| CHECKPOINT | checkpoint/mdl8-cards-invoices-installments-complete-2026-10-06 targets final branch closure commit; DEV and previous checkpoints preserved |
| BLOCKER | NONE; preexisting Auth password-protection advisor unchanged; private market-rates cache deliberately has no client policy |
| NEXT | Publish closure/checkpoint, require branch and PR CI PASS, merge commit to main, then require final main CI PASS and record readiness. Do not start MDL9 |
