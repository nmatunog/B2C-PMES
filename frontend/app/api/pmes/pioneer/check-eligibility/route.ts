import { NextResponse } from "next/server";
import { getSql } from "@/lib/db";
import {
  composeLegacyFullName,
  normalizeFullNameForMatch,
  normalizeTinDigits,
} from "@/lib/pmes-edge/pioneer";
import { normalizeEmail } from "@/lib/pmes-edge/norm";

type Body = {
  firstName?: string;
  middleName?: string;
  lastName?: string;
  tinNo?: string;
};

export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ message: "Invalid JSON body" }, { status: 400 });
  }

  const rowLike = {
    firstName: body.firstName,
    middleName: body.middleName,
    lastName: body.lastName,
  };
  const fullNameInput = composeLegacyFullName(rowLike);
  if (!fullNameInput || fullNameInput.length < 2) {
    return NextResponse.json({ message: "firstName and lastName are required.", statusCode: 400 }, { status: 400 });
  }

  const normalizedName = normalizeFullNameForMatch(fullNameInput);
  const tinDigits = normalizeTinDigits(body.tinNo);
  if (!tinDigits.length) {
    return NextResponse.json(
      {
        message: "TIN is required after normalizing digits (use 000000000 if your roster row had no TIN).",
        statusCode: 400,
      },
      { status: 400 },
    );
  }

  const sql = getSql();
  const zeroTin = "000000000";

  type Row = { email: string; fullName: string };

  let rows: Row[];
  if (tinDigits === zeroTin) {
    const r = await sql`
      SELECT email, "fullName" FROM "Participant"
      WHERE "legacyPioneerImport" = true
        AND "fullProfileCompletedAt" IS NULL
        AND (
          "tinNo" = ${zeroTin}
          OR "tinNo" IS NULL
          OR "memberIdNo" = ${zeroTin}
          OR "memberIdNo" IS NULL
        )
    `;
    rows = r as Row[];
  } else {
    const r = await sql`
      SELECT email, "fullName" FROM "Participant"
      WHERE "legacyPioneerImport" = true
        AND "fullProfileCompletedAt" IS NULL
        AND (
          LOWER(TRIM(COALESCE("tinNo", ''))) = LOWER(${tinDigits})
          OR LOWER(TRIM(COALESCE("memberIdNo", ''))) = LOWER(${tinDigits})
        )
    `;
    rows = r as Row[];
  }

  const matched = rows.filter((c) => normalizeFullNameForMatch(c.fullName) === normalizedName);

  if (matched.length === 0) {
    return NextResponse.json({ eligible: false as const, reason: "not_found" as const });
  }
  if (matched.length > 1) {
    return NextResponse.json({ eligible: false as const, reason: "ambiguous" as const });
  }
  return NextResponse.json({ eligible: true as const, signInEmail: normalizeEmail(matched[0]!.email) });
}
