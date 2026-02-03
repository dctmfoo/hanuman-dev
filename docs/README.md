# Docs

This folder contains reference docs for hanuman-dev.

## Getting Started
- [Quickstart (v0.1)](quickstart-v0.1.md) — canonical getting started path (install, run, smoke test).

## Index
- [Architecture](01-architecture.md) — system overview and boundaries.
- [Workflow model](02-workflow.md) — plan → work → review → compound flow.
- [Engine adapters](03-engines.md) — CLI adapter contracts and expectations.
- [Repo config](04-config.md) — `.halo/config.json` shape and usage.
- [Status and roadmap](05-status-and-roadmap.md) — project status and forward-looking work.
- [Claude adapter spec](06-roadmap-c-claude-adapter-spec.md) — adapter roadmap/spec details.
- [Functional spec (v0.1)](functional-spec-v0.1.md) — end-to-end behavior and goals.
- [PRD (v0.1)](prd-v0.1.md) — requirements and scope.

## Golden Commands

These commands are run by `pnpm check:docs` in CI to keep doc examples honest.
Keep them fast and deterministic.
List them in `bash` fenced blocks so the parser can find them.

```bash
node dist/cli.js --help
node dist/cli.js run --help
node dist/cli.js init --help
```
