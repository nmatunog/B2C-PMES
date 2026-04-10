import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { PmesController } from "./pmes.controller";
import { PmesService } from "./pmes.service";

@Module({
  imports: [AuthModule],
  controllers: [PmesController],
  providers: [PmesService],
})
export class PmesModule {}
