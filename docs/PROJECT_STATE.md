# Project state

| Field | Value |
| --- | --- |
| MODULE | MDL 6 — Net Worth / Patrimônio |
| STATUS | AWAITING_REAL_GATE |
| MDL6_STATUS | AWAITING_REAL_GATE |
| REAL_GATE | PENDING |
| READY_FOR_MDL7 | false |
| SCOPE | Finance API, exact signed accounting, observations, historical positions and RLS |
| BRANCH | codex/mdl6-net-worth; no PR/merge; main preserved |
| BASELINE_MAIN | 8c0056c62a313572fc3caf77c76e46ecde04f28f; approved MDL0–MDL5 |
| LAST_TESTED_COMMIT | 9ba79fce62f0835821e02d460670c662438800de; complete local regression PASS; handoff documentation only |
| DONE | Per-currency net worth, inactive/signed accounts read-only, external assets/liabilities, append-only valuations, atomic creation, deterministic latest <= asOf, monthly history, composition, terminal archive |
| DATES | YYYY-MM-DD observed dates <= profile today; UTC fallback. Account cutoff next local midnight; opening balance from account creation. History inclusive YYYY-MM <=60, current month today |
| MONEY | Exact BIGINT input/JSON integer strings; numeric/BigInt sums beyond BIGINT; 0/2/3 exponents. No FX or projection |
| LIMITS | Item/valuation pages default50/max100; stable cursor tuples. Summary max10000 components (explicit409); history one bounded SQL aggregation, no query per month |
| OWNERSHIP | JWT.sub only, strict schemas, foreign IDs404; compound item/owner FK. Private app RLS owner USING/WITH CHECK; valuations SELECT/INSERT only, no DELETE or new hosted grants |
| DATABASE | Generated/reviewed 0007_financial_net_worth, disposable PostgreSQL17 PASS, then applied to existing Supabase DEV. PostgreSQL17 and TLS verify-full authorized; two empty new tables/RLS verified |
| EXISTING_DATA | Before/after counts and exact row hashes unchanged across profiles plus all nine earlier Finance tables; no hosted fixture insertion, no previous migration/schema/Auth/TLS changes |
| TESTS | Unit149 + disposable PostgreSQL17 integration/RLS100 PASS; lint/typecheck/build, OpenAPI and client drift, secret scan, harness PASS |
| TEST_LIMITS | API/RLS uses disposable PostgreSQL with synthetic identity; browser uses real SDK/intercepted boundaries. Hosted human login/financial gate still PENDING |
| LOCAL | Back http://localhost:3001 live200/ready200 against hosted DB; Front http://localhost:3101/finance/net-worth responds200. Real session required |
| CI | Full branch workflow required; exact final SHA/run results in the final handoff report; local complete regression PASS |
| CHECKPOINT | Development handoff only; not COMPLETE; MDL5 complete checkpoint preserved |
| BLOCKER | NONE; awaiting explicit human MDL6 gate |
| NEXT | Human gate: baseline BRL, asset50k, liability20k, revalue asset55k, old history/reload, accounts unchanged, archive liability, currency/ownership isolation. No MDL7 |
