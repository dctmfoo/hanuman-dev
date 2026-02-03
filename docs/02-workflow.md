# Workflow model

## Goals
- Fully automated end-to-end execution.
- Only interrupt the human at explicit gates.
- Multi-model by default (planner/reviewer != executor).

## Phases

### Phase 0: Intake
Input is a brief from chat.
Output:
- `brief.json` (structured)

### Phase 1: Plan (specialist)
A dedicated planner agent produces:
- `prd.md` (human-readable plan)
- `prd.json` (small stories)
- assumptions + risks + acceptance checks

Gate: human approves or requests changes.

### Phase 2: Execute
Run a loop executor (e.g., Ralph-style) in isolated worktrees.
Gate: none unless blocked.

### Phase 3: Review
Automated review:
- codex review
- claude review (Opus)
- CI status

Gate: human decides ship vs fix.

### Phase 4: Compound
Automated compounding:
- update repo docs index
- update AGENTS.md / conventions
- append learnings to workflow log

## Failure handling
- If a phase fails, transition to FAILED.
- If input required, transition to NEEDS_HUMAN with a concrete question.
- Resuming is deterministic from persisted state.

## Todo/Fixme convention
Use uppercase todo/fixme tags only in the following format so automation can find them:
- `TODO(AR8-123): follow up on parser edge cases`
- `FIXME(ops-42): handle missing HALO_HOME`
The tag in parentheses should be an issue/story id or owner handle. Run `pnpm check:todo` to verify.
