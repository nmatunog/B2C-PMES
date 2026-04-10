import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { AdminJwtGuard } from "./admin-jwt.guard";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>("ADMIN_JWT_SECRET"),
        signOptions: { expiresIn: "8h", subject: "admin" },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, AdminJwtGuard],
  exports: [AuthService, JwtModule, AdminJwtGuard],
})
export class AuthModule {}
