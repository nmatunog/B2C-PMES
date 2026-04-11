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

  /**
   * When `MEMBER_SYNC_SECRET` is set in env, callers must send matching `X-Member-Sync-Secret` header.
   */
  assertMemberSyncSecret(headerSecret: string | undefined): void {
    const expected = String(this.config.get<string>("MEMBER_SYNC_SECRET") ?? "").trim();
    if (!expected) return;
    if (String(headerSecret ?? "").trim() !== expected) {
      throw new UnauthorizedException("Invalid or missing member sync secret");
    }
  }

  /**
   * Bridge Firebase Auth → `Participant` (Neon/Postgres). Call after sign-up or first sign-in.
   * Upserts by `firebaseUid`, or links uid to an existing row matched by email (e.g. PMES created first).
   */
  async syncMember(uid: string, email: string, fullName?: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const name = (fullName?.trim() || normalizedEmail.split("@")[0] || "Member").slice(0, 500);

    const existingByUid = await this.prisma.participant.findUnique({ where: { firebaseUid: uid } });
    if (existingByUid) {
      const updated = await this.prisma.participant.update({
        where: { id: existingByUid.id },
        data: {
          fullName: name,
          email: normalizedEmail,
        },
        select: {
          id: true,
          firebaseUid: true,
          email: true,
          fullName: true,
          createdAt: true,
        },
      });
      return {
        success: true,
        message: "Member successfully synced to PostgreSQL",
        data: updated,
      };
    }

    const existingByEmail = await this.prisma.participant.findUnique({ where: { email: normalizedEmail } });
    if (existingByEmail) {
      if (existingByEmail.firebaseUid && existingByEmail.firebaseUid !== uid) {
        throw new ConflictException("This email is already linked to another Firebase account.");
      }
      const updated = await this.prisma.participant.update({
        where: { id: existingByEmail.id },
        data: {
          firebaseUid: uid,
          fullName: existingByEmail.fullName?.trim() ? existingByEmail.fullName : name,
        },
        select: {
          id: true,
          firebaseUid: true,
          email: true,
          fullName: true,
          createdAt: true,
        },
      });
      return {
        success: true,
        message: "Firebase uid linked to existing participant",
        data: updated,
      };
    }

    const created = await this.prisma.participant.create({
      data: {
        firebaseUid: uid,
        email: normalizedEmail,
        fullName: name,
        phone: "pending",
        dob: "pending",
        gender: "unknown",
      },
      select: {
        id: true,
        firebaseUid: true,
        email: true,
        fullName: true,
        createdAt: true,
      },
    });
    return {
      success: true,
      message: "Member successfully synced to PostgreSQL",
      data: created,
    };
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
