import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

export type PostInitialFeesPayload = {
  participantId: string;
  memberIdNo?: string | null;
  email?: string | null;
  fullName?: string | null;
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

  /** Non-blocking — logs errors, never throws to caller. */
  postInitialFeesPaid(payload: PostInitialFeesPayload): void {
    if (!this.isConfigured()) {
      this.logger.debug("Accounting integration skipped (ACCOUNTING_API_URL / SECRET not set)");
      return;
    }

    const base = String(this.config.get<string>("ACCOUNTING_API_URL")).replace(/\/$/, "");
    const secret = String(this.config.get<string>("ACCOUNTING_INTEGRATION_SECRET"));
    const amount = this.getInitialMembershipFeeAmount();
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
    })
      .then(async (res) => {
        if (!res.ok) {
          const text = await res.text().catch(() => "");
          this.logger.warn(`Accounting post failed (${res.status}): ${text.slice(0, 200)}`);
        }
      })
      .catch((err) => {
        this.logger.warn(`Accounting post error: ${err instanceof Error ? err.message : String(err)}`);
      });
  }
}
