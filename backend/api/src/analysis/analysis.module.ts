import { Module } from "@nestjs/common";
import { AnalysisService } from "./analysis.service";
import { AnalysisController } from "./analysis.controller";
import { MlClientService } from "./ml-client.service";

@Module({
  controllers: [AnalysisController],
  providers: [AnalysisService, MlClientService],
  exports: [AnalysisService, MlClientService],
})
export class AnalysisModule {}
