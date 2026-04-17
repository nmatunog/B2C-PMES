import { NextResponse } from "next/server";
import { EDGE_CORS_HEADERS, edgeCorsOptions } from "@/lib/edge-cors";

type Body = {
  text?: string;
  voice?: string;
};

type TtsResponse = {
  audioBase64: string;
  encoding: "pcm16" | "mp3";
};

type GeminiContentPart = {
  inlineData?: { data?: string };
  inline_data?: { data?: string };
};

const OPENAI_VOICES = new Set(["alloy", "echo", "fable", "onyx", "nova", "shimmer"]);
const XAI_VOICES = new Set(["eve", "ara", "leo", "rex", "sal"]);

function jsonError(message: string, status: number) {
  return NextResponse.json({ message, statusCode: status }, { status, headers: EDGE_CORS_HEADERS });
}

function extractGeminiAudioBase64(result: unknown): string | null {
  const candidates = (result as { candidates?: { content?: { parts?: GeminiContentPart[] } }[] })?.candidates;
  const parts = candidates?.[0]?.content?.parts ?? [];
  for (const part of parts) {
    const audio = part?.inlineData?.data ?? part?.inline_data?.data;
    if (audio) return audio;
  }
  return null;
}

async function synthesizeGemini(text: string, voice: string): Promise<TtsResponse> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured");

  const configured = process.env.GEMINI_TTS_MODEL?.trim();
  const modelCandidates = configured
    ? [configured]
    : ["gemini-2.5-flash-preview-tts", "gemini-2.5-flash-lite-preview-tts"];

  const body = {
    contents: [{ parts: [{ text }] }],
    generationConfig: {
      responseModalities: ["AUDIO"],
      speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } },
    },
  };

  let lastError = "Gemini TTS failed";
  for (let i = 0; i < modelCandidates.length; i += 1) {
    const model = modelCandidates[i];
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
    );
    if (!response.ok) {
      const errText = await response.text();
      lastError = `Gemini TTS failed (${model}): ${response.status} ${errText}`;
      const canTryNext =
        !configured &&
        i < modelCandidates.length - 1 &&
        (response.status === 400 ||
          response.status === 403 ||
          response.status === 404 ||
          response.status === 429 ||
          response.status >= 500);
      if (canTryNext) continue;
      throw new Error(lastError);
    }
    const json = await response.json();
    const audioBase64 = extractGeminiAudioBase64(json);
    if (audioBase64) return { audioBase64, encoding: "pcm16" };
    lastError = "Gemini returned no TTS audio in response";
  }
  throw new Error(lastError);
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

async function synthesizeOpenai(text: string, voice: string): Promise<TtsResponse> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured");

  const model = process.env.OPENAI_TTS_MODEL?.trim() || "tts-1";
  const mapped = OPENAI_VOICES.has(voice.toLowerCase()) ? voice.toLowerCase() : "nova";
  const response = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      input: text,
      voice: mapped,
      response_format: "mp3",
    }),
  });
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenAI TTS failed: ${response.status} ${errText}`);
  }
  const audioBase64 = arrayBufferToBase64(await response.arrayBuffer());
  return { audioBase64, encoding: "mp3" };
}

async function synthesizeGrok(text: string, voice: string): Promise<TtsResponse> {
  const apiKey = process.env.XAI_API_KEY?.trim();
  if (!apiKey) throw new Error("XAI_API_KEY is not configured");

  const voiceId = XAI_VOICES.has(voice.toLowerCase()) ? voice.toLowerCase() : "ara";
  const response = await fetch("https://api.x.ai/v1/tts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text,
      voice_id: voiceId,
      language: "en",
      output_format: {
        codec: "mp3",
        sample_rate: 24000,
        bit_rate: 128000,
      },
    }),
  });
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`xAI Grok TTS failed: ${response.status} ${errText}`);
  }
  const audioBase64 = arrayBufferToBase64(await response.arrayBuffer());
  return { audioBase64, encoding: "mp3" };
}

export async function OPTIONS() {
  return edgeCorsOptions();
}

/** Worker-side TTS route so Vite production (`VITE_API_BASE_URL=.../api`) can synthesize speech. */
export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  const text = String(body.text ?? "").trim();
  const voice = String(body.voice ?? "Aoede").trim() || "Aoede";
  if (!text || text.length > 12000) {
    return jsonError("text is required (1-12000 characters)", 400);
  }

  const providerId = (process.env.AI_PROVIDER ?? "noop").trim().toLowerCase();
  if (providerId === "noop") {
    return jsonError(
      "TTS is disabled (AI_PROVIDER=noop). Set AI_PROVIDER to gemini, openai, or grok.",
      503,
    );
  }

  try {
    let output: TtsResponse;
    if (providerId === "gemini") {
      output = await synthesizeGemini(text, voice);
    } else if (providerId === "openai") {
      output = await synthesizeOpenai(text, voice);
    } else if (providerId === "grok") {
      output = await synthesizeGrok(text, voice);
    } else {
      return jsonError(`Unknown AI_PROVIDER="${providerId}". Use: noop, gemini, openai, grok.`, 400);
    }
    return NextResponse.json(output, { headers: EDGE_CORS_HEADERS });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "TTS failed";
    return jsonError(msg, 500);
  }
}
