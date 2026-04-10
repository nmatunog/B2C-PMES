import {
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { StaffRole } from "@prisma/client";
import * as bcrypt from "bcryptjs";
import { PrismaService } from "../prisma/prisma.service";

export type StaffLoginResponse = {
  accessToken: string;
  expiresIn: string;
  role: "admin" | "superuser";
};

@Injectable()
export class AuthService {
  constructor(
    private readonly config: ConfigService,
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async staffLogin(email: string, password: string): Promise<StaffLoginResponse> {
    const normalized = email?.trim().toLowerCase();
    if (!normalized) {
      throw new UnauthorizedException("Invalid email or password");
    }
    const staff = await this.prisma.staffUser.findUnique({ where: { email: normalized } });
    if (!staff) {
      throw new UnauthorizedException("Invalid email or password");
    }
    const ok = await bcrypt.compare(password ?? "", staff.passwordHash);
    if (!ok) {
      throw new UnauthorizedException("Invalid email or password");
    }
    const roleJwt: "admin" | "superuser" =
      staff.role === StaffRole.SUPERUSER ? "superuser" : "admin";
    const accessToken = this.jwt.sign({ role: roleJwt, sub: staff.id });
    return { accessToken, expiresIn: "8h", role: roleJwt };
  }

  /** @deprecated alias */
  adminLogin(email: string, password: string): Promise<StaffLoginResponse> {
    return this.staffLogin(email, password);
  }

  async createAdmin(createdByStaffId: string, email: string, password: string) {
    const creator = await this.prisma.staffUser.findUnique({ where: { id: createdByStaffId } });
    if (!creator || creator.role !== StaffRole.SUPERUSER) {
      throw new ForbiddenException("Only a superuser can create admins");
    }
    const normalized = email.trim().toLowerCase();
    const existing = await this.prisma.staffUser.findUnique({ where: { email: normalized } });
    if (existing) {
      throw new ConflictException("A staff account with this email already exists");
    }
    const passwordHash = await bcrypt.hash(password, 12);
    return this.prisma.staffUser.create({
      data: {
        email: normalized,
        passwordHash,
        role: StaffRole.ADMIN,
        createdById: createdByStaffId,
      },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });
  }

  async listManagedAdmins(actingStaffId: string) {
    const actor = await this.prisma.staffUser.findUnique({ where: { id: actingStaffId } });
    if (!actor || actor.role !== StaffRole.SUPERUSER) {
      throw new ForbiddenException("Only a superuser can list admin accounts");
    }
    return this.prisma.staffUser.findMany({
      where: { role: StaffRole.ADMIN },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        createdById: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }
}
