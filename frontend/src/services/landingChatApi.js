/**
 * Server-proxied Ka-uban landing chat (Gemini text on Nest). API keys never touch the browser.
 */

const baseUrl = () => (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");

/**
 * @param {{ message: string, language?: 'en' | 'ceb' }} params
 * @returns {Promise<{ ok: true, text: string } | { ok: false, disabled: true }>}
 */
export async function requestLandingChat({ message, language = "en" }) {
  const base = baseUrl();
  if (!base) {
    throw new Error("NO_API_BASE");
  }
  const response = await fetch(`${base}/ai/landing-chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, language }),
  });

  if (response.status === 503) {
    return { ok: false, disabled: true };
  }

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || `HTTP ${response.status}`);
  }

  const data = await response.json();
  const text = typeof data?.text === "string" ? data.text.trim() : "";
  if (!text) {
    throw new Error("Empty reply");
  }
  return { ok: true, text };
}
