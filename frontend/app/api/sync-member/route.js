import { NextResponse } from "next/server";
import { sql } from "../../../lib/db.js";
import { verifyFirebaseIdToken } from "../../../lib/firebase-edge";

export const runtime = "edge";

/**
 * Sync Firebase-authenticated users into Postgres.
 * Per `backend/prisma/schema.prisma` / CURSOR_DOCS.md, member rows are stored in `"Participant"`
 * (there is no separate `members` table).
 */

function extractBearer(authorization) {
  const v = String(authorization ?? "").trim();
  if (!v.toLowerCase().startsWith("bearer ")) return null;
  const t = v.slice(7).trim();
  return t || null;
}

function isNestStyleFirebaseAdminConfigured() {
  const projectId = String(process.env.FIREBASE_PROJECT_ID ?? "").trim();
  const clientEmail = String(process.env.FIREBASE_CLIENT_EMAIL ?? "").trim();
  let privateKey = String(process.env.FIREBASE_PRIVATE_KEY ?? "").trim();
  if (privateKey) privateKey = privateKey.replace(/\\n/g, "\n");
  return Boolean(projectId && clientEmail && privateKey);
}

async function assertMemberSyncAuthorized(syncSecretHeader, authorization, dto) {
  const expected = String(process.env.MEMBER_SYNC_SECRET ?? "").trim();
  const hasSecret = Boolean(expected);
  const hasAdmin = isNestStyleFirebaseAdminConfigured();

  if (hasSecret && String(syncSecretHeader ?? "").trim() === expected) {
    return;
  }

  if (!hasSecret && !hasAdmin) {
    return;
  }

  const bearer = extractBearer(authorization);
  if (bearer) {
    const projectId = String(process.env.FIREBASE_PROJECT_ID ?? "").trim();
    if (!projectId) {
      throw new Error("UNAUTHORIZED: Firebase ID token verification requires FIREBASE_PROJECT_ID");
    }
    try {
      const decoded = await verifyFirebaseIdToken(bearer, projectId);
      if (decoded.sub !== dto.uid) {
        throw new Error("UNAUTHORIZED: ID token does not match uid");
      }
      const tokenEmail = typeof decoded.email === "string" ? decoded.email.trim().toLowerCase() : "";
      const bodyEmail = dto.email.trim().toLowerCase();
      if (tokenEmail && tokenEmail !== bodyEmail) {
        throw new Error("UNAUTHORIZED: ID token email does not match body");
      }
      return;
    } catch (e) {
      if (e instanceof Error && e.message.startsWith("UNAUTHORIZED:")) throw e;
      throw new Error("UNAUTHORIZED: Invalid Firebase ID token");
    }
  }

  throw new Error("UNAUTHORIZED: Invalid or missing member sync authorization");
}

function validateBody(raw) {
  const uid = String(raw.uid ?? "").trim();
  const email = String(raw.email ?? "").trim();
  if (uid.length < 10 || uid.length > 128) {
    throw new Error("BAD_REQUEST: uid must be between 10 and 128 characters");
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 320) {
    throw new Error("BAD_REQUEST: email must be a valid address");
  }
  const fn = raw.fullName != null ? String(raw.fullName).trim() : "";
  if (fn.length > 500) {
    throw new Error("BAD_REQUEST: fullName too long");
  }
  return { uid, email, ...(fn ? { fullName: fn } : {}) };
}

function toIso(d) {
  if (d instanceof Date) return d.toISOString();
  if (typeof d === "string") return d;
  return String(d);
}

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  let dto;
  try {
    dto = validateBody(body);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Bad request";
    return NextResponse.json({ error: msg.replace(/^BAD_REQUEST:\s*/, "") }, { status: 400 });
  }

  const syncSecret = request.headers.get("x-member-sync-secret");
  const authorization = request.headers.get("authorization");

  try {
    await assertMemberSyncAuthorized(syncSecret, authorization, dto);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unauthorized";
    if (msg.startsWith("UNAUTHORIZED:")) {
      return NextResponse.json(
        { error: msg.replace(/^UNAUTHORIZED:\s*/, ""), statusCode: 401 },
        { status: 401 },
      );
    }
    return NextResponse.json({ error: msg }, { status: 401 });
  }

  const normalizedEmail = dto.email.trim().toLowerCase();
  const name = (dto.fullName?.trim() || normalizedEmail.split("@")[0] || "Member").slice(0, 500);

  const existingByUid = await sql`
    SELECT id, "firebaseUid", email, "fullName", "createdAt"
    FROM "Participant"
    WHERE "firebaseUid" = ${dto.uid}
    LIMIT 1
  `;
  const byUid = existingByUid[0];
  if (byUid) {
    const updated = await sql`
      UPDATE "Participant"
      SET "fullName" = ${name}, email = ${normalizedEmail}
      WHERE id = ${byUid.id}
      RETURNING id, "firebaseUid", email, "fullName", "createdAt"
    `;
    const row = updated[0];
    return NextResponse.json({
      success: true,
      message: "Member successfully synced to PostgreSQL",
      data: {
        id: row.id,
        firebaseUid: row.firebaseUid,
        email: row.email,
        fullName: row.fullName,
        createdAt: toIso(row.createdAt),
      },
    });
  }

  const existingByEmail = await sql`
    SELECT id, "firebaseUid", email, "fullName", "createdAt"
    FROM "Participant"
    WHERE email = ${normalizedEmail}
    LIMIT 1
  `;
  const byEmail = existingByEmail[0];
  if (byEmail) {
    if (byEmail.firebaseUid && byEmail.firebaseUid !== dto.uid) {
      return NextResponse.json(
        { error: "This email is already linked to another Firebase account.", statusCode: 409 },
        { status: 409 },
      );
    }
    const keepName = String(byEmail.fullName ?? "").trim() ? byEmail.fullName : name;
    const updated = await sql`
      UPDATE "Participant"
      SET "firebaseUid" = ${dto.uid}, "fullName" = ${keepName}
      WHERE id = ${byEmail.id}
      RETURNING id, "firebaseUid", email, "fullName", "createdAt"
    `;
    const row = updated[0];
    return NextResponse.json({
      success: true,
      message: "Firebase uid linked to existing participant",
      data: {
        id: row.id,
        firebaseUid: row.firebaseUid,
        email: row.email,
        fullName: row.fullName,
        createdAt: toIso(row.createdAt),
      },
    });
  }

  const id = crypto.randomUUID();
  const created = await sql`
    INSERT INTO "Participant" (id, "firebaseUid", email, "fullName", phone, dob, gender)
    VALUES (${id}, ${dto.uid}, ${normalizedEmail}, ${name}, 'pending', 'pending', 'unknown')
    RETURNING id, "firebaseUid", email, "fullName", "createdAt"
  `;
  const row = created[0];
  return NextResponse.json({
    success: true,
    message: "Member successfully synced to PostgreSQL",
    data: {
      id: row.id,
      firebaseUid: row.firebaseUid,
      email: row.email,
      fullName: row.fullName,
      createdAt: toIso(row.createdAt),
    },
  });
}
