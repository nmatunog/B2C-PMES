# Dev vs production GitHub remotes

- **Production:** `B2C-PMES` — release target; keep stable.
- **Dev:** `B2C-PMES-dev` (or your name) — daily work; **post-commit auto-push** should target this repo.

Defaults are in `defaults.sh`. Override any time:

```bash
export PRODUCTION_REMOTE_URL='https://github.com/ORG/B2C-PMES.git'
export DEV_REMOTE_URL='https://github.com/ORG/B2C-PMES-dev.git'
```

## One-time: create the dev repo on GitHub

1. GitHub → **New repository** → name e.g. `B2C-PMES-dev`.
2. **Do not** add README, `.gitignore`, or license (keep it empty).

## One-time: mirror this repo into dev

From your existing clone (with `origin` still pointing at production):

```bash
bash scripts/github/push-initial-to-dev.sh
```

This adds remote `dev` and pushes all branches and tags.

## One-time: make `origin` = dev (so pull/push/auto-push hit dev)

```bash
bash scripts/github/switch-origin-to-dev.sh
```

After this:

- `origin` → dev
- `production` → production repo
- Post-commit hook runs `git push` to `origin` → **dev only**

## Promote `main` to production (when ready)

```bash
bash scripts/github/sync-to-production.sh
```

Uses remote `production` and pushes `main` → `production/main`. Set `SYNC_TO_PRODUCTION_YES=1` to skip the prompt (e.g. CI).

## Optional: push remote without renaming

If you keep `origin` as production, set auto-push explicitly:

```bash
export GIT_AUTOPUSH_REMOTE=dev
```

and ensure your branch tracks `dev/main` (`git branch -u dev/main`).
