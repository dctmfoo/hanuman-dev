# hanuman-dev v0.1 — PRD (Codex-first Ralph-style executor)

## Goal
Ship a **repo-agnostic, replayable executor** (Ralph-style loop) that runs small, checkpointed stories using **Codex CLI as the primary engine**.

v0.1 is about **loop reliability** and **durable run artifacts** — not fancy multi-model orchestration.

## Non-goals (explicitly deferred)
- Multi-model orchestration (planner/reviewer split, auto model routing)
- Auto-remediation / self-healing loops
- PR creation, auto-merge, CI integration
- Rich UI (TUI/web)
- Full `.halo/config` spec (keep minimal)

## User story
As a developer, I can run:

- `hanuman-dev run --prd ./prd.json` in any git repo

…and get a durable run directory with:
- machine-checkable metadata
- full Codex event stream
- checkpoints that make resume deterministic
- explicit stop/failure reasons and a debug bundle on failure

## Key requirements

### R1. Versioned run-dir contract
Every run writes to a new directory:

```
<HALO_HOME>/runs/<runId>/
  run.json
  events.jsonl
  logs.jsonl
  status.json
  checkpoints/
  artifacts/
  debug_bundle/
```

**Contract version:** `0.1`

`run.json` MUST include:
- runId, contractVersion
- startTime, endTime (when known)
- repo: path + git info (branch, head sha)
- codex: version + features list
- cli args + resolved config
- stopReason + exitStatus

`events.jsonl` MUST be the raw JSONL stream from `codex exec --json` (append-only).
`logs.jsonl` MUST be structured JSONL emitted by hanuman-dev (levels + event names).
`status.json` MUST be a small, frequently updated status snapshot.

### R2. Codex-first execution via new CLI primitives
Executor uses Codex CLI with:
- `codex exec --json` (capture to `events.jsonl`)
- `--output-schema` for machine-checkable final outputs per step
- sandbox + approvals (`--sandbox`, `--ask-for-approval`) when enabled
- profiles / config overrides (`--profile`, `-c key=value`) as passthrough

### R3. Clean worktree policies + base sync
Before executing stories:
- reject dirty worktree (configurable later; v0.1 = strict)
- record base ref/sha in `run.json`
- attempt `git fetch` (best-effort) and record outcome

### R4. Resume semantics (checkpointed, not vibes)
- Checkpoints are written before/after each story.
- `hanuman-dev run --resume <runDir>` resumes from the last completed checkpoint.
- Resume MUST be deterministic: story index + inputs come from checkpoint state.

### R5. Explicit stop reasons + failure debug bundles
Stop reasons are explicit enums (e.g. `SUCCESS`, `DIRTY_WORKTREE`, `VALIDATION_FAILED`, `ENGINE_ERROR`, `APPROVAL_DENIED`, `USER_ABORT`).

On failure, write `debug_bundle/` with:
- `summary.md`
- `run.json` snapshot
- last N lines of `events.jsonl`
- last N lines of `logs.jsonl` (when available)
- `git-status.txt`, `git-diff.patch` (best-effort)

### R6. Story sizing validation (conservative)
Executor validates the input `prd.json` and rejects:
- unknown schema version
- stories marked > `M` (i.e. `L`/`XL`) in v0.1
- more than 10 stories by default (configurable later)

## Interfaces

### CLI (v0.1)
- `hanuman-dev run --prd <path> [--profile <name>] [-c key=value...] [--sandbox] [--ask-for-approval] [--resume <runDir>]`

### prd.json (v0.1)
A Ralph-style PRD JSON that is machine-validated.

- `schemaVersion`: `0.1`
- `title`: string
- `stories`: array of stories

Each story:
- `id`: string
- `title`: string
- `size`: `S|M|L|XL` (v0.1 allows only S/M)
- `acceptance`: string[]
- `constraints`: string[] (optional)

## Acceptance criteria
- Running `hanuman-dev run --prd docs/examples/prd.json` creates a run dir with required structure.
- `run.json` includes codex version + features list.
- `events.jsonl` is populated with JSONL from Codex (or executor fails with a clear stopReason).
- Resuming a partially completed run continues from the next story.
- On failure, `debug_bundle/` is created with the expected files.

## Open questions / Claude review hooks
- Confirm exact Codex CLI flags for `--output-schema` and “features list” command output.
- Decide whether sandbox implies approvals by default.
- Decide whether to use `git worktree` in v0.1 (likely v0.2).
