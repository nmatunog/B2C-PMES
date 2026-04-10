import { UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { Test } from "@nestjs/testing";
import { AuthService, buildDailyAdminCode } from "./auth.service";

describe("AuthService", () => {
  let service: AuthService;
  let jwt: { sign: jest.Mock; verify: jest.Mock };

  beforeEach(async () => {
    jwt = { sign: jest.fn(() => "test.jwt.token"), verify: jest.fn() };
    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: JwtService, useValue: jwt },
        { provide: ConfigService, useValue: { get: () => undefined } },
      ],
    }).compile();
    service = module.get(AuthService);
  });

  it("buildDailyAdminCode uses B2C + MMDDYYYY", () => {
    const d = new Date(2026, 3, 10);
    expect(buildDailyAdminCode(d)).toBe("B2C04102026");
  });

  it("adminLogin rejects invalid code", () => {
    expect(() => service.adminLogin("nope")).toThrow(UnauthorizedException);
  });

  it("adminLogin accepts daily code", () => {
    const code = buildDailyAdminCode();
    const out = service.adminLogin(code);
    expect(out.accessToken).toBe("test.jwt.token");
    expect(jwt.sign).toHaveBeenCalledWith({ role: "admin" });
  });
});
