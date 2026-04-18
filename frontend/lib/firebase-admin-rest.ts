import { importPKCS8, SignJWT } from "jose";

const TOKEN_URL = "https://oauth2.googleapis.com/token";

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

async function getAccessTokenFromServiceAccount(): Promise<string> {
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
  let privateKey = process.env.FIREBASE_PRIVATE_KEY?.trim();
  if (!clientEmail || !privateKey) {
    throw new Error("FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY are required for admin member actions");
  }
  privateKey = privateKey.replace(/\\n/g, "\n");
  const key = await importPKCS8(privateKey, "RS256");
  const jwt = await new SignJWT({
    scope: "https://www.googleapis.com/auth/cloud-platform",
  })
    .setProtectedHeader({ alg: "RS256" })
    .setIssuer(clientEmail)
    .setSubject(clientEmail)
    .setAudience(TOKEN_URL)
    .setIssuedAt()
    .setExpirationTime("5m")
    .sign(key);

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  const json = (await res.json()) as { access_token?: string; error_description?: string; error?: string };
  if (!res.ok || !json.access_token) {
    throw new Error(json.error_description || json.error || `OAuth failed (${res.status})`);
  }
  return json.access_token;
}

/** PATCH Identity Toolkit user (email and/or password). */
export async function identityToolkitPatchUser(
  projectId: string,
  localId: string,
  fields: { email?: string; password?: string },
): Promise<void> {
  const keys = Object.keys(fields).filter((k) => fields[k as keyof typeof fields] !== undefined);
  if (keys.length === 0) return;

  const token = await getAccessTokenFromServiceAccount();
  const url = new URL(
    `https://identitytoolkit.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/accounts/${encodeURIComponent(localId)}`,
  );
  url.searchParams.set("updateMask", keys.join(","));

  const body: Record<string, string> = {};
  if (fields.email !== undefined) body.email = normalizeEmail(fields.email);
  if (fields.password !== undefined) body.password = fields.password;

  const res = await fetch(url.toString(), {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Identity Toolkit ${res.status}: ${text}`);
  }
}

export function normalizeMemberEmail(email: string): string {
  return normalizeEmail(email);
}
