# Project instructions

## Principles

- Deliver the smallest correct, secure change that meets the requested module.
- Inspect relevant code and existing conventions before editing.
- Prefer local, reversible diagnostics; report assumptions and verification.
- Keep production dependencies minimal and justify additions.

## Architecture

- Scope: backend; prioritize API contracts, database integrity, authentication, and server security.
- This repository is being bootstrapped. Record confirmed architecture in the
  `architecture` skill, not here.
- Keep product code, tests, documentation, and generated artifacts separated.
- Treat `docs/PROJECT_STATE.md` as the current handoff snapshot, never history.
- Do not implement a later module until its prerequisite module is approved.
- Prefer repository-local conventions once they exist; revise this summary only for durable policy.

## Critical security

- Never expose, commit, log, or paste secrets. Use ignored local env files only.
- Validate untrusted input at boundaries; use least privilege for tools and services.
- Do not weaken authentication, authorization, sandboxing, or approvals to unblock work.
- Review dependency and external-service changes with the security skill.
- Keep development-only instrumentation out of the shipped product unless requested.

## Git

- Preserve unrelated working-tree changes. Do not reset, force-push, or rewrite history.
- Keep commits focused; do not commit harness logs, caches, builds, or secrets.
- Check `git status` before handoff and name the tested commit in PROJECT_STATE.
- Use the repository's current branch; create a `codex/` branch only when a new branch is needed.

## Quality gates

- Run the narrowest relevant checks before broad checks.
- Use `.codex/scripts/compact-command.mjs` for verbose test, lint, typecheck, and build commands.
- A nonzero command exit is a failure; inspect its complete local log before diagnosing.
- Add or update tests for behavior changes; state checks not run and why.
- Preserve full diagnostic evidence locally even when the model-facing output is compact.
- Treat an unrun validation as unknown, not as passing.

## Main commands

- Harness self-test: `node .codex/scripts/test-harness.mjs`
- Compact command: `node .codex/scripts/compact-command.mjs -- <command> [args...]`
- Codex config check: `codex --strict-config --help`
- Inspect a retained log: use targeted `rg` or a line range, not the full file.

## Context policy

- Keep one chat per coherent unit of work; compact to continue the same objective.
- Fork only for genuinely divergent work. Do not load large docs proactively.
- Search with `rg` before reading files; read only useful ranges and avoid giant logs.
- Do not repeat already established results in a turn. Consult full logs by range when needed.
- Read specialized documents only after the task demonstrates that they are relevant.

## Skills and integrations

- Use a matching Skill before specialized work; keep details in `.agents/skills/`.
- Keep this file concise; move durable specialist procedures into the appropriate Skill.
- Prefer local CLI for compact, local tasks. Enable MCP/plugin tools only for a real task.
- GitHub, Exa, and OpenAI Developers are optional; do not install paid integrations automatically.
- Exa must remain on a free-compatible path and never silently upgrade service usage.
- Do not add MCP configuration merely because a connector happens to be installed.

## Model routing and subagents

- Use the primary model for implementation; use an economical model for large reading or log analysis when available.
- Use highest capability for complex security or architecture decisions.
- Do not use subagents by default. Use them only for justified isolation, independent research, extensive reading, or real parallel work.
- Record the reason when delegated work materially affects a technical decision.

## Checkpoints

- At a stable boundary, update PROJECT_STATE with current facts only.
- Put decisions, commands run, blockers, and the exact next task in the snapshot.
- Keep historical rationale and diffs in Git, not PROJECT_STATE.
- Before compaction or a handoff, leave enough state for another agent to continue without rereading broad documentation.
- If a checkpoint is blocked, state the concrete dependency and the owner needed to resolve it.
