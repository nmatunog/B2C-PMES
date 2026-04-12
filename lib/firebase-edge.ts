import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";

const JWKS = createRemoteJWKSet(
  new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"),
);

/**
 * Verify a Firebase Auth ID token using public JWKS (Edge-compatible — no firebase-admin).
 */
export async function verifyFirebaseIdToken(idToken: string, firebaseProjectId: string): Promise<JWTPayload> {
  const projectId = firebaseProjectId.trim();
  if (!projectId) {
    throw new Error("FIREBASE_PROJECT_ID is required");
  }
  const { payload } = await jwtVerify(idToken, JWKS, {
    issuer: `https://securetoken.google.com/${projectId}`,
    audience: projectId,
  });
  return payload;
}
