/**
 * Approximate place name from the device (browser geolocation + OSM Nominatim reverse geocode).
 * No API keys; user may deny location — returns null in that case.
 */

const NOMINATIM_UA = "B2C-PMES/1.0 (member web app; +https://github.com/)";

/**
 * @param {number} lat
 * @param {number} lon
 * @returns {Promise<string | null>}
 */
async function reverseGeocodeNominatim(lat, lon) {
  const url = `https://nominatim.openstreetmap.org/reverse?lat=${encodeURIComponent(String(lat))}&lon=${encodeURIComponent(String(lon))}&format=json`;
  const ctrl = new AbortController();
  const abortT = window.setTimeout(() => ctrl.abort(), 8000);
  let res;
  try {
    res = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        Accept: "application/json",
        "Accept-Language": "en",
        "User-Agent": NOMINATIM_UA,
      },
    });
  } finally {
    window.clearTimeout(abortT);
  }
  if (!res.ok) return null;
  const data = await res.json();
  const a = data.address || {};
  const label =
    a.city ||
    a.town ||
    a.village ||
    a.municipality ||
    a.city_district ||
    a.suburb ||
    a.neighbourhood ||
    a.hamlet ||
    a.county ||
    null;
  return typeof label === "string" && label.trim() ? label.trim() : null;
}

/**
 * @returns {Promise<string | null>} Human-readable locality, or null if unavailable / denied.
 */
export async function getApproximateAreaFromDevice() {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    return null;
  }
  try {
    const pos = await new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: false,
        timeout: 14000,
        maximumAge: 120000,
      });
    });
    const lat = pos.coords.latitude;
    const lon = pos.coords.longitude;
    const area = await reverseGeocodeNominatim(lat, lon);
    return area;
  } catch {
    return null;
  }
}
