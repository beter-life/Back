# Project state

| Field | Value |
| --- | --- |
| MODULE | MDL 10 — Safe to Spend / Quanto Posso Gastar com Segurança |
| STATUS | AWAITING_REAL_GATE |
| MDL10_STATUS | AWAITING_REAL_GATE |
| REAL_GATE | PENDING; no human financial gate performed by Codex |
| READY_FOR_MDL11 | false |
| SCOPE | Private settings/API; consistent read-only financial snapshot and exact conservative calculation |
| BRANCH | codex/mdl10-safe-to-spend; no final PR or merge |
| BASELINE_MAIN | 6e8b8bdf4a1d023e8d55d4bff8033b2d2ecc8d27; exact origin/main and main CI PASS before implementation; MDL0–MDL9 preserved |
| LAST_TESTED_COMMIT | Implementation is being checkpointed; current local gates PASS; delivered SHA and CI recorded after push |
| MODEL | Signed selected cash minus card/debt/future expense obligations, optional recurrence/goal reserves and buffer; Budget is cap, not subtraction; expected income scenario only; floor daily pace and explicit shortfall/warnings |
| SECURITY | JWT.sub only; strict inputs/foreign account404; private RLS own SELECT/backend settings writes, immutable owner/compound FKs; no secrets/logs/env versioned; no new dependencies, FX, AI or paid APIs |
| SNAPSHOT | Repeatable-read/read-only, bounded batch reuse of Cards/Debt/Budget/Goals/Recurrences; 100 accounts/cards/debts and 500 recurrences/goals tested, <=30 SQL calls and <5s disposable read |
| DATABASE | 0011_financial_safe_to_spend applied once to Supabase DEV after PostgreSQL17 PASS; migrations0001–0010 unchanged; two new tables initially empty, private RLS/ownership PASS |
| EXISTING_DATA | PASS; counts/hashes/structure of all22 previous app tables UNCHANGED; no financial fixtures/writes hosted; Auth/JWT/JWKS/TLS preserved |
| TESTS | 254 unit +160 PostgreSQL17 integration/RLS/ownership PASS; previous Net Worth/Debt fixture dates aligned to historical clocks, no production change; lint/typecheck/build/secret scan/harness/OpenAPI/contract drift PASS |
| CI | PENDING branch push; complete existing quality workflow required before handoff |
| LOCAL_APP | Back localhost:3001 live/ready200 against hosted PostgreSQL; Front localhost:3101 responds200; /finance/safe-to-spend ready for existing human login |
| LIMITS | [Formula, horizon, coverage and bounds](./SAFE_TO_SPEND.md); no obligations invented outside current-month horizon; only own settings are written |
| CHECKPOINT | Planned checkpoint/mdl10-safe-to-spend-dev-2026-10-08; not COMPLETE; previous checkpoints preserved |
| BLOCKER | Human REAL_GATE PENDING. Visual browser helper failed to initialize twice; automated browser regression PASS; real session not claimed |
| NEXT | Finish branch CI/checkpoint handoff; user logs in at localhost:3101/finance/safe-to-spend, explicitly selects accounts/buffer and validates breakdown/Budget/toggles/scenario/reload. Do not initiate MDL11 |
