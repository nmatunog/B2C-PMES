import { NextResponse } from "next/server";
import { getSql } from "@/lib/db";
import { EDGE_CORS_HEADERS, edgeCorsOptions } from "@/lib/edge-cors";
import { forbidden, requireStaff, unauthorized } from "@/lib/staff-edge-auth";

type StaffRoleRow = { role: "ADMIN" | "SUPERUSER" };

export function OPTIONS() {
  return edgeCorsOptions();
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const staff = await requireStaff(request);
    const sql = getSql();
    const roleRows = (await sql`
      SELECT role
      FROM "StaffUser"
      WHERE id = ${staff.sub}
      LIMIT 1
    `) as StaffRoleRow[];
    if (roleRows[0]?.role !== "SUPERUSER") {
      return forbidden("Only a superuser can delete PMES records");
    }

    const { id } = await context.params;
    const recordId = String(id ?? "").trim();
    if (!recordId) {
      return NextResponse.json({ message: "Record id required", statusCode: 400 }, { status: 400, headers: EDGE_CORS_HEADERS });
    }

    const deleted = (await sql`
      DELETE FROM "PmesRecord"
      WHERE id = ${recordId}
      RETURNING id
    `) as Array<{ id: string }>;
    if (!deleted[0]) {
      return NextResponse.json({ message: "PMES record not found", statusCode: 404 }, { status: 404, headers: EDGE_CORS_HEADERS });
    }
    return NextResponse.json({ success: true, deletedId: deleted[0].id }, { headers: EDGE_CORS_HEADERS });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unauthorized";
    return unauthorized(message);
  }
}
