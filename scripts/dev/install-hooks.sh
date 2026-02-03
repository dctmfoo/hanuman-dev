#!/usr/bin/env sh
set -eu

if ! command -v git >/dev/null 2>&1; then
  echo "git is required to install hooks." >&2
  exit 1
fi

repo_root=$(git rev-parse --show-toplevel 2>/dev/null || true)
if [ -z "$repo_root" ]; then
  echo "Not inside a git repository." >&2
  exit 1
fi

git_dir=$(git rev-parse --git-dir)
hooks_dir="$git_dir/hooks"
hook_path="$hooks_dir/pre-commit"

mkdir -p "$hooks_dir"

cat <<'HOOK' > "$hook_path"
#!/usr/bin/env sh
set -eu

if [ -n "${SKIP_PRE_COMMIT:-}" ]; then
  echo "SKIP_PRE_COMMIT is set; skipping pre-commit checks."
  exit 0
fi

repo_root=$(git rev-parse --show-toplevel 2>/dev/null || true)
if [ -n "$repo_root" ]; then
  cd "$repo_root"
fi

echo "Running pre-commit checks..."
pnpm test
HOOK

chmod +x "$hook_path"

echo "Installed pre-commit hook at: $hook_path"
