# Quickstart (v0.1)

This is the **v0.1 executor**: repo-agnostic, replayable, checkpointed runs using **Codex CLI**.

## Install (local dev)

```bash
pnpm install
pnpm build
node dist/cli.js --help
```

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
  checkpoints/state.json
  artifacts/
  debug_bundle/
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
