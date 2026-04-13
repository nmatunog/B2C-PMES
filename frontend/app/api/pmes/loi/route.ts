import { NextResponse } from "next/server";
import { getSql } from "@/lib/db";
import { normalizeEmail } from "@/lib/pmes-edge/norm";

type Body = {
  email?: string;
  address?: string;
  occupation?: string;
  employer?: string;
  initialCapital?: number;
};

function validate(d: Body) {
  const emailRaw = String(d.email ?? "").trim();
  const address = String(d.address ?? "").trim();
  const occupation = String(d.occupation ?? "").trim();
  const employer = String(d.employer ?? "").trim();
  const cap = d.initialCapital;

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailRaw) || emailRaw.length > 320) {
    throw new Error("email must be valid");
  }
  if (!address || address.length > 2000) throw new Error("address is required (max 2000 characters)");
  if (!occupation || occupation.length > 500) throw new Error("occupation is required (max 500 characters)");
  if (employer.length > 500) throw new Error("employer must be at most 500 characters");
  if (typeof cap !== "number" || !Number.isFinite(cap) || cap < 0) {
    throw new Error("initialCapital must be a non-negative number");
  }

  return {
    email: normalizeEmail(emailRaw),
    address,
    occupation,
    employer,
    initialCapital: cap,
  };
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

  const found = await sql`
    SELECT id FROM "Participant" WHERE email = ${dto.email} LIMIT 1
  `;
  const participantId = (found as { id: string }[])[0]?.id;
  if (!participantId) {
    return NextResponse.json(
      { message: "Participant not found for this email", statusCode: 404 },
      { status: 404 },
    );
  }

  try {
    await sql`
      INSERT INTO "LoiSubmission" (id, address, occupation, employer, "initialCapital", "participantId")
      VALUES (gen_random_uuid(), ${dto.address}, ${dto.occupation}, ${dto.employer}, ${dto.initialCapital}, ${participantId})
      ON CONFLICT ("participantId") DO UPDATE SET
        address = EXCLUDED.address,
        occupation = EXCLUDED.occupation,
        employer = EXCLUDED.employer,
        "initialCapital" = EXCLUDED."initialCapital"
    `;
    return NextResponse.json({ success: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "LOI submit failed";
    return NextResponse.json({ message: msg, statusCode: 500 }, { status: 500 });
  }
}
