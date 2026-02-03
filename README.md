# hanuman-dev

Repo-agnostic, multi-model workflow template for agentic development.

Goal: you talk in chat → a reusable workflow orchestrator runs:

1) **Plan** (specialized planner agent produces PRD + runnable task breakdown)
2) **Work** (loop executor runs tasks in isolated worktrees)
3) **Review** (automated review + human gate)
4) **Compound** (codify learnings so the next unit of work is easier)

Design principles:
- **Multi-model by default** (avoid single-model blindness):
  - plan/review → Claude (Opus by default)
  - execute → Codex (gpt-5.2-codex by default)
- **Adapters** for engine CLIs (Codex CLI, Claude Code CLI) so CLI flag changes are updated in one place.
- **Durable workflow state** under `HALO_HOME` (default `~/.halo`).
- **Repo-agnostic**: per-repo config lives in `.halo/config.json`.

## Status
Bootstrap scaffold (v0). PRD + engine adapter design docs included.

## Credits / Inspirations

This project is inspired by and builds on patterns and tooling from:

- **Ralph pattern** (Geoffrey Huntley) — the loop model and “small stories + feedback” philosophy:
  - https://ghuntley.com/ralph/
- **snarktank/ralph** — the canonical bash-loop implementation and conventions (prd.json + progress.txt):
  - https://github.com/snarktank/ralph
- **Compound Engineering** (Every / EveryInc) — Plan → Work → Review → Compound workflow framing:
  - https://github.com/EveryInc/compound-engineering-plugin

We adapt these ideas to a repo-agnostic, multi-engine, multi-model workflow orchestrator.

## Docs
- [Functional spec (v0.1)](docs/functional-spec-v0.1.md)
- [Quickstart (v0.1)](docs/quickstart-v0.1.md)
- [Architecture](docs/01-architecture.md)
- [Workflow model](docs/02-workflow.md)
- [Engine adapters](docs/03-engines.md)
- [Repo config](docs/04-config.md)

## Quickstart (v0.1)
- See: [docs/quickstart-v0.1.md](docs/quickstart-v0.1.md)

Fast sanity check (no Codex required):
```bash
./scripts/smoke-run.sh
```

## Pre-commit hook (optional)

Install a lightweight pre-commit hook that runs fast checks:

```bash
./scripts/dev/install-hooks.sh
```

Opt-out options:
- Temporarily skip once with `SKIP_PRE_COMMIT=1 git commit ...`
- Remove the hook by deleting `.git/hooks/pre-commit`
