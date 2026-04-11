# B2C PMES — Cursor / deployment context

Use **`@cursor_docs.md`** in Cursor chat for stack-wide context.

## Architecture (target: Firebase + Neon Postgres)

| Layer | Role |
|--------|------|
| **Firebase** | Member **Authentication** (email/password). Optional Firestore for PMES **resume progress** (`pmes_progress`). |
| **Neon** | **PostgreSQL** for all cooperative data: participants, PMES records, LOI, membership lifecycle, staff users, full profiles. |
| **NestJS API** (`backend/`) | REST API + Prisma ORM. **Never** expose `DATABASE_URL` to the browser. |
| **Vite + React** (`frontend/`) | UI. Talks to Firebase Auth + `VITE_API_BASE_URL` → Nest only. |

This repo is **not** Next.js. Frontend env uses **`VITE_*`**, not `NEXT_PUBLIC_*`.

## Directory map

- `backend/` — Nest, Prisma schema, migrations, `DATABASE_URL` / `DIRECT_URL`
- `frontend/` — React app, `VITE_FIREBASE_*`, `VITE_API_BASE_URL`
- `backend/prisma/schema.prisma` — source of truth for tables

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
- **Auth (pick one):** (1) `Authorization: Bearer <Firebase ID token>` — configure **`FIREBASE_PROJECT_ID`**, **`FIREBASE_CLIENT_EMAIL`**, **`FIREBASE_PRIVATE_KEY`** in `backend/.env` (service account from Firebase Console). (2) **`X-Member-Sync-Secret`** matching `MEMBER_SYNC_SECRET` — for trusted servers only, not the browser. (3) If neither secret nor Firebase Admin is configured, the route accepts unauthenticated calls (**local dev only**).
- **Frontend:** `VITE_API_BASE_URL` set → after sign-in, the app calls sync with the member’s ID token (`frontend/src/services/memberSyncService.js`).
- **Optional Next.js** (if you add Next): `app/api/sync-member/route.js` proxies to Nest (`NEST_API_URL`); forward **`Authorization`** from the client or set **`MEMBER_SYNC_SECRET`** server-side. Raw `lib/db.js` is for edge/scripts, not the main app schema.

## Compliance note

Privacy / consent copy lives in app constants and flows (e.g. consent before PMES). Align checkbox copy with **RA 10173** for production legal review.
