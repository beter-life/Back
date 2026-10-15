# Project state

| Field | Value |
| --- | --- |
| MODULE | MDL11 — Financial Ingestion Hub + Financial Inbox |
| STATUS | REAL_GATE_PASS_PENDING_MERGE |
| MDL11_STATUS | REAL_GATE_PASS_PENDING_MERGE |
| REAL_GATE | PASS — seven-flow gate and final card-account UX/scrollbars approved by user |
| MDL11_HUMAN_GATE | PASS |
| MDL11_HUMAN_TESTS | 7/7 |
| READY_FOR_MDL12 | false |
| PREVIOUS_MODULES | MDL0–MDL10 COMPLETE; main baseline CI PASS |
| BASELINE_MAIN | `8842cfb2e282d354ac88e618547797a9af216242`; [exact baseline CI PASS](https://github.com/beter-life/Back/actions/runs/38731701722) |
| BRANCH | codex/mdl11-financial-ingestion-hub-inbox; documentary closure/PR preparation authorized; merge requires explicit user release |
| LAST_TESTED_COMMIT | `dd177796cbc80d114018cb6729ed48d0de3f2a2c`; exact HEAD CI PASS; application source unchanged since tested d809ffa; closure changes are documentation only |
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
| CARD_ACCOUNT_UX_FIX | PASS — real accountId links, archived-card history and contextual Inbox guidance approved by user; Finance Core preserved |
| SCROLLBARS | INCLUDED — Front page/sidebar overlay indicators validated and approved by user |
| CI | [Back dd17779 CI PASS](https://github.com/beter-life/Back/actions/runs/38770011019); documentary HEAD and PR checks must pass before promotion |
| CHECKPOINT | Existing DEV tag checkpoint/mdl11-financial-ingestion-hub-inbox-dev-2026-10-15 preserved at d809ffa, not moved; no COMPLETE checkpoint |
| DESIGN_AND_GATE | [State machine, migration and test boundaries](./FINANCIAL_INBOX.md); Front contains the manual test script |
| BLOCKERS | Promotion awaits exact documentary HEAD/PR checks and explicit user merge authorization; no remaining human UX validation |
| NEXT | Publish documentary closure and separate PR to main, verify checks/conflicts, then request final promotion release. No automatic merge, COMPLETE checkpoint or MDL12 |
