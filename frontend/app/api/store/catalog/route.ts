import { NextResponse } from "next/server";
import { EDGE_CORS_HEADERS, edgeCorsOptions } from "@/lib/edge-cors";
import { getStoreCatalogResponse } from "@/lib/store-checkout.edge";

export function OPTIONS() {
  return edgeCorsOptions();
}

export async function GET() {
  return NextResponse.json(getStoreCatalogResponse(), { headers: EDGE_CORS_HEADERS });
}
