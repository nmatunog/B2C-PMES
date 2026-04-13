import { neon } from "@neondatabase/serverless";

let _neon = null;

function getNeon() {
  if (!_neon) {
    const url = process.env.DATABASE_URL?.trim();
    if (!url) {
      throw new Error("DATABASE_URL is not configured");
    }
    _neon = neon(url);
  }
  return _neon;
}

/**
 * Lazy Neon client — use as a tagged template: `await sql\`SELECT ...\``.
 * Same instance as {@link getSql}; first invocation reads `DATABASE_URL` (Edge-safe).
 */
export function sql(strings, ...values) {
  return getNeon()(strings, ...values);
}

/** Returns the underlying `neon()` client (same as used by {@link sql}). */
export function getSql() {
  return getNeon();
}
