import { NextResponse } from "next/server";
import { getSql } from "@/lib/db";

export const runtime = "edge";

export async function GET() {
  try {
    const sql = getSql();
    await sql`SELECT 1 AS ok`;
    return NextResponse.json({ status: "ok", database: "connected" });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Database check failed";
    return NextResponse.json({ status: "error", database: "disconnected", message: msg }, { status: 503 });
  }
}
