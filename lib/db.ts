import { neon } from "@neondatabase/serverless";

let _sql: ReturnType<typeof neon> | null = null;

/**
 * Neon serverless SQL (tagged template). Lazy-init so `DATABASE_URL` is read when first used (Edge-safe).
 * Replaces Prisma for Next.js Edge routes talking to the same Postgres schema as `backend/prisma`.
 */
export function getSql(): ReturnType<typeof neon> {
  if (!_sql) {
    const url = process.env.DATABASE_URL?.trim();
    if (!url) {
      throw new Error("DATABASE_URL is not configured");
    }
    _sql = neon(url);
  }
  return _sql;
}
