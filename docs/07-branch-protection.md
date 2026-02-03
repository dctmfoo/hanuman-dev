# Branch protection and rulesets

This repo expects GitHub branch protection (or rulesets) on the default branch to keep mainline safe and history clean.

## Scope
- Apply to the default branch (`main` or `master`).
- Use either branch protection or a ruleset; if both are enabled, keep them consistent.

## Required settings
- Require status checks to pass before merging.
- Required status check: `CI / build` (from `.github/workflows/ci.yml`).
- Require linear history (no merge commits).
- Require conversation resolution before merging.

## Notes
- If the CI workflow or job name changes, update the required check name to match the new check run.
