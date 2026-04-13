#!/usr/bin/env bash
# When ready: push local main to the PRODUCTION remote (fast-forward or merge on server).
# Does not push to dev — production must receive commits you already merged on main.
#
# Usage:
#   bash scripts/github/sync-to-production.sh           # interactive confirm
#   SYNC_TO_PRODUCTION_YES=1 bash scripts/github/sync-to-production.sh
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"
# shellcheck source=defaults.sh
source "$(dirname "$0")/defaults.sh"

PROD_REMOTE="${GIT_PRODUCTION_REMOTE_NAME:-production}"
BRANCH="${1:-main}"

if ! git remote get-url "$PROD_REMOTE" &>/dev/null; then
  echo "No remote '$PROD_REMOTE'. Add it, e.g.:" >&2
  echo "  git remote add production ${PRODUCTION_REMOTE_URL}" >&2
  echo "Or run: bash scripts/github/switch-origin-to-dev.sh" >&2
  exit 1
fi

if [[ -n "$(git status --porcelain)" ]]; then
  echo "Working tree is not clean. Commit or stash before promoting." >&2
  exit 1
fi

git fetch "$PROD_REMOTE"
local_ref="$(git rev-parse "$BRANCH")"
prod_ref="$(git rev-parse "$PROD_REMOTE/$BRANCH" 2>/dev/null || true)"

if [[ -z "$prod_ref" ]]; then
  echo "Branch $PROD_REMOTE/$BRANCH does not exist yet; first push will create it."
else
  if git merge-base --is-ancestor "$prod_ref" "$local_ref"; then
    echo "Local $BRANCH is ahead of or equal to $PROD_REMOTE/$BRANCH (safe fast-forward)."
  else
    echo "WARNING: $BRANCH and $PROD_REMOTE/$BRANCH have diverged." >&2
    echo "Resolve in a merge commit or rebase locally, then run again." >&2
    exit 1
  fi
fi

if [[ "${SYNC_TO_PRODUCTION_YES:-}" != "1" ]]; then
  read -r -p "Push $BRANCH to $PROD_REMOTE (PRODUCTION)? [y/N] " ans
  case "$ans" in
    y|Y|yes|YES) ;;
    *) echo "Aborted."; exit 1 ;;
  esac
fi

git push "$PROD_REMOTE" "$BRANCH:$BRANCH"
echo "Production updated: $PROD_REMOTE $BRANCH"
