import { Injectable, InternalServerErrorException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type {
  LandingChatAnswer,
  LandingChatLanguage,
  LandingChatProvider,
} from "../interfaces/landing-chat-provider.interface";

const SYSTEM_EN = `You are Ka-uban, the helpful assistant for B2C Consumers Cooperative — a digital-first consumers cooperative in the Visayas, Philippines. You answer questions about membership, PMES (pre-membership education), cooperative basics, patronage, and how to join.

Rules:
- Be accurate and concise (at most 4 short paragraphs). Plain language.
- Do not invent fees, share amounts, deadlines, or legal obligations. When specifics matter, say members should confirm with official B2C notices, the registered bylaws, or PMES materials.
- Do not give legal, tax, or investment advice; suggest qualified professionals or official documents.
- Never ask for passwords, OTPs, PINs, or full account numbers.
- If the question is off-topic, politely say you focus on B2C / cooperative membership and point to official channels.
- Respond in English.`;

const SYSTEM_CEB = `Ikaw si Ka-uban, tabang sa B2C Consumers Cooperative — usa ka digital-first consumers cooperative sa Visayas, Pilipinas. Tubaga ang pangutana bahin sa membership, PMES, kooperatiba, patronage, ug pag-apil.

Mga lagda:
- Tinuod ug mubo ra (dili moubos sa upat ka parapo). Sayon sabton.
- Ayaw paghimo og eksakto nga bayad, petsa, o legal nga obligasyon. Kung importante ang detalye, ingna nga kumpirmahon sa opisyal nga B2C, bylaws, o PMES.
- Ayaw hatagi og legal/tax/investment advice.
- Ayaw pangayoa og password, OTP, o numero sa account.
- Kung dili hilisgutan, ingna nga nag-focus ka sa B2C ug kooperatiba.
- Tubag sa Cebuano.`;

function extractText(result: unknown): string {
  const candidates = (result as { candidates?: { content?: { parts?: { text?: string }[] } }[] })?.candidates;
  const parts = candidates?.[0]?.content?.parts ?? [];
  const chunks = parts.map((p) => p?.text).filter((t): t is string => typeof t === "string" && t.length > 0);
  return chunks.join("\n").trim();
}

@Injectable()
export class GeminiLandingChatProvider implements LandingChatProvider {
  constructor(private readonly config: ConfigService) {}

  async answer(message: string, language: LandingChatLanguage): Promise<LandingChatAnswer> {
    const apiKey = this.config.get<string>("GEMINI_API_KEY");
    if (!apiKey) {
      throw new InternalServerErrorException("GEMINI_API_KEY is not configured");
    }

    const model =
      this.config.get<string>("GEMINI_CHAT_MODEL")?.trim() || "gemini-2.0-flash";
    const systemInstruction = language === "ceb" ? SYSTEM_CEB : SYSTEM_EN;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const body = {
      systemInstruction: { parts: [{ text: systemInstruction }] },
      contents: [
        {
          role: "user",
          parts: [{ text: message.trim() }],
        },
      ],
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
      throw new InternalServerErrorException(
        `Gemini chat failed (${model}): ${response.status} ${errText.slice(0, 200)}`,
      );
    }

    const json = await response.json();
    const text = extractText(json);
    if (!text) {
      throw new InternalServerErrorException("Gemini returned no text for landing chat");
    }
    return { text };
  }
}
