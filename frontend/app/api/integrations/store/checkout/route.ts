import { NextResponse } from "next/server";
import { getSql } from "@/lib/db";
import { EDGE_CORS_HEADERS, edgeCorsOptions } from "@/lib/edge-cors";
import { webhookStoreCheckout, type StoreWebhookBody } from "@/lib/store-checkout.edge";

export function OPTIONS() {
  return edgeCorsOptions();
}

function extractWebhookSecret(request: Request): string {
  const header =
    request.headers.get("x-store-webhook-secret") ??
    String(request.headers.get("authorization") ?? "")
      .replace(/^Bearer\s+/i, "")
      .trim();
  return String(header ?? "").trim();
}

export async function POST(request: Request) {
  const expected = String(process.env.STORE_CHECKOUT_WEBHOOK_SECRET ?? "").trim();
  if (!expected) {
    return NextResponse.json(
      { message: "Store webhook is not configured", statusCode: 503 },
      { status: 503, headers: EDGE_CORS_HEADERS },
    );
  }
  const provided = extractWebhookSecret(request);
  if (!provided || provided !== expected) {
    return NextResponse.json(
      { message: "Invalid store webhook secret", statusCode: 401 },
      { status: 401, headers: EDGE_CORS_HEADERS },
    );
  }

  try {
    const body = (await request.json().catch(() => null)) as StoreWebhookBody | null;
    if (!body?.externalId?.trim() || !body.vendorCode?.trim()) {
      return NextResponse.json(
        { message: "externalId and vendorCode are required", statusCode: 400 },
        { status: 400, headers: EDGE_CORS_HEADERS },
      );
    }

    const sql = getSql();
    const result = await webhookStoreCheckout(sql, body);
    const status = result.status === "created" ? 201 : 200;
    return NextResponse.json(result, { status, headers: EDGE_CORS_HEADERS });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Webhook checkout failed";
    return NextResponse.json({ message: msg, statusCode: 400 }, { status: 400, headers: EDGE_CORS_HEADERS });
  }
}
