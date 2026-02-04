# Engine adapters

## Why
Models and CLI argument formats change. We keep the executor stable by isolating CLI specifics inside adapter modules.

## Implemented adapters (v0.1)
- **Codex** (real adapter): `src/engines/codex.ts`
  - Used by the executor today for the `work` stage.
- **Claude Code** (adapter): `src/engines/claude.ts`
  - Wired for stage selection, but not executed yet because only `work` runs.
- **FakeCodex** (test adapter): `src/engines/fakeCodex.ts`
  - Used by integration tests and smoke runs.

See: `docs/05-status-and-roadmap.md` for current status.

## Stage selection
Engine selection is resolved in `src/stages/resolveStageEngine.ts`:
- Default mapping: `work -> codex`, `plan -> claude`, `review -> claude`
- Can be overridden per stage via repo config (`stages.<stage>.engine`).
- **Only the `work` stage executes today**, so plan/review adapters are not yet invoked.

## Adapter surface (current)
Adapters implement the `Engine` interface in `src/engines/types.ts` and expose:
- `execJsonl(...)` to run the CLI and stream JSONL events.
- Optional `getVersion(...)` and `getFeaturesBestEffort(...)` helpers for diagnostics.
