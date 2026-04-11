/**
 * Next.js App Router — optional proxy to the Nest API (this workspace is Vite + Nest; add `next` to use this file).
 *
 * Canonical implementation: Nest `POST /auth/sync-member` (Prisma → Neon Postgres).
 *
 * Env (e.g. Vercel): `NEST_API_URL=https://your-api.example.com` and same `MEMBER_SYNC_SECRET` as backend.
 */
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request) {
  const base = process.env.NEST_API_URL?.replace(/\/$/, "");
  if (!base) {
    return NextResponse.json(
      {
        error: "NEST_API_URL is not configured — set it to your Nest API origin (same host as VITE_API_BASE_URL without /path).",
      },
      { status: 503 },
    );
  }
  try {
    const body = await request.json();
    const headers = { "Content-Type": "application/json" };
    const secret = process.env.MEMBER_SYNC_SECRET;
    if (secret) {
      headers["X-Member-Sync-Secret"] = secret;
    }
    const res = await fetch(`${base}/auth/sync-member`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error("sync-member proxy:", error);
    return NextResponse.json(
      {
        error: "Failed to sync member to database",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
