/** Client-only mock “live” activity lines for the landing toast (not real analytics). */

const PLACES = [
  "IT Park",
  "Ayala Center Cebu",
  "SM Cebu",
  "Cebu Business Park",
  "Lahug",
  "Talamban",
  "Guadalupe",
  "Mandaue City",
  "Parkmall Mandaue",
  "Lapu-Lapu City",
  "Mactan",
  "Cordova",
  "Talisay City",
  "Minglanilla",
  "Naga City",
  "San Fernando",
  "Carcar City",
  "Sibonga",
  "Argao",
  "Toledo City",
  "Balamban",
  "Liloan",
  "Consolacion",
  "Compostela",
  "Danao City",
  "Bogo City",
  "Medellin",
  "Daanbantayan",
  "Bantayan Island",
  "Camotes Islands",
  "Oslob",
  "Moalboal",
  "Barili",
  "Pinamungajan",
  "Tabuelan",
  "San Remigio",
  "Borbon",
  "Sogod",
  "Dalaguete",
  "Alcoy",
];

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randInt(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

/**
 * @returns {string} One randomized social-proof line (Cebu Province–style places).
 */
export function pickRandomActivityMessage() {
  const place = pick(PLACES);
  const templates = [
    () => `New signup from ${place}`,
    () => `New signup from ${place}`,
    () => `Activity from ${place}`,
    () => `Someone joined from ${place}`,
    () => `${randInt(2, 5)} on PMES today from ${place}`,
    () => `${randInt(1, 4)} new accounts today — ${place}`,
    () => `PMES interest from ${place}`,
    () => `Member check-in near ${place}`,
    () => `Joining activity — ${place}`,
    () => `Fresh signup: ${place} area`,
  ];
  return pick(templates)();
}
