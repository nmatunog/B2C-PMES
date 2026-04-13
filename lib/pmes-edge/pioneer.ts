import { digitsOnly, normalizeEmail } from "@/lib/pmes-edge/norm";

/** Same as Nest `normalizeTinDigits` for pioneer reclaim. */
export function normalizeTinDigits(raw: string | undefined): string {
  let d = digitsOnly(raw);
  while (d.length > 9) {
    d = d.slice(0, -3);
  }
  return d;
}

export function composeLegacyFullName(parts: {
  firstName?: string;
  middleName?: string;
  lastName?: string;
}): string | null {
  const f = parts.firstName?.trim() ?? "";
  const m = parts.middleName?.trim() ?? "";
  const l = parts.lastName?.trim() ?? "";
  if (!f && !l) return null;
  return [f, m, l].filter(Boolean).join(" ").trim() || null;
}

export function normalizeFullNameForMatch(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}
