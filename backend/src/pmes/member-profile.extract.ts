type JsonObject = Record<string, unknown>;

function asObject(x: unknown): JsonObject | null {
  if (x && typeof x === "object" && !Array.isArray(x)) return x as JsonObject;
  return null;
}

/** Concatenate present-address fields into one mailing line (Philippines-style). */
export function formatPresentAddressMailing(present: unknown): string {
  const a = asObject(present);
  if (!a) return "";
  const parts = [
    a.houseNo,
    a.street,
    a.subdivision,
    a.barangay,
    a.cityMunicipality,
    a.province,
    a.region,
    a.country,
    a.postalCode,
  ]
    .map((x) => (typeof x === "string" ? x.trim() : ""))
    .filter(Boolean);
  return parts.join(", ");
}

export type DerivedMemberRegistryFields = {
  mailingAddress: string;
  civilStatus: string;
  memberIdNo: string;
};

/** Map raw membership form JSON (client `profileJson`) to DB columns + snapshot. */
export function deriveFromMemberProfile(profile: unknown): DerivedMemberRegistryFields {
  const p = asObject(profile);
  if (!p) return { mailingAddress: "", civilStatus: "", memberIdNo: "" };
  const personal = asObject(p.personal);
  const civilStatus = typeof personal?.civilStatus === "string" ? personal.civilStatus.trim() : "";
  const memberIdNo = typeof personal?.memberIdNo === "string" ? personal.memberIdNo.trim() : "";
  const mailingAddress = formatPresentAddressMailing(p.presentAddress);
  return { mailingAddress, civilStatus, memberIdNo };
}

export type FullProfileEnvelope = {
  formVersion?: string;
  profile?: unknown;
  sheetFileName?: string;
  notes?: string;
  submittedAt?: string;
};

export function parseFullProfileEnvelope(fullProfileJson: string | null): FullProfileEnvelope | null {
  if (!fullProfileJson?.trim()) return null;
  try {
    const v = JSON.parse(fullProfileJson) as unknown;
    const o = asObject(v);
    return o ?? null;
  } catch {
    return null;
  }
}
