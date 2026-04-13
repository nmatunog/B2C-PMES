/**
 * Types for {@link ./db.js} — Neon tagged-template client.
 */
export function getSql(): (
  strings: TemplateStringsArray,
  ...values: unknown[]
) => Promise<Record<string, unknown>[]>;

/** Tagged-template SQL helper (same client as {@link getSql}). */
export function sql(
  strings: TemplateStringsArray,
  ...values: unknown[]
): Promise<Record<string, unknown>[]>;
