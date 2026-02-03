# Docs

This folder contains reference docs for hanuman-dev.

## Golden Commands

These commands are run by `pnpm check:docs` in CI to keep doc examples honest.
Keep them fast and deterministic.
List them in `bash` fenced blocks so the parser can find them.

```bash
node dist/cli.js --help
node dist/cli.js run --help
node dist/cli.js init --help
```
