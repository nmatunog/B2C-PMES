import { NextResponse } from "next/server";
import { postMembershipPaymentAwait } from "@/lib/accounting-integration";
import { getSql } from "@/lib/db";
import { EDGE_CORS_HEADERS, edgeCorsOptions } from "@/lib/edge-cors";
import { requireStaff, unauthorized, forbidden } from "@/lib/staff-edge-auth";

export function OPTIONS() {
  return edgeCorsOptions();
}

export async function POST(request: Request) {
  try {
    const staff = await requireStaff(request);
    const body = (await request.json().catch(() => null)) as
      | { participantId?: string; paymentType?: string; period?: string }
      | null;
    const participantId = String(body?.participantId ?? "").trim();
    const paymentType = body?.paymentType;
    const period = body?.period?.trim() || undefined;

    if (!participantId) {
      return NextResponse.json(
        { message: "participantId is required", statusCode: 400 },
        { status: 400, headers: EDGE_CORS_HEADERS },
      );
    }
    if (paymentType !== "annual_fee" && paymentType !== "share_capital") {
      return NextResponse.json(
        { message: "paymentType must be annual_fee or share_capital", statusCode: 400 },
        { status: 400, headers: EDGE_CORS_HEADERS },
      );
    }
    if (!["superuser", "admin", "treasurer"].includes(staff.role)) {
      return forbidden("Only Treasurer (or Admin / Superuser) can record membership payments.", EDGE_CORS_HEADERS);
    }

    const sql = getSql();
    const rows = await sql`
      SELECT id, email, "memberIdNo", "fullName", "initialFeesPaidAt"
      FROM "Participant"
      WHERE id = ${participantId}
      LIMIT 1
    `;
    const participant = rows[0] as
      | {
          id: string;
          email: string;
          memberIdNo: string | null;
          fullName: string | null;
          initialFeesPaidAt: Date | null;
        }
      | undefined;
    if (!participant) {
      return NextResponse.json({ message: "Participant not found", statusCode: 404 }, { status: 404, headers: EDGE_CORS_HEADERS });
    }
    if (!participant.initialFeesPaidAt) {
      return NextResponse.json(
        { message: "Confirm initial fees before recording recurring payments.", statusCode: 400 },
        { status: 400, headers: EDGE_CORS_HEADERS },
      );
    }

    const accountingPayment = await postMembershipPaymentAwait({
      participantId: participant.id,
      paymentType,
      period,
      memberIdNo: participant.memberIdNo,
      email: participant.email,
      fullName: participant.fullName,
    });

    if (!accountingPayment.ok) {
      return NextResponse.json(
        { message: accountingPayment.error ?? "Accounting post failed", statusCode: 400 },
        { status: 400, headers: EDGE_CORS_HEADERS },
      );
    }

    return NextResponse.json({ ok: true, accountingPayment }, { headers: EDGE_CORS_HEADERS });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unauthorized";
    return unauthorized(message);
  }
}
