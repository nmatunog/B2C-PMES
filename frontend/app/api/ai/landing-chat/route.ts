import { NextResponse } from "next/server";
import { generateLandingChatReply, type LandingChatLanguage } from "@/lib/ai/landing-chat-gemini";

/** In-process cache (best-effort; Edge isolates may not persist long). */
const cache = new Map<string, { text: string }>();
const CACHE_MAX = 48;
const CACHE_VERSION = 1;

async function cacheKey(providerId: string, message: string, language: LandingChatLanguage): Promise<string> {
  const raw = `${CACHE_VERSION}|${providerId}|${language}|${message}`;
  const data = new TextEncoder().encode(raw);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

type Body = {
  message?: string;
  language?: string;
};

/**
 * Marketing FAQ chat — mirrors Nest `POST /ai/landing-chat`.
 * Env: `LANDING_CHAT_PROVIDER` = `gemini` | `noop` (default noop → 503).
 */
export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ message: "Invalid JSON body", statusCode: 400 }, { status: 400 });
  }

  const message = String(body.message ?? "").trim();
  if (!message.length || message.length > 1200) {
    return NextResponse.json({ message: "message is required (1–1200 characters)", statusCode: 400 }, { status: 400 });
  }

  const language: LandingChatLanguage = body.language === "ceb" ? "ceb" : "en";
  const providerId = (process.env.LANDING_CHAT_PROVIDER ?? "noop").trim().toLowerCase();

  if (providerId !== "gemini") {
    return NextResponse.json(
      {
        message:
          "Ka-uban AI text replies are disabled (set LANDING_CHAT_PROVIDER=gemini and GEMINI_API_KEY).",
        statusCode: 503,
      },
      { status: 503 },
    );
  }

  if (!process.env.GEMINI_API_KEY?.trim()) {
    return NextResponse.json(
      {
        message: "GEMINI_API_KEY is not configured",
        statusCode: 503,
      },
      { status: 503 },
    );
  }

  try {
    const key = await cacheKey("gemini", message, language);
    const hit = cache.get(key);
    if (hit) {
      return NextResponse.json({ text: hit.text });
    }

    const text = await generateLandingChatReply(message, language);
    if (cache.size >= CACHE_MAX) {
      const first = cache.keys().next().value;
      if (first) cache.delete(first);
    }
    cache.set(key, { text });
    return NextResponse.json({ text });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Landing chat failed";
    return NextResponse.json({ message: msg, statusCode: 500 }, { status: 500 });
  }
}
