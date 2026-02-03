# Repo config

Per-repo config file (recommended): `.halo/hanuman-dev.json`

(Note: `hanuman-dev init` is currently a stub; we will implement it to create this file + `.halo/.gitignore`.)

## Example
```json
{
  "projectName": "openai-agents",
  "commands": {
    "install": "pnpm install",
    "test": "pnpm test",
    "build": "pnpm build"
  },
  "boundaries": {
    "neverTouch": ["dist/**", "node_modules/**", "**/*.lock"]
  },
  "workflow": {
    "prdFormat": "prd.json",
    "defaultIterations": 10
  },
  "engines": {
    "planner": { "kind": "claude", "model": "opus", "reasoning": "high" },
    "executor": { "kind": "codex", "model": "gpt-5.2-codex", "reasoning": "high" },
    "reviewer": { "kind": "claude", "model": "opus", "reasoning": "high" }
  }
}
```

## Path resolution
- Orchestrator state and artifacts live under `HALO_HOME`.
- Repo config stays inside the repo.
