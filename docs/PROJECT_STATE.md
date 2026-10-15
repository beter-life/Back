# Project state

| Field | Value |
| --- | --- |
| MODULE | MDL11 — Financial Ingestion Hub + Financial Inbox |
| STATUS | AWAITING_REAL_GATE |
| MDL11_STATUS | AWAITING_REAL_GATE |
| REAL_GATE | PENDING |
| READY_FOR_MDL12 | false |
| PREVIOUS_MODULES | MDL0–MDL10 COMPLETE; main baseline CI PASS |
| BASELINE_MAIN | `8842cfb2e282d354ac88e618547797a9af216242`; [exact baseline CI PASS](https://github.com/beter-life/Back/actions/runs/38731701722) |
| BRANCH | codex/mdl11-financial-ingestion-hub-inbox; no final PR or merge |
| LAST_TESTED_COMMIT | `5a87000bd0e8d474471a384cd2289590460b4f6e`; implementation tree passed local regression; subsequent handoff edits are documentation only |
| IMPLEMENTATION | Manual INCOME/EXPENSE proposals, bounded list/filters/history, versioned review/edit, duplicate hints/acknowledgement, terminal confirm/discard. TypeBox/OpenAPI generates Front Zod; no parallel Finance Core |
| POSTING | Shared Finance Core primitive; owner advisory lock then candidate/account locks; ledger row and terminal candidate reference commit atomically. Concurrent retries return one original transaction. Creation replay uses owner/key + canonical input; stale versions conflict |
| SECURITY | JWT.sub only; compound owner FKs, own SELECT RLS, no client write/DELETE grants, immutable identity/terminal history; no payload/token/fingerprint logging or new dependencies |
| LOCAL_GATES | Node24.11.1/pnpm11.19.0; lint/typecheck/260 unit/181 real PostgreSQL17 integration (RLS, ownership, concurrency, forced rollback, isolation)/OpenAPI/contract drift/build/secret scan/harness PASS |
| BASELINE | Before MDL11: 254 unit and160 PostgreSQL integration PASS. Same postgres:17 image; regression retains all previous tests. Docker restored locally |
| PERFORMANCE | Synthetic2000 proposals: bounded list/review<2500ms and core account read<1000ms PASS; no remote financial fixtures. No claim of unrestricted load certification |
| DATABASE | 0012_financial_inbox generated/reviewed; migrations0001–0012 applied only to disposable PostgreSQL17 and repeated safely. Historical migrations0001–0011 unchanged |
| SUPABASE_DEV | UNCHANGED; 0012 NOT_APPLIED, awaiting separate authorization; existing11 migrations/Auth/JWT/JWKS/TLS/env/data preserved |
| CI | [Branch workflow runs](https://github.com/beter-life/Back/actions?query=branch%3Acodex%2Fmdl11-financial-ingestion-hub-inbox); exact published HEAD must pass before handoff; no PR/promotion |
| CHECKPOINT | DEV only: checkpoint/mdl11-financial-ingestion-hub-inbox-dev-2026-10-15; publish at validated branch HEAD; no COMPLETE checkpoint |
| DESIGN_AND_GATE | [State machine, migration and test boundaries](./FINANCIAL_INBOX.md); Front contains the manual test script |
| BLOCKERS | Hosted migration0012 requires authorization before a real Supabase Inbox gate |
| NEXT | After branch CI PASS, obtain authorization for0012 on DEV, then run the human Inbox gate at localhost:3101/finance/inbox. Do not start MDL12 |
