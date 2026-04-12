import { NextResponse } from "next/server";
import { getSql } from "@/lib/db";
import { normalizeEmail } from "@/lib/pmes-edge/norm";

export const runtime = "edge";

type Body = {
  fullName?: string;
  email?: string;
  phone?: string;
  dob?: string;
  gender?: string;
  score?: number;
  passed?: boolean;
};

function validate(d: Body) {
  const fullName = String(d.fullName ?? "").trim();
  const emailRaw = String(d.email ?? "").trim();
  const phone = String(d.phone ?? "").trim();
  const dob = String(d.dob ?? "").trim();
  const gender = String(d.gender ?? "").trim();
  const score = d.score;
  const passed = d.passed;

  if (!fullName || fullName.length > 500) {
    throw new Error("fullName is required (max 500 characters)");
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailRaw) || emailRaw.length > 320) {
    throw new Error("email must be valid");
  }
  if (!phone || phone.length > 64) throw new Error("phone is required (max 64 characters)");
  if (!dob || dob.length > 32) throw new Error("dob is required (max 32 characters)");
  if (!gender || gender.length > 32) throw new Error("gender is required (max 32 characters)");
  if (typeof score !== "number" || !Number.isInteger(score) || score < 0 || score > 10) {
    throw new Error("score must be an integer 0–10");
  }
  if (typeof passed !== "boolean") throw new Error("passed must be a boolean");

  return {
    fullName,
    email: normalizeEmail(emailRaw),
    phone,
    dob,
    gender,
    score,
    passed,
  };
}

function toIso(d: unknown): string {
  if (d instanceof Date) return d.toISOString();
  if (typeof d === "string") return d;
  return String(d);
}

export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ message: "Invalid JSON body" }, { status: 400 });
  }

  let dto: ReturnType<typeof validate>;
  try {
    dto = validate(body);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Bad request";
    return NextResponse.json({ message: msg, statusCode: 400 }, { status: 400 });
  }

  const sql = getSql();

  type Row = {
    recordId: string;
    score: number;
    passed: boolean;
    timestamp: Date | string;
    participantId: string;
    fullName: string;
    email: string;
    phone: string;
    dob: string;
    gender: string;
    legacyPioneerImport: boolean;
  };

  try {
    const rows = await sql`
      WITH upsert AS (
        INSERT INTO "Participant" (id, "fullName", email, phone, dob, gender)
        VALUES (gen_random_uuid(), ${dto.fullName}, ${dto.email}, ${dto.phone}, ${dto.dob}, ${dto.gender})
        ON CONFLICT (email) DO UPDATE SET
          "fullName" = EXCLUDED."fullName",
          phone = EXCLUDED.phone,
          dob = EXCLUDED.dob,
          gender = EXCLUDED.gender
        RETURNING id, "fullName", email, phone, dob, gender, "legacyPioneerImport"
      ),
      ins AS (
        INSERT INTO "PmesRecord" (id, score, passed, "participantId")
        SELECT gen_random_uuid(), ${dto.score}, ${dto.passed}, upsert.id FROM upsert
        RETURNING id, score, passed, "timestamp", "participantId"
      )
      SELECT
        ins.id AS "recordId",
        ins.score,
        ins.passed,
        ins."timestamp",
        upsert.id AS "participantId",
        upsert."fullName",
        upsert.email,
        upsert.phone,
        upsert.dob,
        upsert.gender,
        upsert."legacyPioneerImport"
      FROM ins
      JOIN upsert ON ins."participantId" = upsert.id
    `;
    const row = (rows as Row[])[0];
    if (!row) {
      return NextResponse.json({ message: "PMES submit failed" }, { status: 500 });
    }
    return NextResponse.json({
      id: row.recordId,
      fullName: row.fullName,
      email: row.email,
      phone: row.phone,
      dob: row.dob,
      gender: row.gender,
      score: row.score,
      passed: row.passed,
      timestamp: toIso(row.timestamp),
      legacyPioneerImport: Boolean(row.legacyPioneerImport),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "PMES submit failed";
    return NextResponse.json({ message: msg, statusCode: 500 }, { status: 500 });
  }
}
