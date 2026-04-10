import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import type { Request } from "express";

export type StaffJwtPayload = { sub: string; role: "admin" | "superuser" };

@Injectable()
export class StaffJwtGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request & { staffUser?: StaffJwtPayload }>();
    const raw = req.headers.authorization;
    const header = String(Array.isArray(raw) ? raw[0] : raw ?? "");
    const token = header.replace(/^Bearer\s+/i, "").trim();
    if (!token) {
      throw new UnauthorizedException("Missing Bearer token — sign in via POST /auth/admin/login");
    }
    try {
      const secret = this.config.get<string>("ADMIN_JWT_SECRET");
      const payload = this.jwt.verify<{ role?: string; sub?: string }>(token, { secret });
      const role = payload?.role;
      if (role !== "admin" && role !== "superuser") {
        throw new UnauthorizedException("Not a staff token");
      }
      if (!payload?.sub) {
        throw new UnauthorizedException("Invalid staff token");
      }
      req.staffUser = { sub: payload.sub, role };
      return true;
    } catch {
      throw new UnauthorizedException("Invalid or expired staff token");
    }
  }
}

/** @deprecated Use StaffJwtGuard — kept for existing imports */
export const AdminJwtGuard = StaffJwtGuard;
