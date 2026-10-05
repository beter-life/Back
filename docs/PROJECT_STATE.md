# Project state

| Field | Value |
| --- | --- |
| MODULE | MDL 8 — Cards, Invoices & Installments |
| STATUS | AWAITING_REAL_GATE |
| MDL8_STATUS | AWAITING_REAL_GATE |
| REAL_GATE | PENDING; no human Cards gate or remote financial fixtures executed |
| READY_FOR_MDL9 | false; no final PR/merge, no Debt implementation |
| SCOPE | Private Cards API, credit ledger integration and derived invoices |
| BRANCH | codex/mdl8-cards-invoices-installments; origin is beter-life/Back |
| BASELINE_MAIN | 5ed1be1a0a71389c340840ece0cb60e2490a6235; approved MDL0–MDL7 preserved |
| LAST_TESTED_COMMIT | 0894ced787358e62776f8f8aafb5ec40bb56e357; complete local automated regression PASS; final handoff only documentation |
| DONE | Cards/new or linked credit accounts, safe metadata, immutable billing versions, atomic idempotent purchases1–60, derived invoices/status/limits, partial/FIFO/excess transfer payments, corrective cancellation and terminal archive |
| ACCOUNTING | Purchase=EXPENSE; payment=TRANSFER. Exact integer minor units/remainder last; recognized balance and future commitments separate. No duplicate Net Worth liability, FX, payment processing, interest, refunds or paid services |
| DATES | User-local DATE/UTC fallback; original monthly anchor and month-end clamp; due strictly after close; charge on closing day included. Checked local-date→instant conversion; no scheduler |
| INTEGRITY | JWT.sub only/foreign404; strict TypeBox→OpenAPI→generated Zod, compound FKs/RLS, no public DELETE/new grants. Managed generic transaction/outgoing transfer bypass blocked; safe link boundary must follow unmanaged debits |
| DATABASE | 0009_financial_cards applied once to existing Supabase DEV after disposable PG17 PASS. PostgreSQL17/Shared Pooler/TLS verify-full preserved; migrations0001–0008 unchanged; Auth/JWT/JWKS untouched |
| EXISTING_DATA | Safe before/after counts/hashes and old column/policy/grant/constraint definitions preserved for15 earlier tables;4 new tables empty. Financial isolation PASS; no remote fixtures or real balance changes |
| TESTS | unit212; disposable PostgreSQL17 integration/RLS/ownership131; lint/typecheck/build/OpenAPI/contract drift/secret scan/harness PASS |
| CI | [Tested feature SHA workflow](https://github.com/beter-life/Back/actions/runs/37390324174) PASS; final checkpoint is documentation-only and runs the unchanged complete branch workflow |
| AUTOMATED_GATES | CARD_MODEL/CREDIT_ACCOUNT/BILLING_RULES/INVOICE/PURCHASES/INSTALLMENTS/PAYMENTS/FIFO/NO_DOUBLE_COUNTING/LIMIT/LEGACY/CANCEL/ARCHIVE/MULTI_CURRENCY/BUDGET/NET_WORTH/RLS/OWNERSHIP/OPENAPI/CARD_DATA_SECURITY=PASS |
| FINANCIAL_CALENDAR | DEFERRED: preserve MDL5 recurrence-only contract; Cards exposes due dates |
| LOCAL_APP | Back3001 live/ready200 against hosted DEV; Front3101 Cards loads with real session, no managed cards. Runtime CORS_ORIGINS=http://localhost:3101, HOST=127.0.0.1, NODE_USE_SYSTEM_CA=1; .env unchanged/ignored |
| CHECKPOINT | checkpoint/mdl8-cards-invoices-installments-dev-2026-10-05; final documentation handoff commit, never COMPLETE; previous checkpoints preserved |
| BLOCKER | NONE; existing Supabase password-protection advisor predates MDL8, Auth unchanged |
| NEXT | Human gate at http://localhost:3101/finance/cards following CARDS_INVOICES.md: create BRL card5000/close10/due17, buy300/pay300,1000÷3,reload,future rule,eligible correction,archive,financial isolation/ownership. Await approval; do not start MDL9 |
