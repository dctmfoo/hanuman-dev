# Architecture

`halo-workflow` is a repo-agnostic workflow orchestrator for agentic development.

## Core components

### 1) Orchestrator (state machine)
A deterministic state machine drives the workflow:

- INTAKE → PLAN_DRAFT → PLAN_REVIEW → EXECUTE → REVIEW → COMPOUND → DONE
- plus: NEEDS_HUMAN, FAILED, PAUSED

All state is persisted under `HALO_HOME` so the workflow can resume after restarts.

### 2) Engine adapters
`halo-workflow` does not hard-code CLI invocations throughout the codebase.
Instead it uses adapter modules:

- `CodexEngine` (Codex CLI)
- `ClaudeCodeEngine` (Claude Code CLI)

Adapters use centrally defined command templates so CLI argument changes can be updated once.

### 3) Repo config
Per-repo config lives in `.halo/config.json` (or YAML later), defining:

- commands: test/build/lint
- boundaries: neverTouch globs
- PRD conventions: where to write plans and task breakdowns

### 4) Durable artifacts
Workflow artifacts are stored outside the repo:

- `~/.halo/workflows/<id>/brief.json`
- `~/.halo/workflows/<id>/prd.md`
- `~/.halo/workflows/<id>/prd.json`
- `~/.halo/workflows/<id>/progress.jsonl`
- `~/.halo/workflows/<id>/review.md`

The repo working directory remains clean.
