# Project state

| Field | Value |
| --- | --- |
| MODULE | MDL 1 — Platform Foundation & Identity |
| STATUS | BLOCKED_EXTERNAL_DB_CREDENTIAL |
| SCOPE | Backend |
| BRANCH | feat/mdl1b-backend-foundation |
| LAST_STABLE_COMMIT | 4746a885e20e1da9e322124f80d63a5e8cbc99e3 (profiles RLS migration and CI gates passed) |
| CURRENT_TASK | Real Auth/JWT integration gate |
| DONE | MDL 0 preserved; backend API/OpenAPI; Supabase 0001/0002, RLS and advisors verified; public JWKS exposes ES256; local PostgreSQL owner-isolation tests pass |
| BLOCKERS | `DATABASE_URL` absent from secure local Codex environment; hosted TLS/API persistence/health and Email Auth/signup/recovery/real JWT remain unverified |
| TESTS | Local lint, typecheck, unit, build, OpenAPI, secret scan, harness, and PostgreSQL 17 migrations plus 4 integration tests passed |
| NEXT | Add the `beter-life-dev` connection string to secure local `DATABASE_URL`; verify Email Auth settings, then validate a controlled user/JWT and the live backend |
