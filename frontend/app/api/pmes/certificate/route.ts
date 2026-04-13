import { NextResponse } from "next/server";
import { getSql } from "@/lib/db";
import { normalizeEmail } from "@/lib/pmes-edge/norm";

function toIso(d: unknown): string {
  if (d instanceof Date) return d.toISOString();
  if (typeof d === "string") return d;
  return String(d);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const emailRaw = String(searchParams.get("email") ?? "").trim();
  const dob = String(searchParams.get("dob") ?? "").trim();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailRaw) || emailRaw.length > 320) {
    return NextResponse.json({ message: "email query must be valid", statusCode: 400 }, { status: 400 });
  }
  if (!dob || dob.length > 32) {
    return NextResponse.json({ message: "dob query is required", statusCode: 400 }, { status: 400 });
  }

  const email = normalizeEmail(emailRaw);
  const sql = getSql();

  type P = {
    id: string;
    fullName: string;
    email: string;
    phone: string;
    dob: string;
    gender: string;
    legacyPioneerImport: boolean;
  };

  const parts = await sql`
    SELECT id, "fullName", email, phone, dob, gender, "legacyPioneerImport"
    FROM "Participant"
    WHERE email = ${email}
    LIMIT 1
  `;
  const participant = (parts as P[])[0];
  if (!participant) {
    return NextResponse.json({ message: "Record not found", statusCode: 404 }, { status: 404 });
  }

  const recs = await sql`
    SELECT id, score, passed, "timestamp"
    FROM "PmesRecord"
    WHERE "participantId" = ${participant.id}
    ORDER BY "timestamp" DESC
  `;
  const list = recs as { id: string; score: number; passed: boolean; timestamp: Date | string }[];
  if (list.length === 0) {
    return NextResponse.json({ message: "Record not found", statusCode: 404 }, { status: 404 });
  }

  const passed = list.find((r) => r.passed);
  const record = passed ?? list[0]!;

  return NextResponse.json({
    id: record.id,
    fullName: participant.fullName,
    email: participant.email,
    phone: participant.phone,
    dob: participant.dob,
    gender: participant.gender,
    score: record.score,
    passed: record.passed,
    timestamp: toIso(record.timestamp),
    legacyPioneerImport: Boolean(participant.legacyPioneerImport),
  });
}
