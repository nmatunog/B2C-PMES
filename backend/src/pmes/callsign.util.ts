import { BadRequestException } from "@nestjs/common";

/**
 * Slug for grouping default alternate ids: lowercase letters/digits, 2+ chars.
 * Single-letter surnames repeat the character (e.g. "o" → "oo").
 */
export function normalizeLastNameKey(lastName: string): string | null {
  const raw = String(lastName ?? "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
  if (raw.length === 0) return null;
  if (raw.length === 1) return `${raw}${raw}`;
  return raw.slice(0, 48);
}

/**
 * Validates optional callsign; returns normalized lowercase string.
 * Reserved: looks like official B2C member ids, or system default `lastname-###` pattern.
 */
export function validateAndNormalizeCallsignInput(raw: string): string {
  const s = String(raw ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");

  if (s.length < 3 || s.length > 18) {
    throw new BadRequestException("Callsign must be 3–18 characters.");
  }
  if (!/^[a-z0-9][a-z0-9_-]*[a-z0-9]$/.test(s)) {
    throw new BadRequestException("Use letters, numbers, hyphen, or underscore only (no spaces).");
  }
  if (s.startsWith("b2c")) {
    throw new BadRequestException("Callsign cannot start with b2c (reserved for member IDs).");
  }
  /** Matches default alternate format `lastname-12` so we do not collide with auto-assigned handles. */
  if (/^[a-z]{2,}-\d{1,4}$/.test(s)) {
    throw new BadRequestException("That pattern is reserved for default last-name handles (e.g. cruz-2). Pick another.");
  }
  return s;
}

export function computeAlternatePublicHandle(p: {
  callsign: string | null;
  lastNameKey: string | null;
  lastNameSeq: number | null;
}): string | null {
  const c = p.callsign?.trim();
  if (c) return c;
  if (p.lastNameKey?.trim() && p.lastNameSeq != null && p.lastNameSeq > 0) {
    return `${p.lastNameKey}-${p.lastNameSeq}`;
  }
  return null;
}
