# Roadmap C — Claude Code adapter + stage selection (Detailed Spec)

**Status:** Spec (source of truth for next implementation task)

## Context

We have a working v0.1 Codex-first executor with:
- run-dir contract (`run.json`, `events.jsonl`, `logs.jsonl`, `status.json`, `checkpoints/`, `artifacts/`, `debug_bundle/`)
- deterministic resume (`nextStoryId`)
- working Codex adapter for **codex-cli 0.94.0**
- repo-local config (`.halo/hanuman-dev.json`) and stage config plumbing for `stages.work`

Roadmap C introduces a **Claude Code adapter** but must not explode scope. We want to **wire the adapter + stage selection** without implementing full multi-stage orchestration yet.

## Goal

Add a **Claude Code engine adapter** and a minimal **stage→engine selection** mechanism so that:
- `work` stage stays Codex (default)
- future `plan/review` stages can use Claude Code (Opus) without redesigning everything

This is primarily **plumbing** + contract consistency.

## Non-goals (explicit)
- Do not implement the full Plan→Work→Review→Compound workflow loop.
- Do not implement multi-model orchestration across multiple stages in one `run`.
- Do not implement auto-remediation.
- Do not add any UI.

## Current Behavior (baseline)
- `hanuman-dev run` executes a PRD (stories) using Codex.
- `--sandbox` maps to `codex exec --sandbox workspace-write`.
- Output schema is written to `artifacts/output-schema.json` and passed via `--output-schema <file>`.
- We capture final output via `-o artifacts/codex-last-message.json`.

## Proposed Behavior

### 1) Add Claude engine adapter
Create `src/engines/claude.ts` that implements a minimal engine interface compatible with our executor:

- **Input:** prompt text + (optional) output schema
- **Output:** machine-checkable JSON output for the final response (when schema is provided)

Implementation should use Claude Code CLI (`claude`) and **Opus** model:

- Non-interactive mode only (no TUI)
- Must support:
  - capturing stdout/stderr
  - exit code + signal
  - a way to require JSON output (either via prompt discipline or CLI json-schema flag if available)

**Adapter contract:**
- Must return `EngineExecResult`:
  - `code`
  - `signal?`
  - `lastOutputJson?`  (the JSON object we want)
  - `stderrTail?`

### 2) Extend repo config schema for plan/review stages (no execution yet)
Update `.halo/hanuman-dev.json` schema to allow:

```json
{
  "stages": {
    "plan": { "engine": "claude", "model": "opus", "reasoning": "high" },
    "review": { "engine": "claude", "model": "opus", "reasoning": "high" },
    "work": { "engine": "codex", "sandbox": true }
  }
}
```

Even if `plan/review` stages are not executed, the config should be parseable and printable via `hanuman-dev config print`.

### 3) Stage selection (minimal)
Implement a function that resolves which engine to use for a given stage.

- For now, the executor only runs the `work` stage, but it should select its engine via resolver.
- Default engine mapping:
  - `work` → `codex`
  - `plan/review` → `claude` (configurable)

### 4) Tests
Add unit/integration tests that do **not require Claude** installed.

- Add a **FakeClaudeEngine** (similar to FakeCodex) OR make the claude adapter optional and test only selection logic.
- Add tests:
  - config schema accepts `stages.plan/review` blocks
  - `config print` shows resolved stage config
  - stage resolver chooses expected engine

## Acceptance Criteria

- `src/engines/claude.ts` exists and is wired behind an engine selection interface.
- `.halo/hanuman-dev.json` schema supports `stages.plan` and `stages.review` blocks (parse + print).
- `hanuman-dev config print` includes plan/review stage config if present.
- No behavior changes for existing users running `hanuman-dev run` with Codex only.
- Tests pass in CI without requiring Claude installed.

## Implementation Notes / Constraints

- Keep the repo clean and changes minimal.
- Prefer small, composable modules:
  - `src/engines/*`
  - `src/config/*`
  - `src/stages/*` (optional)
- Do not add dependencies unless necessary.

## Next Task Request (for xhigh)

Implement Roadmap C **exactly** as specified above.

Deliverables:
- Code + tests
- Update `docs/05-status-and-roadmap.md` to mark:
  - Roadmap A: done
  - Roadmap B: done (work stage plumbing)
  - Roadmap C: in progress / done depending on result
