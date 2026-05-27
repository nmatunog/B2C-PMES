import { landingChatCacheKey } from "../../lib/ai/landing-chat-cache.ts";

const STORAGE_KEY = "b2ccoop_landing_chat_v1";
const MAX_ENTRIES = 48;

/** @returns {Record<string, string>} */
function readStore() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

/** @param {Record<string, string>} store */
function writeStore(store) {
  try {
    const keys = Object.keys(store);
    while (keys.length > MAX_ENTRIES) {
      const oldest = keys.shift();
      if (oldest) delete store[oldest];
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    /* private mode / quota */
  }
}

/**
 * @param {'en' | 'ceb'} language
 * @param {string} message
 * @returns {string | null}
 */
export function getCachedLandingChatReply(language, message) {
  const key = landingChatCacheKey(language, message);
  const hit = readStore()[key];
  return typeof hit === "string" && hit.trim() ? hit.trim() : null;
}

/**
 * @param {'en' | 'ceb'} language
 * @param {string} message
 * @param {string} text
 */
export function setCachedLandingChatReply(language, message, text) {
  const key = landingChatCacheKey(language, message);
  const store = readStore();
  store[key] = text;
  writeStore(store);
}
