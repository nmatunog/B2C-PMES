/**
 * Mirrors `backend/src/pmes/callsign.util.ts` `validateAndNormalizeCallsignInput` (no Nest exceptions).
 */
export function validateAndNormalizeCallsignInput(raw: string): string {
  const s = String(raw ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");

  if (s.length < 3 || s.length > 18) {
    throw new Error("Callsign must be 3–18 characters.");
  }
  if (!/^[a-z0-9][a-z0-9_-]*[a-z0-9]$/.test(s)) {
    throw new Error("Use letters, numbers, hyphen, or underscore only (no spaces).");
  }
  if (s.startsWith("b2c")) {
    throw new Error("Callsign cannot start with b2c (reserved for member IDs).");
  }
  if (/^[a-z]{2,}-\d{1,4}$/.test(s)) {
    throw new Error("That pattern is reserved for default last-name handles (e.g. cruz-2). Pick another.");
  }
  return s;
}
