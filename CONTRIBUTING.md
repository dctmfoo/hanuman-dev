# Contributing

Thanks for helping improve hanuman-dev! This workflow-focused project benefits a lot from careful, incremental changes.

## Local Development

CI runs on Node 20 with pnpm 9, so matching that locally avoids surprises.

```bash
pnpm install
pnpm build
pnpm test
```

Helpful CLI checks while iterating:

```bash
pnpm dev -- --help
node dist/cli.js --help
```

## CI Expectations

CI runs these steps on every push/PR:

- Secret scan via gitleaks.
- `pnpm check:deadcode` (knip).
- `pnpm check:complexity` (eslint).
- `pnpm check:dup` (jscpd).
- `pnpm check:todo`.
- `pnpm check:docs`.
- `pnpm test`.
- `pnpm build`.

CI installs with `pnpm install --frozen-lockfile`, so keep `pnpm-lock.yaml` in sync with dependency changes.

## Readiness Checks

You can run the same readiness checks locally, either as a summary report:

```bash
pnpm readiness:report
```

Or individually (these match CI):

```bash
pnpm check:deadcode
pnpm check:complexity
pnpm check:dup
pnpm check:todo
pnpm check:docs
```

## Updating Docs Without Drift

Docs are validated by `pnpm check:docs`, which ensures:

- `README.md` has a `## Docs` section with working relative links.
- `docs/README.md` has a `## Golden Commands` section.
- Every command listed under `## Golden Commands` runs cleanly.
- Running those commands does not change anything under `docs/` (no drift).

To update docs safely:

- If you add, remove, or rename docs, update the links in `README.md` and the index in `docs/README.md`.
- If a doc references CLI output, keep it stable or update the docs to match changes.
- Run `pnpm check:docs` before opening a PR and fix any drift it reports.
