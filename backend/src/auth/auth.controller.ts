import { Body, Controller, Get, Headers, Post, Req, UseGuards } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import type { Request } from "express";
import { AuthService } from "./auth.service";
import { AdminCredentialsDto } from "./dto/admin-credentials.dto";
import { CreateStaffAdminDto } from "./dto/create-staff-admin.dto";
import { SyncMemberDto } from "./dto/sync-member.dto";
import { StaffJwtGuard, type StaffJwtPayload } from "./staff-jwt.guard";
import { SuperuserGuard } from "./superuser.guard";

type StaffRequest = Request & { staffUser: StaffJwtPayload };

@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  /**
   * Firebase → Postgres: upsert `Participant` by Firebase uid / email.
   * Set `MEMBER_SYNC_SECRET` in production and send `X-Member-Sync-Secret` (do not expose secret to the browser).
   */
  @Post("sync-member")
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  syncMember(@Headers("x-member-sync-secret") syncSecret: string | undefined, @Body() dto: SyncMemberDto) {
    this.auth.assertMemberSyncSecret(syncSecret);
    return this.auth.syncMember(dto.uid, dto.email, dto.fullName);
  }

  /** Staff sign-in (superuser or admin) — returns JWT for PMES admin routes. */
  @Post("admin/login")
  @Throttle({ default: { limit: 15, ttl: 60000 } })
  adminLogin(@Body() dto: AdminCredentialsDto) {
    return this.auth.staffLogin(dto.email, dto.password);
  }

  /** Superuser only: create an admin account (cannot create other superusers). */
  @Post("staff/admins")
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @UseGuards(StaffJwtGuard, SuperuserGuard)
  createStaffAdmin(@Req() req: StaffRequest, @Body() dto: CreateStaffAdminDto) {
    return this.auth.createAdmin(req.staffUser.sub, dto.email, dto.password);
  }

  /** Superuser only: list admin accounts (no passwords). */
  @Get("staff/admins")
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  @UseGuards(StaffJwtGuard, SuperuserGuard)
  listStaffAdmins(@Req() req: StaffRequest) {
    return this.auth.listManagedAdmins(req.staffUser.sub);
  }
}
