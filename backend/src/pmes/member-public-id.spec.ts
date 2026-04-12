import {
  buildMemberPublicId,
  cohortYYFromDob,
  initialsFromFirstLast,
  initialsFromFullName,
} from "./member-public-id";

describe("member-public-id", () => {
  it("initialsFromFullName uses first and last word", () => {
    expect(initialsFromFullName("Juan Antonio Dela Cruz")).toBe("JC");
    expect(initialsFromFullName("Maria")).toBe("MA");
  });

  it("initialsFromFirstLast prefers legal first/last", () => {
    expect(initialsFromFirstLast("Juan", "Dela Cruz", "Nickname Only")).toBe("JD");
  });

  it("cohortYYFromDob parses US-style dates and falls back to created year", () => {
    expect(cohortYYFromDob("01/15/1998", new Date("2026-03-01T00:00:00.000Z"))).toBe("98");
    expect(cohortYYFromDob("pending", new Date("2026-03-01T00:00:00.000Z"))).toBe("26");
  });

  it("buildMemberPublicId matches B2C-XX-YY-ZZZZ pattern", () => {
    const id = buildMemberPublicId("AB", "26");
    expect(id).toMatch(/^B2C-AB-26-[0-9A-Z]{4}$/);
  });
});
