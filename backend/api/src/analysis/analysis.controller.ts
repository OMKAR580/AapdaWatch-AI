import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { AnalysisService } from "./analysis.service";
import { BatchAnalysisDto } from "./dto/batch-analysis.dto";

@ApiTags("Analysis")
@Controller("analysis")
export class AnalysisController {
  constructor(private readonly analysisService: AnalysisService) {}

  @Post("batch")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Execute batch BiLSTM neural classification for multiple texts" })
  @ApiResponse({ status: 200, description: "Batch predictions generated via FastAPI BiLSTM" })
  async analyzeBatch(@Body() dto: BatchAnalysisDto) {
    return this.analysisService.analyzeBatch(dto);
  }

  @Post(":reportId")
  @ApiOperation({ summary: "Execute real BiLSTM neural classification for a report" })
  @ApiResponse({ status: 201, description: "Analysis executed and recorded in PostgreSQL" })
  async analyzeReport(@Param("reportId", ParseUUIDPipe) reportId: string) {
    return this.analysisService.analyzeReport(reportId);
  }

  @Get("model/info")
  @ApiOperation({ summary: "Retrieve active ML model metadata from FastAPI microservice" })
  @ApiResponse({ status: 200, description: "Active BiLSTM model specification and status" })
  async getModelInfo() {
    return this.analysisService.getModelInfo();
  }

  @Get(":reportId/history")
  @ApiOperation({ summary: "Retrieve complete append-only analysis history for a report" })
  @ApiResponse({ status: 200, description: "Array of historical analysis records for the report" })
  async getAnalysisHistory(@Param("reportId", ParseUUIDPipe) reportId: string) {
    return this.analysisService.getAnalysisHistory(reportId);
  }

  @Get(":reportId")
  @ApiOperation({ summary: "Retrieve analysis record for a report" })
  async getAnalysisByReport(@Param("reportId", ParseUUIDPipe) reportId: string) {
    return this.analysisService.getAnalysisByReport(reportId);
  }

  @Get()
  @ApiOperation({ summary: "List recent analysis records" })
  async findAll(
    @Query("page") page?: number,
    @Query("limit") limit?: number,
  ) {
    return this.analysisService.findAll(page, limit);
  }
}
