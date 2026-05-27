import { BadRequestException, Controller, Get, Headers, Query, UnauthorizedException } from "@nestjs/common";
import { AuthService } from "../auth/auth.service";
import { AccountingClientService } from "../integrations/accounting-client.service";
import { PrismaService } from "../prisma/prisma.service";

@Controller("members")
export class MembersController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auth: AuthService,
    private readonly accounting: AccountingClientService,
  ) {}

  /** Member portal: patronage accrual ledger from accounting (Firebase session). */
  @Get("patronage-summary")
  async patronageSummary(
    @Query("email") emailRaw: string,
    @Headers("authorization") authorization: string | undefined,
  ) {
    const email = String(emailRaw ?? "").trim().toLowerCase();
    if (!email) {
      throw new BadRequestException("email query parameter is required");
    }

    const firebaseUid = await this.auth.verifyMemberEmailBearer(authorization, email);
    const participant = await this.prisma.participant.findUnique({
      where: { email },
      select: { id: true, firebaseUid: true, memberIdNo: true, fullName: true },
    });
    if (!participant) {
      return {
        participantId: null,
        configured: this.accounting.isConfigured(),
        patronageAccruedBalance: "0.00",
        purchaseCount: 0,
        accruals: [],
        note: "Member record not found — complete PMES sync first.",
      };
    }
    if (firebaseUid && participant.firebaseUid && participant.firebaseUid !== firebaseUid) {
      throw new UnauthorizedException("Firebase account does not match member record");
    }

    if (!this.accounting.isConfigured()) {
      return {
        participantId: participant.id,
        configured: false,
        patronageAccruedBalance: "0.00",
        purchaseCount: 0,
        accruals: [],
        note: "Patronage ledger is not connected yet (accounting API not configured).",
      };
    }

    try {
      const summary = await this.accounting.getMemberPatronageSummary(participant.id);
      return {
        ...(summary as Record<string, unknown>),
        configured: true,
        memberIdNo: participant.memberIdNo,
        fullName: participant.fullName,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Patronage summary failed";
      return {
        participantId: participant.id,
        configured: true,
        patronageAccruedBalance: "0.00",
        purchaseCount: 0,
        accruals: [],
        memberIdNo: participant.memberIdNo,
        fullName: participant.fullName,
        note: msg,
      };
    }
  }
}
