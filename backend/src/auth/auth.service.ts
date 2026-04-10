import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";

export function buildDailyAdminCode(now = new Date()): string {
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `B2C${mm}${dd}${now.getFullYear()}`;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly config: ConfigService,
    private readonly jwt: JwtService,
  ) {}

  /** Validates rotating daily code or optional static `ADMIN_STATIC_CODE` (CI / break-glass). */
  validateAdminCode(code: string): boolean {
    const trimmed = code.trim();
    const staticCode = this.config.get<string>("ADMIN_STATIC_CODE")?.trim();
    if (staticCode && trimmed === staticCode) return true;
    return trimmed === buildDailyAdminCode();
  }

  adminLogin(code: string): { accessToken: string; expiresIn: string } {
    if (!this.validateAdminCode(code)) {
      throw new UnauthorizedException("Invalid admin code");
    }
    const accessToken = this.jwt.sign({ role: "admin" });
    return { accessToken, expiresIn: "8h" };
  }
}
