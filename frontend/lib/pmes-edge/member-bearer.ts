import { verifyFirebaseIdToken } from "@/lib/firebase-edge";

function extractBearer(authorization: string | null): string | null {
  const v = String(authorization ?? "").trim();
  if (!v.toLowerCase().startsWith("bearer ")) return null;
  const t = v.slice(7).trim();
  return t || null;
}

/**
 * Member routes (callsign, etc.): ID token email must match `emailRaw`.
 * When `FIREBASE_PROJECT_ID` is unset, skips verification (local dev — same idea as Nest when Admin is not configured).
 */
export async function assertMemberEmailMatchesFirebaseToken(
  authorization: string | null,
  emailRaw: string,
): Promise<void> {
  const normalized = emailRaw.trim().toLowerCase();
  const projectId = String(process.env.FIREBASE_PROJECT_ID ?? "").trim();

  if (!projectId) {
    return;
  }

  const bearer = extractBearer(authorization);
  if (!bearer) {
    throw new Error("UNAUTHORIZED: Authorization Bearer token required");
  }

  try {
    const decoded = await verifyFirebaseIdToken(bearer, projectId);
    const tokenEmail = typeof decoded.email === "string" ? decoded.email.trim().toLowerCase() : "";
    if (!tokenEmail || tokenEmail !== normalized) {
      throw new Error("UNAUTHORIZED: ID token email does not match member email");
    }
  } catch (e) {
    if (e instanceof Error && e.message.startsWith("UNAUTHORIZED:")) throw e;
    throw new Error("UNAUTHORIZED: Invalid Firebase ID token");
  }
}
