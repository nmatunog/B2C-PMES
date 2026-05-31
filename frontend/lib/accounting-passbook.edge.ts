export async function fetchMemberPassbookFromAccounting(
  participantId: string,
  membershipStart?: string | null,
) {
  const base = String(process.env.ACCOUNTING_API_URL ?? "").replace(/\/$/, "");
  const secret = String(process.env.ACCOUNTING_INTEGRATION_SECRET ?? "").trim();
  if (!base || !secret) {
    return {
      participantId,
      configured: false,
      currency: "PHP",
      dues: null,
      passbook: [],
      note: "Accounting integration not configured",
    };
  }

  const url = new URL(`${base}/integrations/v1/members/${encodeURIComponent(participantId)}/passbook`);
  if (membershipStart) {
    url.searchParams.set("membershipStart", membershipStart);
  }

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${secret}` },
  });
  const text = await res.text().catch(() => "");
  if (!res.ok) {
    throw new Error(text.slice(0, 200) || `Accounting passbook fetch failed (${res.status})`);
  }
  return JSON.parse(text) as Record<string, unknown>;
}
