import { createHash } from "node:crypto";
import { BadRequestException, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { LandingChatDto } from "./dto/landing-chat.dto";
import { TtsDto } from "./dto/tts.dto";
import { GeminiLandingChatProvider } from "./providers/gemini-landing-chat.provider";
import { GeminiTtsProvider } from "./providers/gemini-tts.provider";
import { GrokTtsProvider } from "./providers/grok-tts.provider";
import { NoopLandingChatProvider } from "./providers/noop-landing-chat.provider";
import { NoopTtsProvider } from "./providers/noop-tts.provider";
import { OpenaiTtsProvider } from "./providers/openai-tts.provider";
import type { LandingChatLanguage } from "./interfaces/landing-chat-provider.interface";
import type { TtsSynthesisResult } from "./interfaces/tts-provider.interface";
import { normalizeKaubanForTts } from "./utils/tts-kauban-normalize";

/** Gemini default voice — broadly supported. */
const DEFAULT_VOICE = "Aoede";
const CACHE_MAX = 64;
/** Bump when synthesis behavior changes (e.g. prompt text) so old cached audio is not reused. */
const TTS_CACHE_VERSION = 3;

const LANDING_CHAT_CACHE_MAX = 48;
/** Bump when Ka-uban landing system prompts change. */
const LANDING_CHAT_CACHE_VERSION = 1;

@Injectable()
export class AiService {
  private readonly cache = new Map<string, TtsSynthesisResult>();
  private readonly landingChatCache = new Map<string, { text: string }>();

  constructor(
    private readonly config: ConfigService,
    private readonly gemini: GeminiTtsProvider,
    private readonly openai: OpenaiTtsProvider,
    private readonly grok: GrokTtsProvider,
    private readonly noop: NoopTtsProvider,
    private readonly geminiLandingChat: GeminiLandingChatProvider,
    private readonly noopLandingChat: NoopLandingChatProvider,
  ) {}

  async synthesizeTts(dto: TtsDto): Promise<TtsSynthesisResult> {
    const voice = dto.voice?.trim() || DEFAULT_VOICE;
    const text = normalizeKaubanForTts(dto.text);
    const providerId = this.providerId();
    const provider = this.resolveProvider(providerId);
    const key = this.cacheKey(providerId, text, voice);
    const hit = this.cache.get(key);
    if (hit) return hit;

    const out = await provider.synthesize(text, voice);
    if (this.cache.size >= CACHE_MAX) {
      const first = this.cache.keys().next().value as string;
      this.cache.delete(first);
    }
    this.cache.set(key, out);
    return out;
  }

  /** Ka-uban marketing FAQ — text-only; keys stay server-side. */
  async answerLandingChat(dto: LandingChatDto): Promise<{ text: string }> {
    const message = dto.message.trim();
    const language: LandingChatLanguage = dto.language === "ceb" ? "ceb" : "en";
    const providerId = this.landingChatProviderId();
    const provider =
      providerId === "gemini" ? this.geminiLandingChat : this.noopLandingChat;

    const key = this.landingChatCacheKey(providerId, message, language);
    const hit = this.landingChatCache.get(key);
    if (hit) return hit;

    const out = await provider.answer(message, language);
    if (this.landingChatCache.size >= LANDING_CHAT_CACHE_MAX) {
      const first = this.landingChatCache.keys().next().value as string;
      this.landingChatCache.delete(first);
    }
    this.landingChatCache.set(key, out);
    return out;
  }

  private landingChatProviderId(): string {
    return (this.config.get<string>("LANDING_CHAT_PROVIDER") ?? "noop").toLowerCase();
  }

  private landingChatCacheKey(providerId: string, message: string, language: LandingChatLanguage): string {
    return createHash("sha256")
      .update(`${LANDING_CHAT_CACHE_VERSION}|${providerId}|${language}|${message}`)
      .digest("hex");
  }

  private providerId(): string {
    return (this.config.get<string>("AI_PROVIDER") ?? "noop").toLowerCase();
  }

  private resolveProvider(id: string) {
    switch (id) {
      case "noop":
        return this.noop;
      case "gemini":
        return this.gemini;
      case "openai":
        return this.openai;
      case "grok":
        return this.grok;
      default:
        throw new BadRequestException(
          `Unknown AI_PROVIDER="${id}". Use: noop, gemini, openai, grok.`,
        );
    }
  }

  private cacheKey(providerId: string, text: string, voice: string): string {
    return createHash("sha256")
      .update(`${TTS_CACHE_VERSION}|${providerId}|${voice}|${text}`)
      .digest("hex");
  }
}
