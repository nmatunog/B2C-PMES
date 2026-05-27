import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { IntegrationsModule } from "../integrations/integrations.module";
import { PmesController } from "./pmes.controller";
import { PmesService } from "./pmes.service";

@Module({
  imports: [AuthModule, IntegrationsModule],
  controllers: [PmesController],
  providers: [PmesService],
})
export class PmesModule {}
