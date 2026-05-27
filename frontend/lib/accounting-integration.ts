export type PostInitialFeesPayload = {
  participantId: string;
  memberIdNo?: string | null;
  email?: string | null;
  fullName?: string | null;
};

export function isAccountingConfigured(): boolean {
  const url = String(process.env.ACCOUNTING_API_URL ?? "").trim();
  const secret = String(process.env.ACCOUNTING_INTEGRATION_SECRET ?? "").trim();
  return Boolean(url && secret);
}

export function getInitialMembershipFeeAmount(): number {
  const raw = process.env.INITIAL_MEMBERSHIP_FEE_AMOUNT;
  const n = raw != null ? Number(raw) : 1500;
  return Number.isFinite(n) && n > 0 ? n : 1500;
}

/** Non-blocking — logs to console on failure, never throws. */
export function postInitialFeesPaid(payload: PostInitialFeesPayload): void {
  if (!isAccountingConfigured()) return;

  const base = String(process.env.ACCOUNTING_API_URL).replace(/\/$/, "");
  const secret = String(process.env.ACCOUNTING_INTEGRATION_SECRET);
  const amount = getInitialMembershipFeeAmount();
  const externalId = `participant:${payload.participantId}:initial_fees`;
  const nameParts = String(payload.fullName ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const firstName = nameParts[0] ?? undefined;
  const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : undefined;

  const body = {
    source: "membership.initial_fees",
    externalId,
    participantId: payload.participantId,
    occurredAt: new Date().toISOString(),
    amount,
    currency: "PHP",
    memo: "Share + membership fee",
    metadata: {
      memberIdNo: payload.memberIdNo ?? undefined,
      email: payload.email ?? undefined,
      firstName,
      lastName,
    },
  };

  void fetch(`${base}/integrations/v1/journal-events`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  }).catch((err) => {
    console.warn(
      "[accounting] post initial fees failed:",
      err instanceof Error ? err.message : String(err),
    );
  });
}
