export async function fetchMemberPatronageFromAccounting(participantId: string) {
  const base = String(process.env.ACCOUNTING_API_URL ?? "").replace(/\/$/, "");
  const secret = String(process.env.ACCOUNTING_INTEGRATION_SECRET ?? "").trim();
  if (!base || !secret) {
    return {
      participantId,
      currency: "PHP",
      patronageAccruedBalance: "0.00",
      purchaseCount: 0,
      lastAccrualAt: null,
      accruals: [],
      note: "Accounting integration not configured",
    };
  }

  const res = await fetch(`${base}/integrations/v1/members/${encodeURIComponent(participantId)}/patronage`, {
    headers: { Authorization: `Bearer ${secret}` },
  });
  const text = await res.text().catch(() => "");
  if (!res.ok) {
    throw new Error(text.slice(0, 200) || `Accounting patronage fetch failed (${res.status})`);
  }
  return JSON.parse(text) as Record<string, unknown>;
}
