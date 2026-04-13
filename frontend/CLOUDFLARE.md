# Deploy Next.js on Cloudflare (OpenNext)

This app uses [**OpenNext for Cloudflare**](https://opennext.js.org/cloudflare) (`@opennextjs/cloudflare`), which produces a **Worker** plus static assets. Deploy through **Workers** (and the Git integration), not legacy static-only Pages.

## 1. Names must match

`wrangler.jsonc` sets the Worker name to **`b2c-pmes-web`**. The name in the Cloudflare dashboard (Workers & Pages → your Worker) **must match** `name` in `wrangler.jsonc`, or Git/automated builds can fail.

To use a different name, edit **`name`**, **`services[0].service`**, and **`main`** paths only if you know what you are doing (see Cloudflare docs).

## 2. Build locally

```bash
cd frontend
npm ci
npm run cf:build
```

- `npm run build` — Next.js only (also used in CI).
- `npm run cf:build` — Next.js + OpenNext bundle (`.open-next/`).
- `npm run cf:preview` — build and run locally in the Workers runtime.
- `npm run cf:deploy` — build and deploy with Wrangler (requires `wrangler login`).

## 3. Connect GitHub (recommended)

1. Cloudflare dashboard → **Workers & Pages** → **Create** → **Connect your repository** (or attach Builds to an existing Worker).
2. Select the repo and branch (e.g. `main`).
3. **Root directory:** `frontend`
4. **Build command:** `npm ci && npm run cf:build`
5. **Deploy command** (if the UI asks for a separate step): `npx wrangler deploy`  
   (Or use your dashboard’s “Deploy command” field; some setups use a single build+deploy script — check [Workers builds](https://developers.cloudflare.com/workers/ci-cd/builds/).)
6. **Environment variables:** add the same names as in production (see below). Use **Secrets** for sensitive values.

`NODE_VERSION`: set to **20** in environment variables if builds fail on an old Node.

## 4. Custom domain

1. Put the domain on Cloudflare DNS (same account as the Worker), or delegate nameservers to Cloudflare.
2. **Workers & Pages** → your Worker (**b2c-pmes-web**) → **Triggers** / **Custom domains** → **Add**.
3. Choose hostname (e.g. `app.yourdomain.com`), follow DNS instructions (often a CNAME to `your-worker.workers.dev` or automatic when the zone is on Cloudflare).

HTTPS is provisioned automatically once DNS validates.

## 5. Environment variables (production / preview)

Configure in the Worker → **Settings** → **Variables** (and **Secrets** where appropriate).

**Next public (browser):**

- `NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID`, etc., as needed by `app/page.jsx` and any client code.

**Server-only (API routes — Neon, Gemini, Firebase token verify):**

- `DATABASE_URL` — Neon connection string (secret).
- `GEMINI_API_KEY` — landing FAQ AI (secret).
- `GEMINI_CHAT_MODEL` — optional.
- `FIREBASE_PROJECT_ID` — required for ID token verification.
- `MEMBER_SYNC_SECRET` — optional; if set, clients must send `X-Member-Sync-Secret` when not using Bearer tokens.
- Optional Nest-style Admin vars if you use that path: `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`.

Mirror whatever you use locally in `frontend/.env` / `.env.local`, but **never commit secrets**.

## 6. OpenNext notes

- `export const runtime = "edge"` was **removed** from route handlers; OpenNext on Cloudflare does not support the Edge runtime flag in the same way — the Worker runtime uses `nodejs_compat` instead.
- Output is under **`frontend/.open-next/`** (gitignored).

## 7. Vite app (separate)

The marketing UI under `frontend/src` is built with **`npm run vite:build`** → `dist/`. That is a **separate** deploy (e.g. a second Worker, or static hosting). This document only covers the **Next.js** Worker.
