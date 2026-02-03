# hanuman-dev v0.1 — Functional Spec (non-developer)

**Audience:** Wags + anyone who wants to understand *what the tool does* without reading code.

**Source of truth:** This document defines what “v0.1” means. Code changes must either:
- implement this spec, or
- be explicitly deferred to a later version.

---

## 1) What this tool is

`hanuman-dev` is a command-line tool that runs a **repeatable development workflow** in *any* git repository, driven by a small task file (“PRD JSON”).

v0.1 prioritizes:
- **Replayability** (everything recorded)
- **Resume** (checkpointed, deterministic)
- **Debuggability** (explicit stop reasons + debug bundles)

v0.1 does **not** try to be clever. Multi-model orchestration and auto-remediation are explicitly deferred.

---

## 2) Inputs

### 2.1 Repository
You run the command inside a git repo.

### 2.2 PRD JSON file
You provide a `prd.json` file that lists “stories” (small tasks). Each story has:
- `id` (unique)
- `title`
- `size` (only **S** or **M** allowed in v0.1)
- `acceptance` (bullet list of completion criteria)

### 2.3 CLI flags
v0.1 supports:
- `hanuman-dev run --prd <path>`
- `--resume <runDir>`
- `--sandbox`
- `--ask-for-approval`
- `--profile <name>`
- `-c key=value` (repeatable)

---

## 3) What it does (behavior)

### Step A — Create a run directory
Every execution creates (or resumes) a **run directory** under `HALO_HOME` (default `~/.halo`).

### Step B — Validate safety + inputs
Before doing work:
- Confirms you are in a **git repository**
- Confirms the repo is **clean** (no uncommitted changes)
- Loads and validates the PRD:
  - schema version matches
  - max 10 stories
  - only S/M sizing
  - story IDs must be unique
- If resuming, confirms the PRD file is the **same** as originally used (hash match)

If any validation fails, the run stops with a clear **stop reason** and writes a failure **debug bundle**.

### Step C — Execute stories using Codex
Stories are executed one at a time via the Codex CLI:
- uses `codex exec --json` and appends the JSONL stream to `events.jsonl`
- uses `--output-schema` so Codex must emit a machine-checkable result

**Machine-checkable per-step output requirement (v0.1):**
Each story must produce a parseable JSON object with at least:
- `status` in `{ok, needs_human, failed}`
- `summary` (string)

If Codex exits 0 but does not produce valid output, the story is treated as a failure (because automation depends on the output).

### Step D — Checkpointing + resume
The run stores checkpoint state so resume is deterministic.
On `--resume`, the executor continues from the next unfinished story.

### Step E — Stop reasons + debug bundles
Every run ends with a stop reason. Examples:
- `SUCCESS`
- `VALIDATION_FAILED`
- `DIRTY_WORKTREE`
- `NOT_A_GIT_REPO`
- `ENGINE_ERROR`

On failure, the run directory contains `debug_bundle/` with:
- summary
- run.json snapshot
- tail of Codex events
- git status + diff (best effort)

---

## 4) Outputs (run-dir contract)

A run directory must contain:

```
<HALO_HOME>/runs/<runId>/
  run.json
  events.jsonl
  checkpoints/
    state.json
  artifacts/
  debug_bundle/
```

### 4.1 run.json (human + machine readable)
`run.json` must make it possible to answer:
- what PRD was run?
- what repo + git state?
- did it succeed?
- if it failed, why?
- what story is next / what’s complete?

Required concepts (field names may evolve, but semantics must hold):
- contract version
- run id
- start time / end time
- repo path + branch + head sha
- codex version (+ best-effort features/help capture)
- cli args/config used
- progress (completed stories + current/next)
- stop reason + exit status

### 4.2 events.jsonl
Append-only raw JSONL stream from Codex.

### 4.3 checkpoints/state.json
Checkpoint source of truth for resume.

### 4.4 artifacts/
Per-story outputs that summarize Codex result for that story.

### 4.5 debug_bundle/
Failure-only bundle for rapid diagnosis.

---

## 5) v0.1 Acceptance checklist
v0.1 is “done” when:
- Running with a valid PRD creates a run directory with the contract structure.
- Failures always have explicit stop reason + debug bundle.
- Resume works reliably and does not lose progress.
- The executor never marks a story as complete without machine-checkable output.

---

## 6) Explicit non-goals (v0.1)
Not part of v0.1:
- multi-model orchestration (Claude planner/reviewer routing)
- auto-remediation / self-healing
- PR creation/merge, CI wiring
- UI/TUI
