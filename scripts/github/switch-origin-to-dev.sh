#!/usr/bin/env bash
# One-time per clone: origin → dev (daily work + auto-push), production → canonical prod repo.
#
# Typical order:
#   - Create empty repo B2C-PMES-dev on GitHub (no README).
#   - bash scripts/github/bootstrap-dev-remotes.sh
#     (or push-initial-to-dev.sh then switch-origin-to-dev.sh)
#
# Usage:
#   bash scripts/github/switch-origin-to-dev.sh
#   DEV_REMOTE_URL=https://github.com/ORG/B2C-PMES-dev.git bash scripts/github/switch-origin-to-dev.sh
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"
# shellcheck source=defaults.sh
source "$(dirname "$0")/defaults.sh"

DEV_URL="${DEV_REMOTE_URL:-}"
DEV_REMOTE="${GIT_DEV_REMOTE_NAME:-dev}"

origin_url="$(git remote get-url origin 2>/dev/null || true)"
dev_named_url="$(git remote get-url "$DEV_REMOTE" 2>/dev/null || true)"

# Idempotent: already split (e.g. second run)
if git remote get-url production &>/dev/null && [[ -n "$origin_url" ]]; then
  echo "Remotes already use split setup:"
  git remote -v
  exit 0
fi

# Case: push-initial added 'dev' — rename origin→production, dev→origin
if [[ -n "$origin_url" && -n "$dev_named_url" ]]; then
  git remote rename origin production
  git remote rename "$DEV_REMOTE" origin
  echo "Remotes: production=$(git remote get-url production), origin=$(git remote get-url origin)"
elif [[ -n "$origin_url" ]]; then
  # Only origin (prod): need DEV_URL to add dev as new origin
  if [[ -z "$DEV_URL" ]]; then
    echo "No remote '$DEV_REMOTE'. Set DEV_REMOTE_URL to the dev repo HTTPS/SSH URL." >&2
    exit 1
  fi
  git remote rename origin production
  git remote add origin "$DEV_URL"
  echo "Remotes: production=$(git remote get-url production), origin=$(git remote get-url origin)"
else
  echo "No origin remote; clone the repo first." >&2
  exit 1
fi

git fetch origin
main_branch="$(git symbolic-ref -q --short HEAD || echo main)"
if git show-ref --verify --quiet "refs/heads/$main_branch"; then
  if git rev-parse --verify -q "origin/$main_branch" >/dev/null; then
    git branch --set-upstream-to="origin/$main_branch" "$main_branch"
  fi
fi

echo ""
git remote -v
echo ""
echo "Auto-push (post-commit) targets origin = dev. Promote: bash scripts/github/sync-to-production.sh"
