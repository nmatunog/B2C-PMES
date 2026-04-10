import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";

@Injectable()
export class AdminJwtGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<{
      headers: Record<string, string | string[] | undefined>;
    }>();
    const raw = req.headers.authorization;
    const header = String(Array.isArray(raw) ? raw[0] : raw ?? "");
    const token = header.replace(/^Bearer\s+/i, "").trim();
    if (!token) {
      throw new UnauthorizedException("Missing Bearer token — use POST /auth/admin/login");
    }
    try {
      const secret = this.config.get<string>("ADMIN_JWT_SECRET");
      const payload = this.jwt.verify<{ role?: string }>(token, { secret });
      if (payload?.role !== "admin") {
        throw new UnauthorizedException("Not an admin token");
      }
      return true;
    } catch {
      throw new UnauthorizedException("Invalid or expired admin token");
    }
  }
}
