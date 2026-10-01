# Beter Life — Backend

Node **24 LTS**, pnpm **11.19.0**, TypeScript strict/ESM, Fastify 5.
Frontend is a separate repository and consumes the versioned OpenAPI artifact.

MDL 2 Finance is the first functional bounded context: own accounts/categories,
income/expense, idempotent atomic transfers, calculated balances and period
summary. Auth, profile, PostgreSQL TLS and the approved infrastructure remain
unchanged. No MDL 3 features are implemented.

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

Finance adds migration `0003_finance_core`, applied through the same Drizzle
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

Finance details: [architecture](docs/arquitetura.md), [requirements/API](docs/requisitos.md),
[Money/transfer/balance rules](docs/regras-negocio.md), [database/RLS](docs/banco-de-dados.md).
