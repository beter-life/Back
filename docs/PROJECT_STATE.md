# Project state

| Field | Value |
| --- | --- |
| MODULE | MDL11 — Financial Ingestion Hub + Financial Inbox |
| STATUS | AWAITING_UX_VALIDATION |
| MDL11_STATUS | AWAITING_UX_VALIDATION |
| REAL_GATE | PASS — original seven-flow gate reported by user |
| MDL11_HUMAN_GATE | PASS |
| MDL11_HUMAN_TESTS | 7/7 |
| READY_FOR_MDL12 | false |
| PREVIOUS_MODULES | MDL0–MDL10 COMPLETE; main baseline CI PASS |
| BASELINE_MAIN | `8842cfb2e282d354ac88e618547797a9af216242`; [exact baseline CI PASS](https://github.com/beter-life/Back/actions/runs/38731701722) |
| BRANCH | codex/mdl11-financial-ingestion-hub-inbox; no final PR or merge |
| LAST_TESTED_COMMIT | `d809ffa20bd0e18b0e895b5b46137f8603b6715b`; fresh full Back regression PASS; current changes are documentation only |
| IMPLEMENTATION | Manual INCOME/EXPENSE proposals, bounded list/filters/history, versioned review/edit, duplicate hints/acknowledgement, terminal confirm/discard. TypeBox/OpenAPI generates Front Zod; no parallel Finance Core |
| POSTING | Shared Finance Core primitive; owner advisory lock then candidate/account locks; ledger row and terminal candidate reference commit atomically. Concurrent retries return one original transaction. Creation replay uses owner/key + canonical input; stale versions conflict |
| SECURITY | JWT.sub only; compound owner FKs, own SELECT RLS, no client write/DELETE grants, immutable identity/terminal history; no payload/token/fingerprint logging or new dependencies |
| LOCAL_GATES | Node24.11.1/pnpm11.19.0; fresh lint/typecheck/260 unit/181 disposable PostgreSQL17 integration (RLS, ownership, concurrency, forced rollback, isolation)/OpenAPI/contract drift/build/secret scan/harness PASS; no hosted database requests during the UX correction |
| BASELINE | Before MDL11: 254 unit and160 PostgreSQL integration PASS. Same postgres:17 image; regression retains all previous tests. Docker restored locally |
| PERFORMANCE | Synthetic2000 proposals: bounded list/review<2500ms and core account read<1000ms PASS; no remote financial fixtures. No claim of unrestricted load certification |
| DATABASE | 0012_financial_inbox generated/reviewed and PostgreSQL17 regression PASS; explicitly authorized DEV deployment via official db:migrate executed once on2026-10-15. Drizzle12/12, no pending; SQL matches approved commit d809ffa20bd0e18b0e895b5b46137f8603b6715b. Historical0001–0011 unchanged |
| SUPABASE_DEV | Authorized deployment snapshot: beter-life-dev ACTIVE_HEALTHY, verify-full/CA/hostname PASS; encrypted app+drizzle pg_dump17 backup, restricted ACL, decryption/manifest verified (not restore-tested).24 existing app tables/data/functions preserved at deployment; not re-read or modified during the UX task |
| DEPLOYMENT_CHECKS | At authorized deployment: Inbox empty;8 constraints/7 indexes/function+trigger/RLS/restricted grants PASS; live/ready200, guard401. Later real seven-flow human gate PASS per user; deployment snapshot is not a claim that Inbox remains empty |
| FINANCIAL_BEHAVIOR_UNCHANGED | Back source/contracts/migrations unchanged; card tracking-date eligibility and managed-debt blocking remain backend-owned. Front links card.accountId to account.id for presentation only |
| CI | [Branch workflow runs](https://github.com/beter-life/Back/actions?query=branch%3Acodex%2Fmdl11-financial-ingestion-hub-inbox); exact published HEAD must pass before handoff; no PR/promotion |
| CHECKPOINT | DEV only: checkpoint/mdl11-financial-ingestion-hub-inbox-dev-2026-10-15; publish at validated branch HEAD; no COMPLETE checkpoint |
| DESIGN_AND_GATE | [State machine, migration and test boundaries](./FINANCIAL_INBOX.md); Front contains the manual test script |
| BLOCKERS | Final card-account UX validation and explicit promotion release are still required; exact new branch HEAD CI must pass |
| NEXT | Validate Front card-account markers/disabled Inbox choices and the included floating scrollbars, then await user promotion authorization. No final PR/merge, COMPLETE checkpoint or MDL12 |
