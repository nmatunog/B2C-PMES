import { Body, Controller, Post } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { AiService } from "./ai.service";
import { LandingChatDto } from "./dto/landing-chat.dto";
import { TtsDto } from "./dto/tts.dto";

@Controller("ai")
@Throttle({ default: { limit: 30, ttl: 60000 } })
export class AiController {
  constructor(private readonly ai: AiService) {}

  /** Proxies TTS so API keys stay server-side. Response: `{ audioBase64, encoding: "pcm16" | "mp3" }`. */
  @Post("tts")
  async tts(@Body() body: TtsDto) {
    return this.ai.synthesizeTts(body);
  }

  /** Ka-uban landing FAQ — Gemini text when `LANDING_CHAT_PROVIDER=gemini`. Response: `{ text: string }`. */
  @Post("landing-chat")
  @Throttle({ default: { limit: 12, ttl: 60000 } })
  async landingChat(@Body() body: LandingChatDto) {
    return this.ai.answerLandingChat(body);
  }
}
