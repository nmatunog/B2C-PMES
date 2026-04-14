import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getSql } from "@/lib/db";
import { EDGE_CORS_HEADERS, edgeCorsOptions } from "@/lib/edge-cors";
import { requireStaff, unauthorized } from "@/lib/staff-edge-auth";

type StaffPasswordRow = { id: string; passwordHash: string };

export function OPTIONS() {
  return edgeCorsOptions();
}

export async function PATCH(request: Request) {
  try {
    const staff = await requireStaff(request);
    const body = (await request.json().catch(() => null)) as
      | { currentPassword?: string; newPassword?: string }
      | null;
    const currentPassword = String(body?.currentPassword ?? "");
    const newPassword = String(body?.newPassword ?? "");
    if (currentPassword.length < 8 || newPassword.length < 8) {
      return NextResponse.json(
        { message: "Current and new password must both be at least 8 characters.", statusCode: 400 },
        { status: 400, headers: EDGE_CORS_HEADERS },
      );
    }

    const sql = getSql();
    const rows = (await sql`
      SELECT id, "passwordHash"
      FROM "StaffUser"
      WHERE id = ${staff.sub}
      LIMIT 1
    `) as StaffPasswordRow[];
    const row = rows[0];
    if (!row) return unauthorized("Invalid staff account");

    const ok = await bcrypt.compare(currentPassword, row.passwordHash);
    if (!ok) return unauthorized("Current password is incorrect");

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await sql`
      UPDATE "StaffUser"
      SET "passwordHash" = ${passwordHash}
      WHERE id = ${staff.sub}
    `;
    return NextResponse.json({ success: true, message: "Password updated" }, { headers: EDGE_CORS_HEADERS });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unauthorized";
    return unauthorized(message);
  }
}
