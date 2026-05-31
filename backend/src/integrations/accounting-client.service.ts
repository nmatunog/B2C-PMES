import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

export type PostInitialFeesPayload = {
  participantId: string;
  memberIdNo?: string | null;
  email?: string | null;
  fullName?: string | null;
};

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

/**
 * Fire-and-forget POST to B2CCoop Accounting when Treasurer confirms initial fees.
 * Idempotent on externalId — safe to retry.
 */
@Injectable()
export class AccountingClientService {
  private readonly logger = new Logger(AccountingClientService.name);

  constructor(private readonly config: ConfigService) {}

  isConfigured(): boolean {
    const url = String(this.config.get<string>("ACCOUNTING_API_URL") ?? "").trim();
    const secret = String(this.config.get<string>("ACCOUNTING_INTEGRATION_SECRET") ?? "").trim();
    return Boolean(url && secret);
  }

  getInitialMembershipFeeAmount(): number {
    const raw = this.config.get<string>("INITIAL_MEMBERSHIP_FEE_AMOUNT");
    const n = raw != null ? Number(raw) : 1500;
    return Number.isFinite(n) && n > 0 ? n : 1500;
  }

  getAnnualMembershipFeeAmount(): number {
    const raw = this.config.get<string>("ANNUAL_MEMBERSHIP_FEE_AMOUNT");
    const n = raw != null ? Number(raw) : 500;
    return Number.isFinite(n) && n > 0 ? n : 500;
  }

  getInitialShareCapitalAmount(): number {
    const raw = this.config.get<string>("INITIAL_SHARE_CAPITAL_AMOUNT");
    const n = raw != null ? Number(raw) : this.getInitialMembershipFeeAmount() - this.getAnnualMembershipFeeAmount();
    return Number.isFinite(n) && n > 0 ? n : 1000;
  }

  getMonthlyShareCapitalAmount(): number {
    const raw = this.config.get<string>("MONTHLY_SHARE_CAPITAL_AMOUNT");
    const n = raw != null ? Number(raw) : 100;
    return Number.isFinite(n) && n > 0 ? n : 100;
  }

