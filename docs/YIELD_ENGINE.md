# MDL7 — Yield estimates (Finance)

Data flow: Front → authenticated Finance API → Yield service → read-only real
account/ledger + versioned rules → decimal calculator. Market service → private
PostgreSQL cache → bounded public BCB SGS requests. No ledger writer is available
to the calculator. No provider/bank-specific rules, FX, paid service or scheduler.

## Contract and integrity

- JWT.sub owns profiles and rules. Foreign account IDs return404. Strict TypeBox
  schemas generate OpenAPI and the existing Front Zod artifact.
- One profile per account; currency/owner compound FK. Rules use half-open date
  intervals [effectiveFrom,effectiveTo). Create chronological versions under a
  profile row lock; close the previous version atomically. Published historical
  fields are immutable. RLS permits owned SELECT/INSERT, not user rule UPDATE or
  DELETE. Only the backend closes an open interval. No hosted Data API grants.
- Incremental generated migration0008 adds three empty private tables. A reviewed
  security-invoker trigger serializes inserts and rejects interval overlap and
  non-closing updates. No extension or changes to0001–0007. Disposable PG17/RLS
  must pass before hosted DEV. Snapshot every earlier table before/after.

## Calculation assumptions

- Money is integer minor-unit strings/BigInt; normalized rates are decimal strings
  (0.10=10%,1.15=115% benchmark). decimal.js is pinned, precision50; money rounds
  half-up only at output, never daily. Fixed annual default CALENDAR_365; monthly
  equivalent exponent12/365. BUSINESS_252 future counts Monday–Friday only and
  explicitly reports WEEKDAYS_ONLY (no complete holiday calendar).
- Daily observed CDI SGS12 / Selic Over11: compound (1+dailyRate*percentage).
  Annualized cards use4389/1178; Target432 is separate. TR226 is a monthly
  period-start rate, not a daily return. Future CURRENT_RATE holds latest observed
  rates constant; never calls them guaranteed. Missing necessary observations
  produce UNAVAILABLE, never fabricated rates. Cache fallback reports STALE.
- Forward projections start from the current real nonnegative balance, hold
  principal constant and compound hypothetical returns. Historical estimates use
  actual uncancelled movements and real daily eligible balances; daily-return
  history compounds a separate in-memory hypothetical accumulator, never real
  balances. Savings historical minima remain exclusively real (already-booked
  credits participate only via the ledger). Neither mode creates a transaction.
  History is a counterfactual, not a reconciliation of actual institution returns.
  Caps yield only on the
  eligible portion. Delay is measured from each rule's effectiveFrom.
- Savings uses a monthly period anchored at first rule effectiveFrom; dates29–31
  shift to1 of the following month. Credit only after a complete period; use the
  minimum eligible real balance within that period. No daily fictitious credit.
  Target at period start >8.5% gives0.5% monthly; otherwise
  (1+0.7*Target)^(1/12)-1, rounded to4 decimal percentage places half-even per
  BCB Circular3595. Compound correction TR with the additional interest.
- IR/IOF are estimates on positive yield only, IR after IOF. Reference date is
  explicit taxReferenceDate or first rule effectiveFrom. No lot accounting,
  come-cotas or claim of exact tax liability. Non-BRL benchmarks/tax are rejected.
- Inactive accounts/archived profiles retain historical estimates but cannot
  project into the future. Limits:10 years/request, bounded10000 movements and
  500 profiles; explicit errors instead of silent truncation.

## Official sources

- [BCB SGS API](https://dadosabertos.bcb.gov.br/dataset/11-taxa-de-juros---selic):
  date-bounded queries, max10 years; operational source for all observations.
- [Savings](https://www.bcb.gov.br/estatisticas/remuneradepositospoupanca/1000),
  [monthly formula Circular3595](https://www.bcb.gov.br/pre/normativos/circ/2012/pdf/circ_3595_v1_O.pdf).
- [B3 daily DI methodology](https://www.b3.com.br/pt_br/market-data-e-indices/indices/indices-de-segmentos-e-setoriais/di/metodologia-de-calcudo-acumulado-de-di/).
- [Receita fixed-income IR](https://normas.receita.fazenda.gov.br/sijut2consulta/anexoOutros.action?idArquivoBinario=35512),
  [IOF Decreto6306 annex](https://planalto.gov.br/ccivil_03/_ato2007-2010/2007/decreto/d6306compilado.htm).

CI uses deterministic HTTP fixtures only; live BCB smoke is separate. Human gate
was explicitly approved by the user on 2026-10-05 (PASS). MDL8 is out of scope.

## Gate humano aprovado

The user approved the following real hosted flow on 2026-10-05 (PASS), using
http://localhost:3101/finance/yield and a real existing login. Checklist: fixed
10% annual on an active account and reload; inspect gross/net/IR/IOF estimates.
Create a future CDI115% version and verify previous dates/rules/history. Compare
CDI100%/savings/fixed for the same principal/horizon; check30/90/365/custom windows,
source freshness and explicit future weekday assumption. Savings needs an explicit
profile, complete birthday and minimum real eligible balance. Verify archive/history,
optional non-BRL fixed with separate totals, ownership and unchanged real balances,
transactions, transfers, budgets, goals, recurrences and net worth. No SQL fixture
replaces the human evidence. MDL7 is COMPLETE; branch/PR/main CI and merge commits PASS. Do not start MDL8 automatically.
