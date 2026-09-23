# Backend operations

## Environment

Only config modules read service environment. Invalid values stop startup with a
variable name, never its secret value. `.env.example` contains no credentials.

| Variable | Meaning |
| --- | --- |
| NODE_ENV | development, test or production |
| DATABASE_URL | PostgreSQL URL; required outside tests |
| TEST_DATABASE_URL | Tests only: loopback host, DB named `beter_life_test` or `beter_life_test_*`; must differ from DATABASE_URL |
| DATABASE_SSL | `verify-full` or `disable`; production requires verified TLS |
| DATABASE_CA_CERT | Optional PEM provider CA; never disable certificate verification |
| DATABASE_POOL_MAX | 1–20, default 5; budget across all service replicas |
| SUPABASE_URL | Required HTTPS origin; issuer/JWKS paths derived from it |
| JWT_ALGORITHM | ES256 default, or RS256 to match provider signing key |
| CORS_ORIGINS | Required comma-separated exact origins; HTTPS in production |
| HOST / PORT | `0.0.0.0` / 3001 defaults; Render supplies PORT |
| LOG_LEVEL | Pino level; info default, silent in tests |
| BODY_LIMIT_BYTES | 16384 default, maximum 1 MiB |
| RATE_LIMIT_MAX | Requests per minute per IP/process; 100 default |
| TRUST_PROXY_HOPS | 0 default; 1 only behind a verified one-hop reverse proxy |
| SHUTDOWN_TIMEOUT_MS | 15000 default; bounded final forced exit if drain hangs |

URL TLS query parameters are rejected so they cannot override verified connection
settings. Use `DATABASE_SSL` and optional CA instead. No anon/service-role key or
JWT shared secret is required by this API.

## PostgreSQL and migrations

Use a direct or Supabase session-pooler URL for the persistent service and schema
migrations. `pg` + Drizzle use parameterized SQL and one bounded pool; the driver
does not prepare named statements by default. Do not use transaction pooling for
DDL. Never expose the `app` schema through Supabase Data API or grant it to anon /
authenticated roles. Configure a separate backend SQL role restricted to profile
SELECT/INSERT/UPDATE and schema USAGE for runtime; run migrations using a schema
owner credential in a controlled release session. Never use an auth service-role
API key as a substitute for PostgreSQL credentials.

Schema changes: edit `src/db/schema`, run `pnpm db:generate`, review and commit SQL
and journal/snapshots, then `pnpm db:migrate`. Initial SQL is
`drizzle/0001_profiles.sql`. The migration launcher uses Drizzle's programmatic
migrator over the generated SQL journal, with centralized TLS/test-target checks
and sanitized failures; this avoids Drizzle CLI connection errors leaking URLs.
It does not use schema `push`. Back up and review before production DDL; execute
migrations once per release, never per request or automatically on every startup.

The app schema revokes PUBLIC usage. Table owner or specifically granted runtime
role remains the trust boundary. No passwords/access tokens/refresh tokens are
stored in profiles. Timestamp values serialize as ISO UTC.

## Tests

Unit tests use in-memory repositories and generated signing keys; they exercise
real jose verification, bad claims/signatures and local HTTP JWKS discovery.
Fastify inject tests cover HTTP and ownership independently of shared databases.

Integration requires an explicitly provided TEST_DATABASE_URL; missing/unsafe
targets fail, not skip. Use disposable PostgreSQL 17 on loopback. CI provides a
fresh service database, runs the actual migration command, reapplies migrations
idempotently and exercises profiles/concurrency through PostgreSQL. Its static
password is solely for the disposable runner service, never a production secret.
Local Docker is optional; CI remains the real PostgreSQL gate when unavailable.
`pnpm compact test:postgres` starts a uniquely named PostgreSQL 17 container on a
random loopback-only port, applies migrations, runs integration, and stops/removes
only that labeled disposable container. Its temporary trust authentication is
never exposed on external interfaces. Local existing databases are untouched.
No test drops a database or touches the shared development/production database.

## Supabase external setup

In the account UI, provision/select the intended project, enable an asymmetric
ES256 (or explicitly configured RS256) signing key and make it active. Configure
the intended providers and client redirect URLs. Do not silently fall back to
legacy shared-secret verification. Supply the actual project HTTPS URL and database
connection via secure environment fields; use the provider CA if needed.

A real validation still requires an actual authenticated user's access token and
the configured provider database: verify JWKS, migrate, probe readiness and call
`me`/profile with that identity. Never paste tokens into logs or versioned files.
Local cryptographic fixtures are not evidence of real Supabase integration.
Offline JWT validation honors expiry, not immediate session logout/revocation;
use short provider token lifetimes. Sensitive future actions may need an online
session check; that is outside this foundation module.

## Render

`render.yaml` prepares a free Node 24 web service with manual deployment, secure
environment prompts and `/api/v1/health/ready`. The blueprint has no secrets and
does not deploy or create billable resources by itself. Before deployment, connect
the Back repository/account, choose the reviewed branch, fill required environment
fields and apply migrations with the controlled release credential. Keep the
runtime SQL user separate. Free services have no paid pre-deploy command here.

The one-hop proxy setting assumes the service is reachable only through Render's
edge; verify that topology before enabling it elsewhere. Liveness never calls
external services. Readiness has bounded database timeouts. Cold starts and sleep
are supported; no artificial keepalive pings are used. Actual deployment, TLS and
Supabase access are not validated until the external account setup exists.
