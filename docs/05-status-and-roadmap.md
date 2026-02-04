# Status & Roadmap

This doc is here so other contributors/agents can pick up work without guessing.

## What exists today (v0.1)

### Implemented engines

- **Codex (real adapter)**
  - Code: `src/engines/codex.ts`
  - Used by: the v0.1 executor

- **Claude Code (adapter)**
  - Code: `src/engines/claude.ts`
  - Used by: stage resolver defaults (plan/review), wired for future use

- **FakeCodex (test adapter)**
  - Code: `src/engines/fakeCodex.ts`
  - Used by: `src/integration/fakeCodex.integration.test.ts` + `scripts/smoke-run.sh`

### Not implemented yet (despite docs/README intent)

- **Full multi-stage orchestration** (plan → work → review)
  - Intended: plan/review stages should run via Claude Code (Opus)
  - Current state: stage selection is wired, but only `work` executes

### CLI surface

- `hanuman-dev run --prd <path> [--resume <runDir>] [--sandbox] [--ask-for-approval] [--profile <name>] [-c key=value ...]`
- `hanuman-dev init` creates `.halo/hanuman-dev.json` + `.halo/.gitignore`.

### Global install readiness

`package.json` now supports global installs from a git checkout:
- `bin` points to `dist/cli.js`
- `prepare` runs `build` so `npm i -g .` works reliably
- `files` allowlist keeps the install footprint small

## Roadmap (near-term)

### A) Repo init + config UX (expected flow)
**Status: Done**

Desired UX:
1) `cd <repo>`
2) `hanuman-dev init`
3) edit `.halo/hanuman-dev.json` (optional)
4) `hanuman-dev run --prd prd.json`

Implementation plan:
- Implement `init` to create:
  - `.halo/hanuman-dev.json` (repo-local, tool-specific)
  - `.halo/.gitignore` (keeps run config out of git by default)
- Add `hanuman-dev config print` to show resolved config and sources.

### B) Stage → engine/model/reasoning configuration
**Status: Done**

Goal: per-stage settings, e.g.
- plan/review: Claude Code (opus, high reasoning)
- work: Codex (gpt-5.2-codex, low/medium)

Notes:
- "reasoning" is engine-specific; adapters should translate `low|medium|high` to the flags supported by each CLI.

### C) Claude Code adapter
**Status: Done (adapter + stage resolver, no multi-stage execution yet)**

- Add `src/engines/claude.ts`
- Teach the executor to select the engine per stage
- Update docs to match reality (and set defaults in init once implemented)

## Known doc mismatches to fix

- `docs/03-engines.md` currently describes an engine-template approach + Claude roles.
  - Reality: v0.1 uses a direct Codex adapter; templates aren’t implemented yet.
- `docs/04-config.md` calls the repo config `.halo/config.json`.
  - If we adopt the tool-specific file, it should become `.halo/hanuman-dev.json`.
