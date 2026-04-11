import { Module } from "@nestjs/common";
import { AiController } from "./ai.controller";
import { AiService } from "./ai.service";
import { GeminiLandingChatProvider } from "./providers/gemini-landing-chat.provider";
import { GeminiTtsProvider } from "./providers/gemini-tts.provider";
import { GrokTtsProvider } from "./providers/grok-tts.provider";
import { NoopLandingChatProvider } from "./providers/noop-landing-chat.provider";
import { NoopTtsProvider } from "./providers/noop-tts.provider";
import { OpenaiTtsProvider } from "./providers/openai-tts.provider";

@Module({
  controllers: [AiController],
  providers: [
    AiService,
    GeminiTtsProvider,
    OpenaiTtsProvider,
    GrokTtsProvider,
    NoopTtsProvider,
    GeminiLandingChatProvider,
    NoopLandingChatProvider,
  ],
})
export class AiModule {}
