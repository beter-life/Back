# ADR 0001 — Backend HTTP, persistence and identity boundaries

Status: accepted for MDL 1B implementation.

Fastify 5 + TypeBox provide runtime validation, serialization, TypeScript inference
and OpenAPI from route schemas. OpenAPI is the independent Front/Back contract;
there is no shared filesystem package. TypeScript 6 is pinned because the installed
typescript-eslint version explicitly rejects TypeScript 7. Node 24 LTS is pinned
by major in development, CI and Render; pnpm is version-pinned with a frozen lock.

PostgreSQL + Drizzle + node-postgres (`pg`) keep the domain independent of Supabase
database APIs. The persistent Node process uses a bounded pool with timeouts and
verified production TLS. Code-first SQL migrations are versioned, reviewed and
applied explicitly. The application schema is private, without a foreign key into
Supabase's auth schema. Application services enforce ownership on every operation.

Supabase Auth issues asymmetric JWTs. jose validates cryptography and claims using
the configured HTTPS JWKS. There is no legacy-secret fallback, password endpoint,
stored token or service-role authentication. Signing keys in tests are generated
locally; provider integration is a separate external gate.

Consequences: provider account setup, role grants and release migrations are
operational responsibilities; immediate logout revocation and multi-replica rate
limits need later explicit design. Database and identity provider can be replaced
without coupling clients to backend internals.

References checked during implementation:
- https://fastify.dev/docs/latest/Reference/TypeScript/
- https://github.com/fastify/fastify-type-provider-typebox
- https://orm.drizzle.team/docs/get-started-postgresql
- https://supabase.com/docs/guides/database/connecting-to-postgres
- https://supabase.com/docs/guides/auth/signing-keys
- https://render.com/docs/node-version
- https://render.com/docs/blueprint-spec
