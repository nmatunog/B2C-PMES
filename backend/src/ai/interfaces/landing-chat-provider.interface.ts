export type LandingChatLanguage = "en" | "ceb";

export interface LandingChatAnswer {
  text: string;
}

/** Text-only Ka-uban helper for the marketing landing (agnostic from TTS providers). */
export interface LandingChatProvider {
  answer(message: string, language: LandingChatLanguage): Promise<LandingChatAnswer>;
}
