import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { StaffJwtGuard } from "./staff-jwt.guard";
import { SuperuserGuard } from "./superuser.guard";

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>("ADMIN_JWT_SECRET"),
        signOptions: { expiresIn: "8h" },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, StaffJwtGuard, SuperuserGuard],
  exports: [AuthService, JwtModule, StaffJwtGuard, SuperuserGuard],
})
export class AuthModule {}
