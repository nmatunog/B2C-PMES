/** Copy of `computeAlternatePublicHandle` from `backend/src/pmes/callsign.util.ts` (no Nest deps). */

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
