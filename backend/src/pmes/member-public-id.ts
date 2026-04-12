import { randomBytes } from "crypto";

/** Crockford Base32 — avoids 0/O and I/L confusion when members read their ID aloud. */
const CROCKFORD = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

/**
 * First letter of given name + first letter of family name (2 letters).
 * Falls back to first two letters of the only word, or `XX`.
 */
export function initialsFromFullName(fullName: string): string {
  const parts = fullName
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.replace(/[^a-zA-ZÀ-ÿ]/g, ""))
    .filter((w) => w.length > 0);
  if (parts.length === 0) return "XX";
  if (parts.length === 1) {
    const w = parts[0]!;
    const two = (w.slice(0, 2) || "XX").toUpperCase();
    return two.padEnd(2, "X").slice(0, 2);
  }
  const a = parts[0]!.slice(0, 1).toUpperCase();
  const b = parts[parts.length - 1]!.slice(0, 1).toUpperCase();
  return `${a}${b}`.replace(/[^A-Z]/g, "X").padEnd(2, "X").slice(0, 2);
}

export function initialsFromFirstLast(firstName: string, lastName: string, fallbackFullName: string): string {
  const f = firstName.trim().replace(/[^a-zA-ZÀ-ÿ]/g, "");
  const l = lastName.trim().replace(/[^a-zA-ZÀ-ÿ]/g, "");
  if (f.length > 0 && l.length > 0) {
    return `${f.slice(0, 1)}${l.slice(0, 1)}`.toUpperCase();
  }
  return initialsFromFullName(fallbackFullName);
}

/** Last two digits of birth year, or cohort from `createdAt` when DOB is missing / placeholder. */
export function cohortYYFromDob(dob: string, createdAt: Date): string {
  const y = parseYearFromDob(dob);
  if (y !== null && y >= 1920 && y <= 2100) {
    return String(y % 100).padStart(2, "0");
  }
  return String(createdAt.getFullYear() % 100).padStart(2, "0");
}

/** ISO or US-style date string → calendar year, or null if not parseable. */
export function parseYearFromDob(dob: string): number | null {
  const d = dob.trim();
  if (!d || /^pending$/i.test(d)) return null;
  const iso = d.match(/^(\d{4})-\d{2}-\d{2}/);
  if (iso) return parseInt(iso[1]!, 10);
  const us = d.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (us) return parseInt(us[3]!, 10);
  return null;
}

function randomCrockford(n: number): string {
  const buf = randomBytes(n);
  let out = "";
  for (let i = 0; i < n; i++) {
    out += CROCKFORD[buf[i]! % 32]!;
  }
  return out;
}

export function buildMemberPublicId(initials: string, yy: string): string {
  const ini = (initials || "XX").toUpperCase().replace(/[^A-Z]/g, "X").padEnd(2, "X").slice(0, 2);
  const y = (yy || "00").replace(/\D/g, "").padStart(2, "0").slice(-2);
  const suffix = randomCrockford(4);
  return `B2C-${ini}-${y}-${suffix}`;
}
