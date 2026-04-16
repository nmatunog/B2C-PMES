/**
 * Edge routes SELECT/UPDATE `memberProfileConcurrencyStamp` after Prisma migration. If production DB
 * has not run the migration yet, Postgres errors — detect and retry without the column (stamp = 0).
 */
export function isMissingMemberProfileStampColumnError(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e ?? "");
  if (!/memberProfileConcurrencyStamp/i.test(msg)) return false;
  const code = typeof (e as { code?: string })?.code === "string" ? (e as { code: string }).code : "";
  return (
    code === "42703" ||
    /does not exist/i.test(msg) ||
    /undefined column/i.test(msg) ||
    /column .* does not exist/i.test(msg)
  );
}
