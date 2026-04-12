/**
 * Canonical height string for `personal.heightFeetInches`: `5' 8"` (feet 0–8, inches 0–11).
 */

/** @param {string} feet @param {string} inches */
export function formatHeightFeetInches(feet, inches) {
  const f = String(feet ?? "").trim();
  if (!f) return "";
  let i = String(inches ?? "").trim();
  if (i === "") i = "0";
  const n = parseInt(i, 10);
  if (!Number.isFinite(n) || n < 0 || n > 11) return "";
  return `${f}' ${n}"`;
}

/**
 * @returns {{ feet: string; inches: string; legacy: boolean }}
 * `legacy` true when non-empty text could not be parsed (keep free-text until member re-enters).
 */
export function parseHeightFeetInches(s) {
  const raw = String(s ?? "").trim();
  if (!raw) return { feet: "", inches: "", legacy: false };

  const patterns = [
    /^(\d)['′’]\s*(\d{1,2})\s*["″”]?$/,
    /^(\d)\s*ft\s*(\d{1,2})\s*in$/i,
    /^(\d)\s*[-–]\s*(\d{1,2})$/,
  ];
  for (const re of patterns) {
    const m = raw.match(re);
    if (!m) continue;
    const fi = parseInt(m[2], 10);
    if (Number.isFinite(fi) && fi >= 0 && fi <= 11) {
      return { feet: m[1], inches: String(fi), legacy: false };
    }
  }
  return { feet: "", inches: "", legacy: raw.length > 0 };
}
