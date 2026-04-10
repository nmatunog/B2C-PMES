import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import type { Request } from "express";
import type { StaffJwtPayload } from "./staff-jwt.guard";

@Injectable()
export class SuperuserGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request & { staffUser?: StaffJwtPayload }>();
    if (req.staffUser?.role !== "superuser") {
      throw new ForbiddenException("Only a superuser can manage admin accounts");
    }
    return true;
  }
}
