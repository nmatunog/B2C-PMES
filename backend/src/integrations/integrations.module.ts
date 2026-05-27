import { Module } from "@nestjs/common";
import { AccountingClientService } from "./accounting-client.service";

@Module({
  providers: [AccountingClientService],
  exports: [AccountingClientService],
})
export class IntegrationsModule {}
