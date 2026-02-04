# AGENTS.md

Agent-focused repo notes for **hanuman-dev** (a repo-agnostic, replayable Ralph-style executor).

## OpenAI docs via MCP (MANDATORY)

**Always use the OpenAI developer documentation MCP server** whenever you need to work with (or verify details about) the **OpenAI API**, **ChatGPT Apps SDK**, **Codex**, etc. Do this by default so Wags does not have to explicitly ask.

## Quickstart (commands agents should run)

```bash
pnpm install
pnpm test
pnpm build
```

Useful focused checks:

```bash
pnpm test -t "<test name substring>"
```

## Project structure (where to look)

- `src/` — implementation
  - `src/cli.ts` — CLI entrypoint (`hanuman-dev`)
  - `src/config/*` — repo config (.halo/hanuman-dev.json) schema + resolution
  - `src/executor/*` — run loop + validation
  - `src/engines/*` — engine adapters (Codex-first; other engines behind selection)
  - `src/run/*` — run directory contract (run.json, events.jsonl, checkpoints, artifacts, debug bundles)
- `docs/` — specifications and roadmap
- `scripts/` — local helper scripts (e.g. smoke runs)

## Workflow rules (important)

- **Keep git worktree clean** before starting work (the CLI enforces this).
- Prefer **small, reversible changes**; avoid unnecessary dependencies.
- Preserve **v0.1 contract semantics** (checkpointed, deterministic resume).
- Default behavior of `hanuman-dev run` must remain **Codex-only** unless explicitly changed by spec.

## Boundaries / safety

- Do not modify generated/derived outputs unless the task explicitly requires it:
  - `dist/`
  - `node_modules/`
- Do not commit secrets.
- Repo-local config lives under `.halo/` (this repo may contain `.halo/.gitignore` patterns).

## Style / conventions

- TypeScript, ESM imports.
- Prefer explicit types and small pure helpers.
- When adding config keys, update both:
  - Zod schema in `src/config/schema.ts`
  - merge/precedence logic in `src/config/config.ts` (if applicable)

## When changing behavior

- Update the relevant spec/roadmap doc in `docs/`.
- Add tests for new parsing/selection logic.
- Ensure `pnpm test && pnpm build` are green before final output.
