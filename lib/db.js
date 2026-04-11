import { neon } from "@neondatabase/serverless";

/**
 * Optional raw Neon serverless SQL (e.g. Edge Workers, scripts).
 * Application data is owned by **Nest + Prisma** (`backend/`) — prefer `POST /auth/sync-member` for Firebase ↔ Postgres sync.
 */
if (!process.env.DATABASE_URL) {
  console.warn("WARNING: DATABASE_URL is not defined in your environment variables.");
}

export const sql = neon(process.env.DATABASE_URL);