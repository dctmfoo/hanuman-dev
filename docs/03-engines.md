# Engine adapters

## Requirement
Models and CLI argument formats change. We want an abstraction layer so updates happen in one place.

## Engine roles (intended)
- Planner: Claude Code (Opus default)
- Executor: Codex CLI (gpt-5.2-codex default)
- Reviewer: Claude Code (Opus) + Codex review
- Compound: cheaper model (Sonnet / Codex)

## Current implementation (v0.1)

- Only the **Codex** adapter is implemented and wired into the executor today.
- A **FakeCodex** adapter exists for tests/smoke runs.
- Claude Code adapter is planned but not yet implemented.

See: `docs/05-status-and-roadmap.md`

## Adapter interface (concept)
Each adapter provides:
- `runPlan(input, config)`
- `runTask(story, repo, config)`
- `runReview(diff, config)`

## Command templates
Store command templates in `HALO_HOME/engines/*.json`.

Example: `codex.json`
```json
{
  "bin": "codex",
  "exec": ["exec", "--full-auto", "-m", "{{model}}", "-c", "reasoning.effort=\"{{reasoning}}\"", "-"],
  "review": ["review", "--json"]
}
```

Example: `claude-code.json`
```json
{
  "bin": "claude",
  "plan": ["--model", "{{model}}"],
  "review": ["--model", "{{model}}"]
}
```

This keeps the orchestrator stable even when CLIs change flags.
