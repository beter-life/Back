# Project state

| Field | Value |
| --- | --- |
| MODULE | MDL12 — Financial File Import (CSV, OFX, PDF) |
| MDL12_STATUS | REAL_GATE_PASS_PENDING_MERGE |
| STATUS | REAL_GATE_PASS_PENDING_MERGE |
| REAL_GATE | PASS |
| MDL12_HUMAN_GATE | PASS |
| MDL12_HUMAN_TESTS | 9/9 |
| READY_FOR_MDL13 | false |
| HUMAN_APPROVAL | User reported PASS for all nine scenarios: CSV/OFX/PDF, normalization, preview, duplicate detection, Inbox, financial isolation and ownership; recorded2026-10-16. No extra hosted fixtures or financial actions by the agent |
| BRANCH | codex/mdl12-financial-file-import |
| BASELINE | Fetched main unchanged at Back0b039738287b10c94ac3ae1074bbb495852f81bc and Frontce0d7322a36e45240fb4e726bf1fef43ea47fd7c; each main is an ancestor of its MDL12 branch; no unexpected divergence |
| MIGRATION_0013_DEV | PASS |
| DRIZZLE_MIGRATIONS | 13/13 |
| DEPLOYMENT_EVIDENCE | Previously authorized deployment of0013 from Backd262b26adc4ce843d09474f0ac67a403d025d3ee, verified2026-10-16. Ledger13/13 and zero pending; expected DDL/RLS/ownership/history guards exact; all25 prior table counts/digests preserved and zero financial changes caused by migration. These are deployment-time observations; no DEV operation repeated during closure |
| PREVIEW_EXPIRATION_EVIDENCE | Automated PostgreSQL test advances the injected clock by86400001ms, observes EXPIRED and parsed=NULL/parsed_bytes=0, retains receipt/candidate identity, and recovers the same batch without duplication. Front integration/Playwright cover expired UI using fixtures. Links and limits in FINANCIAL_FILE_IMPORT.md; no separate24h wall-clock DEV observation claimed |
| RETENTION_LIMIT | Logical expiry at24h; physical parsed-cell cleanup on subsequent owner access/new analysis, without a background cleanup scheduler. Minimal receipts remain; no proof of deletion exactly at the wall-clock deadline |
| BACKUP_RESTORE_TEST | NOT_RUN — authenticated decryption, archive hashes/TOC/full read passed; restoring into a database and validating recovery remains an operational task |
| BACKUP_SCOPE | Application app+Drizzle backup only, AES-256-GCM and Windows DPAPI CurrentUser key, restricted ACL. Supabase-managed Auth/Storage/roles excluded. Preserve ignored Back/.harness/tmp/mdl12-dev-deployment/backup-verified and RECOVERY.md; key recovery needs this Windows profile/machine |
| LEAKED_PASSWORD_PROTECTION | DISABLED_PREEXISTING — prior Supabase advisor finding, recorded during deployment; Auth settings unchanged. Remediation link in FINANCIAL_FILE_IMPORT.md; no new DEV query |
| LIMITATIONS | Documented CSV/OFX variants only; digital PDF layout only, no OCR, no complete bank reconciliation; worker heap limit is not OS RSS isolation. Automated Chromium desktop/mobile emulation and keyboard coverage do not certify all real devices, browsers, screen readers or WCAG conformance |
| PRESERVATION | Finance Core, financial records, Auth V2, RLS, all migrations including deployed0013, Inbox identifiers/sources and Beter Life branding unchanged by closure; env/backup evidence remain ignored |
| LOCAL_GATES | Final closure rerun PASS:292 unit,196 disposable PostgreSQL17 integration, lint, typecheck, build, OpenAPI, Back and actual Front contract drift, compiled synthetic examples, secret scan and harness. MDL0–MDL11 suites retained |
| PUBLICATION | Only closure documentation and two synthetic documentation examples are eligible for commits. Publish existing branches without force; verify final branch/PR CI on actual final HEADs. PR descriptions and delivery record carry final SHAs/run links, not the initial deployment SHAs |
| PROMOTION | Two MDL12 PRs to main are authorized; merge requires a new explicit user instruction. No new COMPLETE checkpoint, MDL13 or automatic merge |
| OPERATIONAL_PENDING | Isolated backup restoration test; separate security-setting review for leaked-password protection; optional wall-clock24h/cleanup observation and broader real-device/accessibility evaluation |
| NEXT | Finish local/branch/PR checks, then await explicit user authorization for final promotion; READY_FOR_MDL13 remains false |
| LAST_TESTED_SOURCE | d8f4abf18d3fe71064100687037d6eb2d8ec7ddb; subsequent deployment and closure changes are documentation only |
| IMPLEMENTATION | Bounded CSV/OFX/PDF parser -> explicit mapping/preview -> selected PENDING MDL11 proposals plus immutable receipts. Exact minor units; owner/file/external-ID idempotency; separate ordinary MDL11 confirmation posts once to unchanged Finance Core |
| SECURITY | JWT.sub ownership; private app schema, owner-only SELECT RLS, denied client writes, compound owner FKs and immutable receipts; no Auth/JWT/JWKS/TLS setting changes |
| SOURCE_CI | Initial deployment HEADd262b26: [PASS38914394235](https://github.com/beter-life/Back/actions/runs/38914394235). Final closure CI is verified independently on the new HEAD; [branch runs](https://github.com/beter-life/Back/actions?query=branch%3Acodex%2Fmdl12-financial-file-import) |
| GUIDE | [Architecture, evidence and operational limits](./FINANCIAL_FILE_IMPORT.md); Front/docs/FINANCIAL_FILE_IMPORT.md preserves the nine ordered human scenarios |
