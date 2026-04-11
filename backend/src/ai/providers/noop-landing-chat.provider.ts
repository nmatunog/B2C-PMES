import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import type { LandingChatAnswer, LandingChatProvider } from "../interfaces/landing-chat-provider.interface";

@Injectable()
export class NoopLandingChatProvider implements LandingChatProvider {
  async answer(): Promise<LandingChatAnswer> {
    throw new ServiceUnavailableException(
      "Ka-uban AI text replies are disabled (set LANDING_CHAT_PROVIDER=gemini and GEMINI_API_KEY).",
    );
  }
}
