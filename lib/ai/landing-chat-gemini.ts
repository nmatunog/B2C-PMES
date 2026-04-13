/**
 * Ka-uban landing FAQ — same prompts as `backend/src/ai/providers/gemini-landing-chat.provider.ts`.
 */

export const LANDING_CHAT_SYSTEM_EN = `You are Ka-uban, the helpful assistant for B2C Consumers Cooperative — a digital-first consumers cooperative in the Visayas, Philippines. You answer questions about membership, PMES (pre-membership education), cooperative basics, patronage, and how to join.

Rules:
- Be accurate and concise (at most 4 short paragraphs). Plain language.
- Do not invent fees, share amounts, deadlines, or legal obligations. When specifics matter, say members should confirm with official B2C notices, the registered bylaws, or PMES materials.
- Do not give legal, tax, or investment advice; suggest qualified professionals or official documents.
- Never ask for passwords, OTPs, PINs, or full account numbers.
- If the question is off-topic, politely say you focus on B2C / cooperative membership and point to official channels.
- Respond in English.`;

export const LANDING_CHAT_SYSTEM_CEB = `Ikaw si Ka-uban, tabang sa B2C Consumers Cooperative — usa ka digital-first consumers cooperative sa Visayas, Pilipinas. Tubaga ang pangutana bahin sa membership, PMES, kooperatiba, patronage, ug pag-apil.

Mga lagda:
- Tinuod ug mubo ra (dili moubos sa upat ka parapo). Sayon sabton.
- Ayaw paghimo og eksakto nga bayad, petsa, o legal nga obligasyon. Kung importante ang detalye, ingna nga kumpirmahon sa opisyal nga B2C, bylaws, o PMES.
- Ayaw hatagi og legal/tax/investment advice.
- Ayaw pangayoa og password, OTP, o numero sa account.
- Kung dili hilisgutan, ingna nga nag-focus ka sa B2C ug kooperatiba.
- Tubag sa Cebuano.`;

export type LandingChatLanguage = "en" | "ceb";

export function extractGeminiText(result: unknown): string {
  const candidates = (result as { candidates?: { content?: { parts?: { text?: string }[] } }[] })?.candidates;
  const parts = candidates?.[0]?.content?.parts ?? [];
  const chunks = parts.map((p) => p?.text).filter((t): t is string => typeof t === "string" && t.length > 0);
  return chunks.join("\n").trim();
}

export async function generateLandingChatReply(
  message: string,
  language: LandingChatLanguage,
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  const model = process.env.GEMINI_CHAT_MODEL?.trim() || "gemini-2.0-flash";
  const systemInstruction = language === "ceb" ? LANDING_CHAT_SYSTEM_CEB : LANDING_CHAT_SYSTEM_EN;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const body = {
    systemInstruction: { parts: [{ text: systemInstruction }] },
    contents: [{ role: "user", parts: [{ text: message.trim() }] }],
    generationConfig: {
      temperature: 0.35,
      maxOutputTokens: 700,
    },
  };

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const errText = !response.ok ? await response.text() : "";
  if (!response.ok) {
    throw new Error(`Gemini chat failed (${model}): ${response.status} ${errText.slice(0, 200)}`);
  }

  const json = (await response.json()) as unknown;
  const text = extractGeminiText(json);
  if (!text) {
    throw new Error("Gemini returned no text for landing chat");
  }
  return text;
}
