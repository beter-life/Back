# Project state

| Field | Value |
| --- | --- |
| MODULE | MDL 6 — Net Worth / Patrimônio |
| STATUS | COMPLETE |
| MDL6_STATUS | COMPLETE |
| REAL_GATE | PASS; human gate approved by the user on 2026-10-05 |
| READY_FOR_MDL7 | true |
| SCOPE | Finance API, exact signed accounting, observations, historical positions and RLS |
| BRANCH | main; MDL0–MDL6 integrated, origin/main synchronized |
| BASELINE_MAIN | 8c0056c62a313572fc3caf77c76e46ecde04f28f; approved MDL0–MDL5 |
| LAST_TESTED_COMMIT | 0b588d8bcd7f1a26568d9989aa8806f1cfbe6f24; full main CI PASS; final handoff changes documentation only |
| DONE | Per-currency net worth, inactive/signed accounts read-only, external assets/liabilities, append-only valuations, atomic creation, deterministic latest <= asOf, monthly history, composition, terminal archive |
| DATES | YYYY-MM-DD observed dates <= profile today; UTC fallback. Account cutoff next local midnight; opening balance from account creation. History inclusive YYYY-MM <=60, current month today |
| MONEY | Exact BIGINT input/JSON integer strings; numeric/BigInt sums beyond BIGINT; 0/2/3 exponents. No FX or projection |
| LIMITS | Item/valuation pages default50/max100; stable cursor tuples. Summary max10000 components (explicit409); history one bounded SQL aggregation, no query per month |
| OWNERSHIP | JWT.sub only, strict schemas, foreign IDs404; compound item/owner FK. Private app RLS owner USING/WITH CHECK; valuations SELECT/INSERT only, no DELETE or new hosted grants |
| DATABASE | Generated/reviewed 0007_financial_net_worth, disposable PostgreSQL17 PASS, then applied to existing Supabase DEV. PostgreSQL17 and TLS verify-full authorized; items/valuations, RLS and compound ownership reverified read-only; no public DELETE or orphan |
| EXISTING_DATA | Before/after counts and exact row hashes unchanged across profiles plus all nine earlier Finance tables; no hosted fixture insertion, no previous migration/schema/Auth/TLS changes |
| TESTS | Unit149 + disposable PostgreSQL17 integration/RLS100 PASS; lint/typecheck/build, OpenAPI/client drift, secret scan and harness PASS; Auth and MDL2–5 retained |
| TEST_LIMITS | API/RLS uses disposable PostgreSQL with synthetic identity; browser uses real SDK/intercepted boundaries. Hosted human net worth/reload/ownership gate now PASS; no additional fixtures created |
| LOCAL | Back http://localhost:3001 live200/ready200 against hosted DB; Front http://localhost:3101/finance/net-worth responds200. Real session required |
| CI | Branch [37318022949](https://github.com/beter-life/Back/actions/runs/37318022949), PR [37319906335](https://github.com/beter-life/Back/actions/runs/37319906335), main [37320997451](https://github.com/beter-life/Back/actions/runs/37320997451): PASS; documentation handoff runs the unchanged complete workflow |
| CHECKPOINT | checkpoint/mdl6-net-worth-complete-2026-10-05 targets the final MDL6 branch closure commit; old checkpoints preserved |
| MERGED_TO_MAIN | true; [PR4](https://github.com/beter-life/Back/pull/4), merge commit 0b588d8bcd7f1a26568d9989aa8806f1cfbe6f24; no squash/rebase |
| BLOCKER | NONE |
| NEXT | Await the explicit MDL7 request; do not create a branch or implement MDL7 automatically |
| AUTOMATED_GATES | NET_WORTH_MODEL=PASS; MANUAL_ASSETS=PASS; MANUAL_LIABILITIES=PASS; VALUATIONS=PASS; VALUATION_HISTORY=PASS; ACCOUNT_BALANCES=PASS; SIGNED_ACCOUNT_BALANCES=PASS; AS_OF=PASS; HISTORY=PASS; BREAKDOWN=PASS; ARCHIVE=PASS; MULTI_CURRENCY=PASS; FINANCIAL_ISOLATION=PASS; RLS=PASS; OWNERSHIP=PASS; OPENAPI=PASS; PERSISTENCE=PASS |
| HUMAN_GATE | NET_WORTH=PASS; ACCOUNT_BREAKDOWN=PASS; MANUAL_ASSET=PASS; MANUAL_LIABILITY=PASS; VALUATION=PASS; VALUATION_HISTORY=PASS; HISTORY=PASS; RELOAD=PASS; ARCHIVE=PASS; MULTI_CURRENCY=PASS; FINANCIAL_ISOLATION=PASS; OWNERSHIP=PASS |
