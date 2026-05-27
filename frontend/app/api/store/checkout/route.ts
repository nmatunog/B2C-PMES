import { NextResponse } from "next/server";
import { getSql } from "@/lib/db";
import { EDGE_CORS_HEADERS, edgeCorsOptions } from "@/lib/edge-cors";
import { assertMemberEmailMatchesFirebaseToken } from "@/lib/pmes-edge/member-bearer";
import { verifyFirebaseIdToken } from "@/lib/firebase-edge";
import { memberStoreCheckout } from "@/lib/store-checkout.edge";

export function OPTIONS() {
  return edgeCorsOptions();
}

type Body = {
  email?: string;
  items?: Array<{ sku?: string; quantity?: number }>;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as Body | null;
    const email = String(body?.email ?? "").trim();
    if (!email) {
      return NextResponse.json(
        { message: "email is required", statusCode: 400 },
        { status: 400, headers: EDGE_CORS_HEADERS },
      );
    }

    await assertMemberEmailMatchesFirebaseToken(request.headers.get("authorization"), email);

    let firebaseUid: string | null = null;
    const projectId = String(process.env.FIREBASE_PROJECT_ID ?? "").trim();
    const bearer = String(request.headers.get("authorization") ?? "")
      .replace(/^Bearer\s+/i, "")
      .trim();
    if (projectId && bearer) {
      try {
        const decoded = await verifyFirebaseIdToken(bearer, projectId);
        firebaseUid = typeof decoded.sub === "string" ? decoded.sub : null;
      } catch {
        /* assertMemberEmailMatchesFirebaseToken already validated */
      }
    }

    const items = Array.isArray(body?.items) ? body!.items! : [];
    const normalized = items
      .map((item) => ({
        sku: String(item.sku ?? "").trim(),
        quantity: Number(item.quantity),
      }))
      .filter((item) => item.sku && Number.isFinite(item.quantity) && item.quantity >= 1);

    if (normalized.length === 0) {
      return NextResponse.json(
        { message: "items must include at least one sku with quantity >= 1", statusCode: 400 },
        { status: 400, headers: EDGE_CORS_HEADERS },
      );
    }

    const sql = getSql();
    const result = await memberStoreCheckout(sql, email, normalized, firebaseUid);
    return NextResponse.json(result, { status: 201, headers: EDGE_CORS_HEADERS });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Checkout failed";
    if (msg.startsWith("NOT_FOUND:")) {
      return NextResponse.json(
        { message: msg.replace(/^NOT_FOUND:\s*/, ""), statusCode: 404 },
        { status: 404, headers: EDGE_CORS_HEADERS },
      );
    }
    if (msg.startsWith("UNAUTHORIZED:")) {
      return NextResponse.json(
        { message: msg.replace(/^UNAUTHORIZED:\s*/, ""), statusCode: 401 },
        { status: 401, headers: EDGE_CORS_HEADERS },
      );
    }
    return NextResponse.json({ message: msg, statusCode: 400 }, { status: 400, headers: EDGE_CORS_HEADERS });
  }
}