  private memberMetadata(payload: { memberIdNo?: string | null; email?: string | null; fullName?: string | null }) {
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

  private async postJournalEvent(body: Record<string, unknown>): Promise<{ ok: boolean; created: boolean; error?: string }> {
    const base = String(this.config.get<string>("ACCOUNTING_API_URL")).replace(/\/$/, "");
    const secret = String(this.config.get<string>("ACCOUNTING_INTEGRATION_SECRET"));
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

  /** Fire-and-forget (legacy callers). Prefer {@link postInitialFeesPaidAwait}. */
  postInitialFeesPaid(payload: PostInitialFeesPayload): void {
    void this.postInitialFeesPaidAwait(payload);
  }

  /** Posts Dr Cash / Cr revenue + share capital when Treasurer confirms initial fees. */
  async postInitialFeesPaidAwait(payload: PostInitialFeesPayload): Promise<InitialFeesPostResult> {
    const externalId = `participant:${payload.participantId}:initial_fees`;
    if (!this.isConfigured()) {
      this.logger.debug("Accounting integration skipped (ACCOUNTING_API_URL / SECRET not set)");
      return { ok: false, created: false, externalId, error: "Accounting integration not configured" };
    }

    const annualAmount = this.getAnnualMembershipFeeAmount();
    const shareAmount = this.getInitialShareCapitalAmount();
    const occurredAt = new Date().toISOString();
    const metadata = this.memberMetadata(payload);

    const annual = await this.postJournalEvent({
      source: "membership.annual_fee",
      externalId: `participant:${payload.participantId}:initial:annual_fee`,
      participantId: payload.participantId,
      occurredAt,
      amount: annualAmount,
      currency: "PHP",
      memo: "Initial annual membership fee",
      metadata,
    });

    const share = await this.postJournalEvent({
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
      this.logger.warn(`Accounting initial fees failed: ${annual.error ?? share.error}`);
      return { ok: false, created: false, externalId, error: annual.error ?? share.error };
    }

    return {
      ok: true,
      created: Boolean(annual.created || share.created),
      externalId,
    };
  }

  /** Treasurer: post recurring annual membership fee or monthly share capital (idempotent by period). */
  async postMembershipPaymentAwait(payload: PostMembershipPaymentPayload): Promise<MembershipPaymentPostResult> {
    const now = new Date();
    const defaultAnnualPeriod = String(now.getFullYear());
    const defaultSharePeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    if (payload.paymentType === "annual_fee") {
      const period = payload.period?.trim() || defaultAnnualPeriod;
      if (!/^\d{4}$/.test(period)) {
        return {
          ok: false,
          created: false,
          externalId: "",
          source: "membership.annual_fee",
          amount: 0,
          period,
          error: "period must be YYYY for annual_fee",
        };
      }
      const amount = this.getAnnualMembershipFeeAmount();
      const externalId = `participant:${payload.participantId}:membership_fee:${period}`;
      if (!this.isConfigured()) {
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
      const result = await this.postJournalEvent({
        source: "membership.annual_fee",
        externalId,
        participantId: payload.participantId,
        occurredAt: new Date(`${period}-01-01T12:00:00.000Z`).toISOString(),
        amount,
        currency: "PHP",
        memo: `Annual membership fee ${period}`,
        metadata: this.memberMetadata(payload),
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
    if (!/^\d{4}-\d{2}$/.test(period)) {
      return {
        ok: false,
        created: false,
        externalId: "",
        source: "share_capital.contribution",
        amount: 0,
        period,
        error: "period must be YYYY-MM for share_capital",
      };
    }
    const amount = this.getMonthlyShareCapitalAmount();
    const externalId = `participant:${payload.participantId}:share_capital:${period}`;
    if (!this.isConfigured()) {
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
    const result = await this.postJournalEvent({
      source: "share_capital.contribution",
      externalId,
      participantId: payload.participantId,
      occurredAt: new Date(`${period}-01T12:00:00.000Z`).toISOString(),
      amount,
      currency: "PHP",
      memo: `Share capital ${period}`,
      metadata: this.memberMetadata(payload),
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

  /** Await accounting response — used by store checkout (member + webhook). */
  async postMarketplaceSale(payload: PostMarketplaceSalePayload): Promise<MarketplaceSaleResult> {
    if (!this.isConfigured()) {
      return { ok: false, created: false, error: "Accounting integration not configured" };
    }

    const base = String(this.config.get<string>("ACCOUNTING_API_URL")).replace(/\/$/, "");
    const secret = String(this.config.get<string>("ACCOUNTING_INTEGRATION_SECRET"));

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
        this.logger.warn(`Accounting marketplace-sale failed (${res.status}): ${msg}`);
        return { ok: false, created: false, error: msg || `HTTP ${res.status}`, body };
      }
      return { ok: true, created: res.status === 201, body };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Accounting marketplace-sale error: ${msg}`);
      return { ok: false, created: false, error: msg };
    }
  }

  async getMemberPatronageSummary(participantId: string) {
    if (!this.isConfigured()) {
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

    const base = String(this.config.get<string>("ACCOUNTING_API_URL")).replace(/\/$/, "");
    const secret = String(this.config.get<string>("ACCOUNTING_INTEGRATION_SECRET"));

    const res = await fetch(
      `${base}/integrations/v1/members/${encodeURIComponent(participantId)}/patronage`,
      {
        headers: { Authorization: `Bearer ${secret}` },
      },
    );
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
      throw new Error(msg || `HTTP ${res.status}`);
    }
    return body;
  }

  async getMemberPassbookSummary(participantId: string, membershipStart?: string | null) {
    if (!this.isConfigured()) {
      return {
        participantId,
        configured: false,
        currency: "PHP",
        dues: null,
        passbook: [],
        note: "Accounting integration not configured",
      };
    }

    const base = String(this.config.get<string>("ACCOUNTING_API_URL")).replace(/\/$/, "");
    const secret = String(this.config.get<string>("ACCOUNTING_INTEGRATION_SECRET"));
    const url = new URL(`${base}/integrations/v1/members/${encodeURIComponent(participantId)}/passbook`);
    if (membershipStart) {
      url.searchParams.set("membershipStart", membershipStart);
    }

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${secret}` },
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
      throw new Error(msg || `HTTP ${res.status}`);
    }
    return body;
  }
}
