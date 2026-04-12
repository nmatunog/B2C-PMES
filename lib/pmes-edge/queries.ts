import { getSql } from "@/lib/db";

type Sql = ReturnType<typeof getSql>;

export type ParticipantCore = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  dob: string;
  gender: string;
  createdAt: string | Date;
  legacyPioneerImport: boolean;
  memberIdNo: string | null;
  tinNo: string | null;
  initialFeesPaidAt: string | Date | null;
  boardApprovedAt: string | Date | null;
  fullProfileCompletedAt: string | Date | null;
  callsign: string | null;
  lastNameKey: string | null;
  lastNameSeq: number | null;
};

export type PmesRecordRow = {
  id: string;
  score: number;
  passed: boolean;
  timestamp: string | Date;
};

export type LoiSubmissionRow = { id: string } | null;

export type ParticipantWithRels = ParticipantCore & {
  pmesRecords: PmesRecordRow[];
  loiSubmission: LoiSubmissionRow;
};

function toDate(d: string | Date): Date {
  return d instanceof Date ? d : new Date(d);
}

export async function loadParticipantWithRelsByEmail(
  sql: Sql,
  email: string,
): Promise<ParticipantWithRels | null> {
  const rows = await sql`
    SELECT
      id, "fullName", email, phone, dob, gender, "createdAt",
      "legacyPioneerImport", "memberIdNo", "tinNo",
      "initialFeesPaidAt", "boardApprovedAt", "fullProfileCompletedAt",
      callsign, "lastNameKey", "lastNameSeq"
    FROM "Participant"
    WHERE email = ${email}
    LIMIT 1
  `;
  const p = (rows as ParticipantCore[])[0];
  if (!p) return null;
  return loadRelationsForParticipant(sql, p);
}

export async function loadParticipantWithRelsById(
  sql: Sql,
  id: string,
): Promise<ParticipantWithRels | null> {
  const rows = await sql`
    SELECT
      id, "fullName", email, phone, dob, gender, "createdAt",
      "legacyPioneerImport", "memberIdNo", "tinNo",
      "initialFeesPaidAt", "boardApprovedAt", "fullProfileCompletedAt",
      callsign, "lastNameKey", "lastNameSeq"
    FROM "Participant"
    WHERE id = ${id}
    LIMIT 1
  `;
  const p = (rows as ParticipantCore[])[0];
  if (!p) return null;
  return loadRelationsForParticipant(sql, p);
}

async function loadRelationsForParticipant(
  sql: Sql,
  p: ParticipantCore,
): Promise<ParticipantWithRels> {
  const pr = await sql`
    SELECT id, score, passed, "timestamp"
    FROM "PmesRecord"
    WHERE "participantId" = ${p.id}
    ORDER BY "timestamp" DESC
  `;
  const loiRows = await sql`
    SELECT id FROM "LoiSubmission" WHERE "participantId" = ${p.id} LIMIT 1
  `;
  const loi = (loiRows as { id: string }[])[0] ?? null;
  return {
    ...p,
    createdAt: toDate(p.createdAt as string | Date),
    initialFeesPaidAt: p.initialFeesPaidAt ? toDate(p.initialFeesPaidAt as string | Date) : null,
    boardApprovedAt: p.boardApprovedAt ? toDate(p.boardApprovedAt as string | Date) : null,
    fullProfileCompletedAt: p.fullProfileCompletedAt
      ? toDate(p.fullProfileCompletedAt as string | Date)
      : null,
    pmesRecords: (pr as PmesRecordRow[]).map((r) => ({
      ...r,
      timestamp: toDate(r.timestamp as string | Date),
    })),
    loiSubmission: loi,
  };
}
