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

export function getAnnualMembershipFeeAmount(): number {
  const raw = process.env.ANNUAL_MEMBERSHIP_FEE_AMOUNT;
  const n = raw != null ? Number(raw) : 500;
  return Number.isFinite(n) && n > 0 ? n : 500;
}

export function getInitialShareCapitalAmount(): number {
  const raw = process.env.INITIAL_SHARE_CAPITAL_AMOUNT;
  const n = raw != null ? Number(raw) : getInitialMembershipFeeAmount() - getAnnualMembershipFeeAmount();
  return Number.isFinite(n) && n > 0 ? n : 1000;
}

export function getMonthlyShareCapitalAmount(): number {
  const raw = process.env.MONTHLY_SHARE_CAPITAL_AMOUNT;
  const n = raw != null ? Number(raw) : 100;
  return Number.isFinite(n) && n > 0 ? n : 100;
}

function memberMetadata(payload: PostInitialFeesPayload) {
  const nameParts = String(payload.fullName ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  return {
    memberIdNo: payload.memberIdNo ?? undefined,
    email: payload.email ?? undefined,
    firstName: nameParts[0] ?? undefined,
    lastName: nameParts.length > 1 ? nameParts.slice(1).join(" ") : undefined,
  };
}

async function postJournalEvent(body: Record<string, unknown>): Promise<{ ok: boolean; created: boolean; error?: string }> {
  const base = String(process.env.ACCOUNTING_API_URL).replace(/\/$/, "");
  const secret = String(process.env.ACCOUNTING_INTEGRATION_SECRET);
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
      return { ok: false, created: false, error: text.slice(0, 200) || `HTTP ${res.status}` };
    }
    return { ok: true, created: res.status === 201 };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, created: false, error: msg };
  }
}

export type InitialFeesPostResult = {
  ok: boolean;
  created: boolean;
  externalId: string;
  error?: string;
};

export type PostMembershipPaymentPayload = {
  participantId: string;
  paymentType: "annual_fee" | "share_capital";
  period?: string;
  memberIdNo?: string | null;
  email?: string | null;
  fullName?: string | null;
};

export type MembershipPaymentPostResult = {
  ok: boolean;
  created: boolean;
  externalId: string;
  source: string;
  amount: number;
  period: string;
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

  const annualAmount = getAnnualMembershipFeeAmount();
  const shareAmount = getInitialShareCapitalAmount();
  const occurredAt = new Date().toISOString();
  const metadata = memberMetadata(payload);

  const annual = await postJournalEvent({
    source: "membership.annual_fee",
    externalId: `participant:${payload.participantId}:initial:annual_fee`,
    participantId: payload.participantId,
    occurredAt,
    amount: annualAmount,
    currency: "PHP",
    memo: "Initial annual membership fee",
    metadata,
  });

  const share = await postJournalEvent({
    source: "share_capital.contribution",
    externalId: `participant:${payload.participantId}:initial:share_capital`,
    participantId: payload.participantId,
    occurredAt,
    amount: shareAmount,
    currency: "PHP",
    memo: "Initial share capital",
    metadata,
  });

  if (!annual.ok && !share.ok) {
    console.warn("[accounting] post initial fees failed:", annual.error ?? share.error);
    return { ok: false, created: false, externalId, error: annual.error ?? share.error };
  }

  return { ok: true, created: Boolean(annual.created || share.created), externalId };
}

export async function postMembershipPaymentAwait(
  payload: PostMembershipPaymentPayload,
): Promise<MembershipPaymentPostResult> {
  const now = new Date();
  const defaultAnnualPeriod = String(now.getFullYear());
  const defaultSharePeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  if (payload.paymentType === "annual_fee") {
    const period = payload.period?.trim() || defaultAnnualPeriod;
    const amount = getAnnualMembershipFeeAmount();
    const externalId = `participant:${payload.participantId}:membership_fee:${period}`;
    if (!/^\d{4}$/.test(period)) {
      return {
        ok: false,
        created: false,
        externalId,
        source: "membership.annual_fee",
        amount,
        period,
        error: "period must be YYYY for annual_fee",
      };
    }
    if (!isAccountingConfigured()) {
      return {
        ok: false,
        created: false,
        externalId,
        source: "membership.annual_fee",
        amount,
        period,
        error: "Accounting integration not configured",
      };
    }
    const result = await postJournalEvent({
      source: "membership.annual_fee",
      externalId,
      participantId: payload.participantId,
      occurredAt: new Date(`${period}-01-01T12:00:00.000Z`).toISOString(),
      amount,
      currency: "PHP",
      memo: `Annual membership fee ${period}`,
      metadata: memberMetadata(payload),
    });
    return {
      ok: result.ok,
      created: result.created,
      externalId,
      source: "membership.annual_fee",
      amount,
      period,
      error: result.error,
    };
  }

  const period = payload.period?.trim() || defaultSharePeriod;
  const amount = getMonthlyShareCapitalAmount();
  const externalId = `participant:${payload.participantId}:share_capital:${period}`;
  if (!/^\d{4}-\d{2}$/.test(period)) {
    return {
      ok: false,
      created: false,
      externalId,
      source: "share_capital.contribution",
      amount,
      period,
      error: "period must be YYYY-MM for share_capital",
    };
  }
  if (!isAccountingConfigured()) {
    return {
      ok: false,
      created: false,
      externalId,
      source: "share_capital.contribution",
      amount,
      period,
      error: "Accounting integration not configured",
    };
  }
  const result = await postJournalEvent({
    source: "share_capital.contribution",
    externalId,
    participantId: payload.participantId,
    occurredAt: new Date(`${period}-01T12:00:00.000Z`).toISOString(),
    amount,
    currency: "PHP",
    memo: `Share capital ${period}`,
    metadata: memberMetadata(payload),
  });
  return {
    ok: result.ok,
    created: result.created,
    externalId,
    source: "share_capital.contribution",
    amount,
    period,
    error: result.error,
  };
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
