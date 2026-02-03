#!/usr/bin/env bash
set -euo pipefail

# Smoke test for hanuman-dev v0.1
# - Uses the fake Codex engine (no external Codex dependency)
# - Creates a temp git repo
# - Runs a tiny PRD
# - Validates run-dir contract basics

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

TMP_BASE="${TMPDIR:-/tmp}"
RUN_TMP="$(mktemp -d "${TMP_BASE%/}/hanuman-dev-smoke.XXXXXX")"

cleanup() {
  rm -rf "$RUN_TMP" || true
}
trap cleanup EXIT

REPO_DIR="$RUN_TMP/repo"
HALO_HOME="$RUN_TMP/halo"
PRD_PATH="$RUN_TMP/prd.json"

mkdir -p "$REPO_DIR" "$HALO_HOME"

# minimal git repo
cd "$REPO_DIR"
git init -q

echo "# smoke" > README.md
git add README.md
git commit -qm "init"

cat > "$PRD_PATH" <<'JSON'
{
  "schemaVersion": "0.1",
  "title": "Smoke PRD",
  "stories": [
    {
      "id": "S1",
      "title": "Story 1",
      "size": "S",
      "acceptance": ["ok"]
    }
  ]
}
JSON

# Build CLI
cd "$ROOT_DIR"
pnpm -s build

# Run using fake codex
export HALO_HOME
export HANUMAN_ENGINE=fake-codex
export HANUMAN_FAKE_CODEX_SCENARIO=ok

# IMPORTANT: run inside the target repo so git checks apply to the correct worktree.
cd "$REPO_DIR"
RUN_DIR="$(node "$ROOT_DIR/dist/cli.js" run --prd "$PRD_PATH")"

echo "Run dir: $RUN_DIR"

# Assertions
[[ -d "$RUN_DIR" ]] || (echo "missing run dir" && exit 1)
[[ -f "$RUN_DIR/run.json" ]] || (echo "missing run.json" && exit 1)
[[ -f "$RUN_DIR/events.jsonl" ]] || (echo "missing events.jsonl" && exit 1)
[[ -f "$RUN_DIR/logs.jsonl" ]] || (echo "missing logs.jsonl" && exit 1)
[[ -f "$RUN_DIR/status.json" ]] || (echo "missing status.json" && exit 1)
[[ -f "$RUN_DIR/checkpoints/state.json" ]] || (echo "missing checkpoint state" && exit 1)
[[ -d "$RUN_DIR/artifacts" ]] || (echo "missing artifacts dir" && exit 1)
[[ -d "$RUN_DIR/debug_bundle" ]] || (echo "missing debug_bundle dir" && exit 1)

# Run.json must contain stopReason and exitStatus on completion
node - <<NODE
import fs from 'node:fs';
const run = JSON.parse(fs.readFileSync("$RUN_DIR/run.json", 'utf8'));
if (!run.stopReason) throw new Error('run.json missing stopReason');
if (run.exitStatus === undefined) throw new Error('run.json missing exitStatus');
if (run.stopReason !== 'SUCCESS') throw new Error('expected SUCCESS, got ' + run.stopReason);
if (run.exitStatus !== 0) throw new Error('expected exitStatus 0, got ' + run.exitStatus);
NODE

# events.jsonl must not be empty
[[ -s "$RUN_DIR/events.jsonl" ]] || (echo "events.jsonl is empty" && exit 1)
[[ -s "$RUN_DIR/logs.jsonl" ]] || (echo "logs.jsonl is empty" && exit 1)

echo "SMOKE_OK"
