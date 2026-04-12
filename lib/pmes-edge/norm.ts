export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function digitsOnly(s: string | null | undefined): string {
  return String(s ?? "").replace(/\D/g, "");
}

export function isNineDigitTinPlaceholderInMemberIdSlot(
  legacyPioneerImport: boolean,
  memberIdNo: string | null | undefined,
): boolean {
  if (!legacyPioneerImport) return false;
  const d = digitsOnly(memberIdNo);
  return d.length === 9 && !/^B2C-/i.test(String(memberIdNo ?? "").trim());
}
