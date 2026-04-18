import { NextResponse } from "next/server";
import { getSql } from "@/lib/db";
import { EDGE_CORS_HEADERS, edgeCorsOptions } from "@/lib/edge-cors";
import { forbidden, requireStaff, unauthorized } from "@/lib/staff-edge-auth";
import { buildAdminParticipantDetailJson } from "@/lib/pmes-edge/build-admin-participant-detail";

async function isSuperuser(staffId: string): Promise<boolean> {
  const sql = getSql();
  const rows = (await sql`
    SELECT role
    FROM "StaffUser"
    WHERE id = ${staffId}
    LIMIT 1
  `) as Array<{ role: "ADMIN" | "SUPERUSER" }>;
  return rows[0]?.role === "SUPERUSER";
}

export function OPTIONS() {
  return edgeCorsOptions();
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requireStaff(request);
    const { id } = await context.params;
    const participantId = String(id ?? "").trim();
    const body = await buildAdminParticipantDetailJson(participantId);
    if (!body) {
      return NextResponse.json({ message: "Participant not found", statusCode: 404 }, { status: 404, headers: EDGE_CORS_HEADERS });
    }
    return NextResponse.json(body, { headers: EDGE_CORS_HEADERS });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unauthorized";
    return unauthorized(message);
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const staff = await requireStaff(request);
    if (!(await isSuperuser(staff.sub))) {
      return forbidden("Only a superuser can delete participants");
    }
    const { id } = await context.params;
    const participantId = String(id ?? "").trim();
    if (!participantId) {
      return NextResponse.json({ message: "participant id is required", statusCode: 400 }, { status: 400, headers: EDGE_CORS_HEADERS });
    }
    const sql = getSql();
    const hit = (await sql`SELECT id FROM "Participant" WHERE id = ${participantId} LIMIT 1`) as Array<{ id: string }>;
    if (!hit[0]) {
      return NextResponse.json({ message: "Participant not found", statusCode: 404 }, { status: 404, headers: EDGE_CORS_HEADERS });
    }
    await sql`DELETE FROM "PmesRecord" WHERE "participantId" = ${participantId}`;
    await sql`DELETE FROM "LoiSubmission" WHERE "participantId" = ${participantId}`;
    await sql`DELETE FROM "Participant" WHERE id = ${participantId}`;
    return NextResponse.json({ deleted: true, participantId }, { headers: EDGE_CORS_HEADERS });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unauthorized";
    return unauthorized(message);
  }
}
