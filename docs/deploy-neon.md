# Neon production + local dev

## Keep local and production separate

| Location | Database | Config |
|----------|----------|--------|
| Your machine | Docker Postgres (`npm run db:up` in `backend/`) | `backend/.env` → `localhost` URLs (never commit) |
| Production API | Neon | Env vars on the host only — see `backend/.env.production.example` |

Do **not** put Neon URLs in `backend/.env` for normal development.

## One-time: Neon project

1. In [Neon Console](https://console.neon.tech), create a project and database.
2. Copy **two** connection strings:
   - **Pooled** → `DATABASE_URL` (often contains `-pooler` in the host).
   - **Direct** (non-pooled) → `DIRECT_URL` for Prisma migrations.
3. Paste into your production host’s environment (not into git).

## First production deploy

1. Set all variables from `backend/.env.production.example` on the server (or CI secrets).
2. Run migrations against Neon (must use the same `DATABASE_URL` / `DIRECT_URL` the app will use):

   ```bash
   cd backend
   export DATABASE_URL="..." DIRECT_URL="..."
   npx prisma migrate deploy
   npx prisma generate
   ```

3. Create the bootstrap superuser once:

   ```bash
   npm run create-superuser -- you@example.com 'StrongUniquePassword'
   ```

4. Deploy the Nest API and confirm health.

5. Build the frontend with production env:

   ```bash
   cd frontend
   cp .env.production.example .env.production
   # edit .env.production: VITE_API_BASE_URL = your public API URL, Firebase keys for prod
   npm run build
   ```

6. In **Firebase Console** → Authentication → Settings → Authorized domains, add your production site domain.

## Ongoing workflow

- **Dev:** `backend/.env` stays on localhost; run `npm run db:up`, `prisma migrate dev` as needed.
- **Prod:** Ship code, then on the host (or CI) run `prisma migrate deploy` when migrations change.
