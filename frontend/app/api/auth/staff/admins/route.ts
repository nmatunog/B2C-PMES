import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getSql } from "@/lib/db";
import { EDGE_CORS_HEADERS, edgeCorsOptions } from "@/lib/edge-cors";
import { forbidden, requireStaff, unauthorized } from "@/lib/staff-edge-auth";

type StaffRow = {
  id: string;
  email: string;
  role: "ADMIN" | "SUPERUSER";
};

async function assertSuperuser(staffId: string): Promise<boolean> {
  const sql = getSql();
  const rows = (await sql`
    SELECT id, role
    FROM "StaffUser"
    WHERE id = ${staffId}
    LIMIT 1
  `) as Array<{ id: string; role: "ADMIN" | "SUPERUSER" }>;
  return rows[0]?.role === "SUPERUSER";
}

export function OPTIONS() {
  return edgeCorsOptions();
}

export async function GET(request: Request) {
  try {
    const staff = await requireStaff(request);
    const allowed = await assertSuperuser(staff.sub);
    if (!allowed) return forbidden("Only a superuser can list admin accounts");
    const sql = getSql();
    const rows = (await sql`
      SELECT id, email, role, "createdAt", "createdById"
      FROM "StaffUser"
      WHERE role = 'ADMIN'
      ORDER BY "createdAt" DESC
    `) as Array<StaffRow & { createdAt: string; createdById: string | null }>;
    return NextResponse.json(
      rows.map((r) => ({
        id: r.id,
        email: r.email,
        role: r.role === "SUPERUSER" ? "superuser" : "admin",
        createdAt: r.createdAt,
        createdById: r.createdById,
      })),
      { headers: EDGE_CORS_HEADERS },
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unauthorized";
    return unauthorized(message);
  }
}

export async function POST(request: Request) {
  try {
    const staff = await requireStaff(request);
    const allowed = await assertSuperuser(staff.sub);
    if (!allowed) return forbidden("Only a superuser can create admins");

    const body = (await request.json().catch(() => null)) as { email?: string; password?: string } | null;
    const email = String(body?.email ?? "").trim().toLowerCase();
    const password = String(body?.password ?? "");
    if (!email || !password || password.length < 8) {
      return NextResponse.json(
        { message: "Enter a valid email and a password of at least 8 characters.", statusCode: 400 },
        { status: 400, headers: EDGE_CORS_HEADERS },
      );
    }
    const sql = getSql();
    const existing = (await sql`
      SELECT id FROM "StaffUser" WHERE email = ${email} LIMIT 1
    `) as Array<{ id: string }>;
    if (existing[0]) {
      return NextResponse.json(
        { message: "A staff account with this email already exists", statusCode: 409 },
        { status: 409, headers: EDGE_CORS_HEADERS },
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const staffId = crypto.randomUUID();
    const created = (await sql`
      INSERT INTO "StaffUser"(id, email, "passwordHash", role, "createdAt", "createdById")
      VALUES (${staffId}, ${email}, ${passwordHash}, 'ADMIN', now(), ${staff.sub})
      RETURNING id, email, role, "createdAt"
    `) as Array<{ id: string; email: string; role: "ADMIN" | "SUPERUSER"; createdAt: string }>;
    const row = created[0];
    return NextResponse.json(
      {
        id: row.id,
        email: row.email,
        role: row.role === "SUPERUSER" ? "superuser" : "admin",
        createdAt: row.createdAt,
      },
      { headers: EDGE_CORS_HEADERS },
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unauthorized";
    return unauthorized(message);
  }
}
