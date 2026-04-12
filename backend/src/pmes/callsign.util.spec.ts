import {
  computeAlternatePublicHandle,
  normalizeLastNameKey,
  validateAndNormalizeCallsignInput,
} from "./callsign.util";

describe("callsign.util", () => {
  it("normalizeLastNameKey slugs surnames", () => {
    expect(normalizeLastNameKey("Dela Cruz")).toBe("delacruz");
    expect(normalizeLastNameKey("O'Brien")).toBe("obrien");
  });

  it("validateAndNormalizeCallsignInput accepts safe handles", () => {
    expect(validateAndNormalizeCallsignInput("Pilot_Juan")).toBe("pilot_juan");
  });

  it("rejects reserved default-handle pattern", () => {
    expect(() => validateAndNormalizeCallsignInput("cruz-2")).toThrow();
  });

  it("computeAlternatePublicHandle prefers callsign", () => {
    expect(
      computeAlternatePublicHandle({
        callsign: "skyfox",
        lastNameKey: "cruz",
        lastNameSeq: 2,
      }),
    ).toBe("skyfox");
    expect(
      computeAlternatePublicHandle({
        callsign: null,
        lastNameKey: "cruz",
        lastNameSeq: 2,
      }),
    ).toBe("cruz-2");
  });
});
