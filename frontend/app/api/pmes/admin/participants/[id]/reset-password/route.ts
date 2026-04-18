import { NextResponse } from "next/server";
import { getSql } from "@/lib/db";
import { EDGE_CORS_HEADERS, edgeCorsOptions } from "@/lib/edge-cors";
import { identityToolkitPatchUser } from "@/lib/firebase-admin-rest";
import { requireStaff, unauthorized } from "@/lib/staff-edge-auth";

export function OPTIONS() {
  return edgeCorsOptions();
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requireStaff(request);
    const { id } = await context.params;
    const participantId = String(id ?? "").trim();
    if (!participantId) {
      return NextResponse.json({ message: "participant id is required", statusCode: 400 }, { status: 400, headers: EDGE_CORS_HEADERS });
    }

    let body: { newPassword?: unknown };
    try {
      body = (await request.json()) as { newPassword?: unknown };
    } catch {
      return NextResponse.json({ message: "Invalid JSON body", statusCode: 400 }, { status: 400, headers: EDGE_CORS_HEADERS });
    }

    const pwd = String(body.newPassword ?? "");
    if (pwd.length < 6 || pwd.length > 128) {
      return NextResponse.json(
        { message: "newPassword must be 6–128 characters", statusCode: 400 },
        { status: 400, headers: EDGE_CORS_HEADERS },
      );
    }

    const sql = getSql();
    const rows = (await sql`
      SELECT "firebaseUid" FROM "Participant" WHERE id = ${participantId} LIMIT 1
    `) as Array<{ firebaseUid: string | null }>;
    const uid = rows[0]?.firebaseUid?.trim();
    if (!uid) {
      return NextResponse.json(
        {
          message:
            "This member has no Firebase account linked yet. They must sign in once (or sync) before a password can be set.",
          statusCode: 400,
        },
        { status: 400, headers: EDGE_CORS_HEADERS },
      );
    }

    const projectId = process.env.FIREBASE_PROJECT_ID?.trim();
    if (!projectId) {
      return NextResponse.json(
        { message: "FIREBASE_PROJECT_ID is not configured on the server.", statusCode: 503 },
        { status: 503, headers: EDGE_CORS_HEADERS },
      );
    }

    try {
      await identityToolkitPatchUser(projectId, uid, { password: pwd });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Password reset failed";
      return NextResponse.json({ message: msg, statusCode: 502 }, { status: 502, headers: EDGE_CORS_HEADERS });
    }

    return NextResponse.json(
      { success: true, message: "Password updated in Firebase Auth." },
      { headers: EDGE_CORS_HEADERS },
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unauthorized";
    return unauthorized(message);
  }
}
