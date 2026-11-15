import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  Res,
  ParseUUIDPipe,
} from "@nestjs/common";
import { Response } from "express";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { ReportsService } from "./reports.service";
import { CreateReportDto } from "./dto/create-report.dto";
import { UpdateReportDto } from "./dto/update-report.dto";
import { QueryReportsDto } from "./dto/query-reports.dto";

@ApiTags("Reports")
@Controller("reports")
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Post()
  @ApiOperation({ summary: "Create and ingest a new disaster report" })
  @ApiResponse({ status: 201, description: "Report created successfully" })
  async create(@Body() dto: CreateReportDto) {
    return this.reportsService.create(dto);
  }

  @Get("search")
  @ApiOperation({ summary: "Search disaster reports by keyword" })
  async search(@Query("q") query: string) {
    return this.reportsService.searchReports(query);
  }

  @Get("export/csv")
  @ApiOperation({ summary: "Export disaster reports as CSV with formula-injection escaping" })
  async exportCsv(@Query() query: QueryReportsDto, @Res() res: Response) {
    const csv = await this.reportsService.exportCsv(query);
    const filename = `aapdawatch_reports_${new Date().toISOString().slice(0, 10)}.csv`;

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    return res.send(csv);
  }

  @Get()
  @ApiOperation({ summary: "List disaster reports with filtering and pagination" })
  async findAll(@Query() query: QueryReportsDto) {
    return this.reportsService.findAll(query);
  }

  @Get(":id")
  @ApiOperation({ summary: "Retrieve detailed record of a disaster report by UUID" })
  async findOne(@Param("id", ParseUUIDPipe) id: string) {
    return this.reportsService.findOne(id);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update permitted fields of a disaster report" })
  async update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateReportDto,
  ) {
    return this.reportsService.update(id, dto);
  }
}

