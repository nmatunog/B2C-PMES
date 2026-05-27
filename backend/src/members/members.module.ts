import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { IntegrationsModule } from "../integrations/integrations.module";
import { MembersController } from "./members.controller";

@Module({
  imports: [AuthModule, IntegrationsModule],
  controllers: [MembersController],
})
export class MembersModule {}
