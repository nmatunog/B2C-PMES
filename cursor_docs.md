# B2C PMES — Cursor / deployment context

Use **`@cursor_docs.md`** in Cursor chat for stack-wide context.

**Layout note:** The **Next.js** app (OpenNext Worker, `app/`, Route Handlers) lives under **`frontend/`** in this repository, not at the repo root. For production deploys and the Pages vs Worker split, see **[docs/OPERATIONS.md](./docs/OPERATIONS.md)**.

## Architecture (target: Firebase + Neon Postgres)

| Layer | Role |
|--------|------|
| **Firebase** | Member **Authentication** (email/password). Optional Firestore for PMES **resume progress** (`pmes_progress`). |
| **Neon** | **PostgreSQL** for all cooperative data: participants, PMES records, LOI, membership lifecycle, staff users, full profiles. |
| **NestJS API** (`backend/`) | REST API + Prisma ORM (existing). **Never** expose `DATABASE_URL` to the browser. |
| **Next.js (`frontend/app/`)** | OpenNext on Cloudflare Worker: Route Handlers + `@neondatabase/serverless` — same Postgres schema as Prisma. Deploy: **`frontend/wrangler.b2c-pmes-web.jsonc`**. |
| **Vite + React** (`frontend/`) | UI. Talks to Firebase Auth + `VITE_API_BASE_URL` → Nest and/or Next (same `/auth/...` paths when using rewrites). |

Member UI remains **Vite**; env uses **`VITE_*`**, not `NEXT_PUBLIC_*`. The Next app at the repo root is primarily for **Edge API routes** during migration.

## Directory map

- `backend/` — Nest, Prisma schema, migrations, `DATABASE_URL` / `DIRECT_URL`
- `frontend/` — React app, `VITE_FIREBASE_*`, `VITE_API_BASE_URL`
- `backend/prisma/schema.prisma` — source of truth for tables
- `frontend/app/api/**`, `frontend/lib/db.js` (and related) — Next.js handlers (Neon SQL); keep schema aligned with Prisma migrations

## Neon Postgres setup

1. Create a Neon project (region of your choice, e.g. AWS **ap-southeast-1** if you want Singapore-adjacent).
2. In Neon, copy:
   - **Pooled** connection string → `DATABASE_URL` (Prisma queries at runtime).
   - **Direct** (non-pooled) connection string → `DIRECT_URL` (`prisma migrate` / `prisma db push`).
3. `backend/prisma/schema.prisma` uses both URLs — see [Neon + Prisma](https://neon.tech/docs/guides/prisma).
4. Deploy migrations: `cd backend && npx prisma migrate deploy` with env pointing at Neon (CI/CD should inject both vars).

Local Docker Postgres: set **`DIRECT_URL` identical to `DATABASE_URL`** (see `backend/.env.example`).

## Firebase

- Enable **Email/Password** in Firebase Console → Authentication.
- Frontend: `frontend/.env` from `frontend/.env.example` (`VITE_FIREBASE_*`).
- Firestore rules: allow signed-in users their own `artifacts/{appId}/public/data/pmes_progress/{uid}` if you use cloud resume.

## Environment files

| File | Purpose |
|------|---------|
| `backend/.env` | `DATABASE_URL`, `DIRECT_URL`, `ADMIN_JWT_SECRET`, optional **`MEMBER_SYNC_SECRET`** (if set, `POST /auth/sync-member` requires `X-Member-Sync-Secret`), AI keys, `PORT` |
| `frontend/.env` | `VITE_API_BASE_URL` (production API URL), `VITE_FIREBASE_*` |

## Firebase ↔ Neon member sync

- **Canonical API:** `POST {NEST}/auth/sync-member` with JSON `{ "uid", "email", "fullName?" }`. Upserts Prisma **`Participant`** (adds **`firebaseUid`**).
- **Auth (pick one):** (1) `Authorization: Bearer <Firebase ID token>` — **Nest:** `firebase-admin` + service account in `backend/.env`. **Next Edge:** `jose` + JWKS + **`FIREBASE_PROJECT_ID`** only (no private key on the Edge). (2) **`X-Member-Sync-Secret`** matching `MEMBER_SYNC_SECRET` — trusted servers only, not the browser. (3) If neither secret nor full Firebase Admin (Nest) / project id (Edge) applies per route rules, the route can accept body-only sync (**local dev only** — same semantics as Nest).
- **Frontend:** `VITE_API_BASE_URL` set → after sign-in, the app calls sync with the member’s ID token (`frontend/src/services/memberSyncService.js`). Path is **`POST /auth/sync-member`** (Next rewrites it to `/api/auth/sync-member`).
- **Next.js Edge sync** (`app/api/auth/sync-member/route.ts`): implements the same **`Participant`** upsert as Nest using **`getSql()`** from `lib/db.ts` (no Prisma on Edge). Env on Pages: **`DATABASE_URL`**, **`FIREBASE_PROJECT_ID`**, optional **`MEMBER_SYNC_SECRET`**. Run `npm run next:dev` (port **3040** by default) or `npm run next:build` for production.

## Compliance note

Privacy / consent copy lives in app constants and flows (e.g. consent before PMES). Align checkbox copy with **RA 10173** for production legal review.
