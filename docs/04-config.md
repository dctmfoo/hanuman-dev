# Repo config

Per-repo config file (recommended): `.halo/hanuman-dev.json`

`hanuman-dev init` creates this file plus `.halo/.gitignore`.

## Schema highlights (v0.1)
- `schemaVersion`: currently `0.1`
- `defaults`: global toggles for `sandbox` and `askForApproval`
- `stages`: per-stage overrides for `work`, `plan`, `review` (e.g., `engine`, `model`, `reasoning`, `sandbox`, `askForApproval`, `profile`, `configOverrides`)

Only the `work` stage executes today, but plan/review can be configured for future use.

## Precedence (high level)
1. Built-in defaults
2. Repo config (`.halo/hanuman-dev.json`) overrides defaults
3. For run-time stage settings, `stages.work` overrides global defaults
4. CLI flags override repo config for the current run

## Minimal example
```json
{
  "schemaVersion": "0.1",
  "defaults": {
    "sandbox": true,
    "askForApproval": false
  },
  "stages": {
    "work": { "engine": "codex" },
    "plan": { "engine": "claude", "model": "<plan-model>", "reasoning": "high" },
    "review": { "engine": "claude", "model": "<review-model>", "reasoning": "high" }
  }
}
```
Replace the `<plan-model>` and `<review-model>` placeholders with real model names.

## Path resolution
- Orchestrator state and artifacts live under `HALO_HOME`.
- Repo config stays inside the repo.
