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

  /** Fire-and-forget (legacy callers). Prefer {@link postInitialFeesPaidAwait}. */
  postInitialFeesPaid(payload: PostInitialFeesPayload): void {
    void this.postInitialFeesPaidAwait(payload);
  }

  /** Posts Dr Cash / Cr Share capital when Treasurer confirms initial fees. */
  async postInitialFeesPaidAwait(payload: PostInitialFeesPayload): Promise<InitialFeesPostResult> {
    const externalId = `participant:${payload.participantId}:initial_fees`;
    if (!this.isConfigured()) {
      this.logger.debug("Accounting integration skipped (ACCOUNTING_API_URL / SECRET not set)");
      return { ok: false, created: false, externalId, error: "Accounting integration not configured" };
    }

    const base = String(this.config.get<string>("ACCOUNTING_API_URL")).replace(/\/$/, "");
    const secret = String(this.config.get<string>("ACCOUNTING_INTEGRATION_SECRET"));
    const amount = this.getInitialMembershipFeeAmount();
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
        this.logger.warn(`Accounting initial_fees failed (${res.status}): ${text.slice(0, 200)}`);
        return { ok: false, created: false, externalId, error: text.slice(0, 200) || `HTTP ${res.status}` };
      }
      return { ok: true, created: res.status === 201, externalId };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Accounting initial_fees error: ${msg}`);
      return { ok: false, created: false, externalId, error: msg };
    }
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
}
