#!/usr/bin/env bash
# Runs push-initial-to-dev then switch-origin-to-dev in order (one command, no paste issues).
# Prerequisite: empty dev repo exists on GitHub (see scripts/github/README.md).
#
# Usage:
#   bash scripts/github/bootstrap-dev-remotes.sh
#   DEV_REMOTE_URL=https://github.com/ORG/B2C-PMES-dev.git bash scripts/github/bootstrap-dev-remotes.sh
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
bash "$HERE/push-initial-to-dev.sh" "$@"
bash "$HERE/switch-origin-to-dev.sh"
