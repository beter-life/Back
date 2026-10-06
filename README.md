# Beter Life — Backend

Node **24 LTS**, pnpm **11.19.0**, TypeScript strict/ESM, Fastify 5.
Frontend is a separate repository and consumes the versioned OpenAPI artifact.

MDL 2 Finance is the first functional bounded context: own accounts/categories,
income/expense, idempotent atomic transfers, calculated balances and period
summary. Auth, profile, PostgreSQL TLS and the approved infrastructure remain
unchanged. The real authenticated financial gate and persisted data were
approved by the user. MDL 3 extends the same Finance context with monthly budgets,
expense-category limits, positive rollover, copy-previous and spending pace.
The monthly budgeting real gate was approved on 2026-10-02; MDL 0–7 are integrated into main. MDL 4 Financial Goals adds personal planning goals and immutable contributions/withdrawals; its real gate was approved by the user on 2026-10-02. Goal events never move account balances, transactions, transfers or budgets. MDL 5 recurrence planning and MDL 6 Net Worth are COMPLETE after approved human gates. MDL7 Yield Engine is COMPLETE after the user-approved real gate on 2026-10-05; MDL8 Cards is COMPLETE after the user-approved real gate on 2026-10-06; publication/merge readiness is tracked in PROJECT_STATE.

## Development and gates

Install Node 24 and the package manager version in `package.json`. Configure local
environment values from `.env.example` (never commit `.env`), then:

```sh
pnpm install --frozen-lockfile
pnpm db:migrate
pnpm dev
```

`pnpm build` produces `dist/`; `pnpm start` respects `PORT` and defaults to port
3001, binding `0.0.0.0`. No external credentials are required for unit tests.

```sh
pnpm compact lint
pnpm compact typecheck
pnpm compact test
pnpm compact test:integration
pnpm compact test:postgres
pnpm compact build
pnpm compact openapi:check
pnpm compact security:scan
```

`pnpm compact <gate>` uses the approved MDL 0 runner. It invokes pnpm's JavaScript
entrypoint with Node so Windows `.cmd` wrappers require no shell quoting. Full logs
remain in ignored `.harness/logs/`. Exit codes are preserved.

Finance adds migrations `0003_finance_core` and `0004_monthly_budgeting`, applied through the same Drizzle
migrator. `pnpm test:postgres` validates it and ownership/RLS in a disposable
PostgreSQL 17, never the hosted database. Generate/verify the frontend contract
with `node --import tsx scripts/finance-contract.ts [--check]` and run the harness
with `node .codex/scripts/test-harness.mjs`.

## HTTP contract

| Route | Authentication | Behavior |
| --- | --- | --- |
| GET `/api/v1/health/live` | Public | Process liveness, no external services |
| GET `/api/v1/health/ready` | Public | Bounded PostgreSQL `SELECT 1` probe |
| GET `/api/v1/me` | Bearer | Identity and profile or null; no writes |
| PUT `/api/v1/me/profile` | Bearer | Idempotent create/replace of own profile |
| GET `/api/v1/openapi.json` | Public | Canonical OpenAPI document |

Interactive `/docs` exists only in development. The stable artifact is
[`openapi/openapi.json`](openapi/openapi.json). Generate with `pnpm openapi:generate`;
`pnpm openapi:check` fails on drift. It needs no database, provider credentials or
network. Front should consume an artifact pinned to a backend commit, never import
backend files through the filesystem. Responses and bodies derive from TypeBox.

See [operations](docs/BACKEND_OPERATIONS.md) for environment, migrations, external
setup, test database safety and deployment; [architecture](docs/ARCHITECTURE.md) for
boundaries and [ADR 0001](docs/adr/0001-backend-foundation.md) for durable decisions.

Monthly budgets use `/api/v1/finance/budgets/:month` with an explicit currency.
The backend derives owner and profile timezone; monetary JSON remains exact
minor-unit strings. Existing financial data and Auth flows are preserved.

Finance details: [architecture](docs/arquitetura.md), [requirements/API](docs/requisitos.md),
[Money/transfer/balance rules](docs/regras-negocio.md), [database/RLS](docs/banco-de-dados.md).

Financial Goals expose `/api/v1/finance/goals` and `/:goalId/events`. Migration
`0005_financial_goals` adds two private `app` tables with RLS. Money stays in
BIGINT minor units and JSON strings. The server derives progress, required
monthly contribution and a simple no-interest completion month using the
profile timezone. Paused and archived goals reject new events; safe retries
replay existing events. Apply migrations only to the intended DEV environment
after review and disposable PostgreSQL/RLS validation; preserve verified TLS.

## MDL 5 — Recurrences, Subscriptions & Financial Calendar

Branch `codex/mdl5-recurring-calendar` adds financial expectations, independent of
confirmed transactions. Nine JWT-protected endpoints under Finance provide rule
CRUD, pause/resume/archive, a DATE calendar and a next-30-days subscription radar.
The anchored engine handles month-end clamp and leap-year restoration. Money and
per-currency totals stay exact BIGINT/string values; projected net is not balance.
Migration `0006_financial_recurrences` adds only the private RLS-protected table.
Supabase DEV received it after reviewed SQL and disposable PostgreSQL 17/RLS PASS;
verified TLS and exact snapshots confirm all nine existing tables were preserved.
No remote test records were inserted. See the Finance docs for limits and the
[human gate checklist](docs/requisitos.md#mdl-5--recurrences-subscriptions--financial-calendar).
MDL5 and MDL6 are COMPLETE; REAL_GATE=PASS; merged to main.

## MDL 6 — Net Worth / Patrimônio

MDL6 COMPLETE, integrado em `main`: patrimônio por moeda,
saldos assinados de contas somente leitura, itens externos, avaliações append-only,
posição histórica e arquivamento terminal. Sem FX, projeções ou alteração do ledger.
O gate humano foi aprovado em 2026-10-05. Regras, API, schema, limites e roteiro estão em
[Net Worth](docs/net-worth.md).

## MDL 7 — Yield Engine / Rendimentos

Explicit account yield profiles and immutable rule versions; fixed/CDI/Selic/
savings estimates, bounded BCB cache, estimated IR/IOF, comparison and history.
No real ledger/net-worth writes, FX or paid sources. TypeBox/OpenAPI and generated
Front client remain canonical. [Model, sources and human gate](docs/YIELD_ENGINE.md).
Migration0008 follows the existing Drizzle workflow after disposable PG17/RLS
validation. REAL_GATE=PASS; MDL7_STATUS=COMPLETE. Closure PR/merge/main CI PASS. Local ports remain3001/3101.

## MDL 8 — Cards, invoices and installments

Managed credit accounts, immutable billing cycles, atomic installment purchases,
derived invoices and FIFO transfer payments. Purchase is EXPENSE; payment is
TRANSFER, never a second expense. Recognized balance and future commitments stay
separate. No payment processing, PAN/CVV, FX, interest or automatic Yield profile.
[Accounting model and limits](docs/CARDS_INVOICES.md). Migration0009 applied to DEV
after disposable PG17/RLS; earlier data and human-gate records preserved.
Automated gates and the user-approved real Cards gate passed. No MDL9 implementation.
