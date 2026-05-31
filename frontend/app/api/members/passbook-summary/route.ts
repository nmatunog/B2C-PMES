import { NextResponse } from "next/server";
import { fetchMemberPassbookFromAccounting } from "@/lib/accounting-passbook.edge";
import { getSql } from "@/lib/db";
import { EDGE_CORS_HEADERS, edgeCorsOptions } from "@/lib/edge-cors";
import { assertMemberEmailMatchesFirebaseToken } from "@/lib/pmes-edge/member-bearer";
import { normalizeEmail } from "@/lib/pmes-edge/norm";

export function OPTIONS() {
  return edgeCorsOptions();
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const emailRaw = String(searchParams.get("email") ?? "").trim();
  if (!emailRaw) {
    return NextResponse.json(
      { message: "email query parameter is required", statusCode: 400 },
      { status: 400, headers: EDGE_CORS_HEADERS },
    );
  }
  const email = normalizeEmail(emailRaw);

  try {
    await assertMemberEmailMatchesFirebaseToken(request.headers.get("authorization"), email);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unauthorized";
    if (msg.startsWith("UNAUTHORIZED:")) {
      return NextResponse.json(
        { message: msg.replace(/^UNAUTHORIZED:\s*/, ""), statusCode: 401 },
        { status: 401, headers: EDGE_CORS_HEADERS },
      );
    }
    return NextResponse.json({ message: msg, statusCode: 401 }, { status: 401, headers: EDGE_CORS_HEADERS });
  }

  const sql = getSql();
  const rows = await sql`
    SELECT id, "memberIdNo", "fullName", "initialFeesPaidAt"
    FROM "Participant"
    WHERE email = ${email}
    LIMIT 1
  `;
  const participant = rows[0] as
    | { id: string; memberIdNo: string | null; fullName: string | null; initialFeesPaidAt: Date | null }
    | undefined;
  if (!participant) {
    return NextResponse.json(
      {
        participantId: null,
        configured: false,
        currency: "PHP",
        dues: null,
        passbook: [],
        note: "Member record not found — complete PMES sync first.",
      },
      { headers: EDGE_CORS_HEADERS },
    );
  }

  const membershipStart = participant.initialFeesPaidAt?.toISOString() ?? null;

  try {
    const summary = await fetchMemberPassbookFromAccounting(participant.id, membershipStart);
    return NextResponse.json(
      {
        ...summary,
        configured: true,
        memberIdNo: participant.memberIdNo,
        fullName: participant.fullName,
        initialFeesPaidAt: membershipStart,
      },
      { headers: EDGE_CORS_HEADERS },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Passbook summary failed";
    return NextResponse.json({ message: msg, statusCode: 502 }, { status: 502, headers: EDGE_CORS_HEADERS });
  }
}
