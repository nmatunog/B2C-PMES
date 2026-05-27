/** Shared normalization for landing FAQ AI cache keys (server + browser). */
export function normalizeLandingChatMessage(message: string): string {
  return String(message ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

export type LandingChatLanguage = "en" | "ceb";

export function landingChatCacheKey(language: LandingChatLanguage, message: string): string {
  return `${language}|${normalizeLandingChatMessage(message)}`;
}
