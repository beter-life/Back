# Backend architecture

`server.ts` validates environment, starts HTTP and handles SIGTERM/SIGINT.
`app.ts` composes plugins, contracts, database lifecycle and routes; inject tests
exercise the same composition with explicit dependency seams.

Request → bounded request ID / headers / CORS / IP rate limit → signature and
claim validation → profile service (ownership) → Drizzle repository → PostgreSQL.
There is one bounded pool per process, closed after HTTP draining. Query and
connection timeouts bound readiness and failed database access.

Authentication is isolated in `modules/auth`. It discovers only the configured
provider's JWKS; no token-supplied URL is used. ES256 is default; RS256 is an explicit
deployment choice. Algorithm, signature, issuer, audience, expiry, issued-at,
subject UUID, optional not-before and `role=authenticated` must pass. HS256 and
service-role tokens are rejected. Only `authUserId` becomes internal identity.

Authorization belongs to `profile/service.ts`, not controllers. It passes the
validated owner to every repository read/write. No body, query or custom header
can choose another owner. There is no password endpoint or token persistence.

`app.profiles` is provider-neutral SQL with UUID PK, unique authentication UUID,
display name, locale, timezone and UTC instants. The authentication UUID has no
cross-provider foreign key. Upserts preserve ID/created_at, and repeated identical
payloads preserve updated_at. Account deletion synchronization is future work.

TypeBox defines input/response types and JSON schemas; Fastify validates, serializes
and feeds OpenAPI from those schemas. Locale/timezone semantic checks use Intl.
App errors expose stable codes and request ID; SQL, stacks and tokens are omitted.

Pino logs JSON with route templates, IDs, status and duration. Request query/body,
credentials and raw errors are never automatically logged; redaction adds defense
in depth. Request IDs accept only 1–80 ASCII alphanumeric, underscore or hyphen.
The in-memory rate limiter is per process. Scaling requires a shared rate-limit
store or trusted edge controls, not an assumption of cluster-wide limits.
