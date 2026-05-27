# B2CCoop WebApp — rename cutover (from B2C-PMES)

This repo and Cloudflare resources were renamed from **B2C-PMES** / `b2c-pmes-*` to **B2CCoop WebApp** / `b2ccoop-webapp*`.

## Cloudflare (production)

| Resource | New name |
|----------|----------|
| API Worker | `b2ccoop-webapp` |
| Vite UI (Pages) | `b2ccoop-webapp-ui` |
| Dev Worker (local OpenNext) | `b2ccoop-webapp-dev` |

Wrangler config: `frontend/wrangler.b2ccoop-webapp.jsonc`

After first deploy of the new Worker, set in **`frontend/.env.production`** (not committed):

```bash
VITE_API_BASE_URL=https://b2ccoop-webapp.<your-subdomain>.workers.dev/api
```

Then from `frontend/`:

| Script | Target |
|--------|--------|
| `npm run cf:deploy:web:safe` | Production API Worker **`b2ccoop-webapp`** |
| `npm run pages:deploy:safe` | Vite UI → **`b2ccoop-webapp-ui`** |
| `npm run pages:deploy:live-domains` | Same UI build → **`b2c-pmes-web-ui`** (live domains) + **`b2ccoop-webapp-ui`** |

**Do not** use `npm run cf:deploy:dev` for production — it deploys **`b2ccoop-webapp-dev`**.

### Worker secrets (first deploy only)

Secrets are **not** copied when you create a new Worker. Copy from `b2c-pmes-web` (or from `backend/.env`) onto **`b2ccoop-webapp`**:

- `DATABASE_URL`
- `ADMIN_JWT_SECRET`
- `GEMINI_API_KEY` (if landing FAQ AI is enabled)

When piping from `.env`, **strip surrounding quotes** or Neon will reject the URL. Example:

```bash
cd frontend
val=$(grep -m1 '^DATABASE_URL=' ../backend/.env | cut -d= -f2- | sed -e 's/^"//' -e 's/"$//')
printf '%s' "$val" | npx wrangler secret put DATABASE_URL --config wrangler.b2ccoop-webapp.jsonc
```

Verify: `curl -sS https://b2ccoop-webapp.<subdomain>.workers.dev/api/health` → `{"status":"ok","database":"connected"}`.

### Pages UI

Create the project once if it does not exist:

```bash
npx wrangler pages project create b2ccoop-webapp-ui --production-branch main
```

Preview URL: `https://b2ccoop-webapp-ui.pages.dev`.

Move custom domains (`b2ccoop.com`, `www.b2ccoop.com`) from **`b2c-pmes-web-ui`** to **`b2ccoop-webapp-ui`** in the Cloudflare dashboard (detach from the old project first). Until then, you can deploy the same Vite build to **`b2c-pmes-web-ui`** so the live hostname keeps working.

Re-attach API custom domains to Worker **`b2ccoop-webapp`** (not the old `b2c-pmes-web`). Retire old Workers/Pages when traffic has moved.

## GitHub

Suggested repo names: **`B2CCoop-WebApp`** (production), **`B2CCoop-WebApp-dev`** (mirror). Update `origin` / `production` remotes after renaming in GitHub Settings.

## Local Postgres (optional)

Docker Compose now uses database `b2ccoop_webapp`. Either:

- `docker compose down -v` and `docker compose up -d`, then `npx prisma migrate deploy`, or
- Keep your existing `b2c_pmes` DB and only change `DATABASE_URL` if you recreate the database.

## Firestore (`VITE_APP_ID`)

Default app id is now **`b2ccoop-webapp`**. Existing PMES progress under `artifacts/b2c-pmes/...` is **not** read automatically. To keep old progress, either:

- Leave `VITE_APP_ID=b2c-pmes` in your env until you migrate data, or
- Copy Firestore documents to the new path in Firebase Console.

## Browser storage

Session keys were renamed (`b2ccoop_webapp_*`). Members and staff may need to sign in again; course-audio preference resets.
