# Quickstart (v0.1)

This is the **v0.1 executor**: repo-agnostic, replayable, checkpointed runs using **Codex CLI**.

## Install

### Global install (recommended)

From the `hanuman-dev` repo:

```bash
npm i -g .
hanuman-dev --help
```

### Local dev

```bash
pnpm install
pnpm build
node dist/cli.js --help
```

### Dev container (optional)

This repo includes `.devcontainer/devcontainer.json` for a reproducible Node + pnpm setup.

1. Install the VS Code Dev Containers extension.
2. Open the repo in VS Code and run `Dev Containers: Reopen in Container`.
3. The container runs `pnpm install` on first create; then use the usual `pnpm build` and `pnpm test`.

## Run a tiny PRD

Create a `prd.json` (v0.1 schema):

```json
{
  "schemaVersion": "0.1",
  "title": "tiny example",
  "stories": [
    {
      "id": "EXAMPLE_1",
      "title": "Add a small README tweak",
      "size": "S",
      "acceptance": ["README updated"]
    }
  ]
}
```

Then, inside a **clean git repo**:

```bash
# optional: control where run dirs go
export HALO_HOME="$HOME/.halo"

node /path/to/hanuman-dev/dist/cli.js run --prd /path/to/prd.json --sandbox
```

### What gets created

Each run creates a run directory:

```
$HALO_HOME/runs/<runId>/
  run.json
  events.jsonl
  logs.jsonl
  status.json
  checkpoints/state.json
  artifacts/
  debug_bundle/
```

### Logs and status

`events.jsonl` is the raw Codex JSONL stream. `logs.jsonl` is hanuman-dev's structured log stream.
`status.json` is a small, frequently updated health snapshot for the run.

Tail logs:

```bash
tail -f "$HALO_HOME/runs/<runId>/logs.jsonl"
```

Example log line:

```json
{"ts":"2026-02-03T12:00:00.000Z","level":"info","event":"story.start","runId":"...","data":{"storyId":"S1","index":0}}
```

Check status:

```bash
cat "$HALO_HOME/runs/<runId>/status.json"
```

Or use the CLI helper:

```bash
hanuman-dev status "$HALO_HOME/runs/<runId>"
```

For the raw Codex event stream:

```bash
tail -f "$HALO_HOME/runs/<runId>/events.jsonl"
```

### Resume

```bash
node dist/cli.js run --prd /path/to/prd.json --resume $HALO_HOME/runs/<runId>
```

Resume is deterministic: it uses `checkpoints/state.json` (including `nextStoryId`).

## Smoke test (no Codex required)

We include a fully local smoke test that uses a fake Codex engine:

```bash
./scripts/smoke-run.sh
```

It prints `SMOKE_OK` if the run-dir contract and SUCCESS path are working.
