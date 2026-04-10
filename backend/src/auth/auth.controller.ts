import { Body, Controller, Post } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { AuthService } from "./auth.service";
import { AdminLoginDto } from "./dto/admin-login.dto";

@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  /** Exchange daily code (or static `ADMIN_STATIC_CODE`) for a short-lived JWT. */
  @Post("admin/login")
  @Throttle({ default: { limit: 15, ttl: 60000 } })
  adminLogin(@Body() dto: AdminLoginDto) {
    return this.auth.adminLogin(dto.code);
  }
}
