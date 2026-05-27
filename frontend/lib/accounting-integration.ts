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

export type InitialFeesPostResult = {
  ok: boolean;
  created: boolean;
  externalId: string;
  error?: string;
};

/** Fire-and-forget (legacy). Prefer {@link postInitialFeesPaidAwait}. */
export function postInitialFeesPaid(payload: PostInitialFeesPayload): void {
  void postInitialFeesPaidAwait(payload);
}

export async function postInitialFeesPaidAwait(
  payload: PostInitialFeesPayload,
): Promise<InitialFeesPostResult> {
  const externalId = `participant:${payload.participantId}:initial_fees`;
  if (!isAccountingConfigured()) {
    return { ok: false, created: false, externalId, error: "Accounting integration not configured" };
  }

  const base = String(process.env.ACCOUNTING_API_URL).replace(/\/$/, "");
  const secret = String(process.env.ACCOUNTING_INTEGRATION_SECRET);
  const amount = getInitialMembershipFeeAmount();
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

  try {
    const res = await fetch(`${base}/integrations/v1/journal-events`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const text = await res.text().catch(() => "");
    if (!res.ok) {
      console.warn("[accounting] post initial fees failed:", res.status, text.slice(0, 200));
      return { ok: false, created: false, externalId, error: text.slice(0, 200) || `HTTP ${res.status}` };
    }
    return { ok: true, created: res.status === 201, externalId };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn("[accounting] post initial fees failed:", msg);
    return { ok: false, created: false, externalId, error: msg };
  }
}

export type PostMarketplaceSalePayload = {
  externalId: string;
  occurredAt: string;
  currency: string;
  grossAmount: number;
  salesAmount: number;
  vendorPayableAmount: number;
  cogsAmount?: number;
  patronageAmount?: number;
  vendorCode: string;
  buyerParticipantId?: string;
  memo?: string;
  metadata?: Record<string, unknown>;
};

export type MarketplaceSaleResult = {
  ok: boolean;
  created: boolean;
  body?: unknown;
  error?: string;
};

export async function postMarketplaceSale(
  payload: PostMarketplaceSalePayload,
): Promise<MarketplaceSaleResult> {
  if (!isAccountingConfigured()) {
    return { ok: false, created: false, error: "Accounting integration not configured" };
  }

  const base = String(process.env.ACCOUNTING_API_URL).replace(/\/$/, "");
  const secret = String(process.env.ACCOUNTING_INTEGRATION_SECRET);

  try {
    const res = await fetch(`${base}/api/v1/finance/marketplace-sale`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    const text = await res.text().catch(() => "");
    let body: unknown = text;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      /* plain text */
    }
    if (!res.ok) {
      const msg =
        typeof body === "object" && body && "message" in body
          ? String((body as { message: unknown }).message)
          : text.slice(0, 200);
      console.warn("[accounting] marketplace-sale failed:", res.status, msg);
      return { ok: false, created: false, error: msg || `HTTP ${res.status}`, body };
    }
    return { ok: true, created: res.status === 201, body };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn("[accounting] marketplace-sale error:", msg);
    return { ok: false, created: false, error: msg };
  }
}
