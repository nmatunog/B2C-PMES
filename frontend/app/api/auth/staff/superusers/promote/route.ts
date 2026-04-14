import { NextResponse } from "next/server";
import { getSql } from "@/lib/db";
import { EDGE_CORS_HEADERS, edgeCorsOptions } from "@/lib/edge-cors";
import { forbidden, requireStaff, unauthorized } from "@/lib/staff-edge-auth";

type StaffRoleRow = { id: string; role: "ADMIN" | "SUPERUSER" };

export function OPTIONS() {
  return edgeCorsOptions();
}

export async function POST(request: Request) {
  try {
    const staff = await requireStaff(request);
    const sql = getSql();
    const actorRows = (await sql`
      SELECT id, role
      FROM "StaffUser"
      WHERE id = ${staff.sub}
      LIMIT 1
    `) as StaffRoleRow[];
    if (actorRows[0]?.role !== "SUPERUSER") {
      return forbidden("Only a superuser can promote staff to superuser");
    }

    const body = (await request.json().catch(() => null)) as { email?: string } | null;
    const email = String(body?.email ?? "").trim().toLowerCase();
    if (!email) {
      return NextResponse.json({ message: "Email is required", statusCode: 400 }, { status: 400, headers: EDGE_CORS_HEADERS });
    }

    const targetRows = (await sql`
      SELECT id, email, role, "createdAt"
      FROM "StaffUser"
      WHERE email = ${email}
      LIMIT 1
    `) as Array<{ id: string; email: string; role: "ADMIN" | "SUPERUSER"; createdAt: string }>;
    const target = targetRows[0];
    if (!target) {
      return NextResponse.json(
        { message: "No staff account found for that email", statusCode: 400 },
        { status: 400, headers: EDGE_CORS_HEADERS },
      );
    }
    if (target.role === "SUPERUSER") {
      return NextResponse.json(
        { message: "That account is already a superuser", statusCode: 409 },
        { status: 409, headers: EDGE_CORS_HEADERS },
      );
    }

    await sql`
      UPDATE "StaffUser"
      SET role = 'SUPERUSER'
      WHERE id = ${target.id}
    `;
    return NextResponse.json(
      { id: target.id, email: target.email, role: "superuser", createdAt: target.createdAt },
      { headers: EDGE_CORS_HEADERS },
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unauthorized";
    return unauthorized(message);
  }
}
