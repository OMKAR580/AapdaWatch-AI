import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  Res,
} from "@nestjs/common";
import { Response } from "express";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { IncidentsService } from "./incidents.service";
import { CreateIncidentDto } from "./dto/create-incident.dto";
import { UpdateIncidentDto } from "./dto/update-incident.dto";
import { UpdateIncidentStatusDto } from "./dto/update-status.dto";
import { AddReportToIncidentDto } from "./dto/add-report.dto";
import { QueryIncidentsDto } from "./dto/query-incidents.dto";

@ApiTags("Incidents")
@Controller("incidents")
export class IncidentsController {
  constructor(private readonly incidentsService: IncidentsService) {}

  @Post()
  @ApiOperation({ summary: "Create a new disaster incident folder" })
  @ApiResponse({ status: 201, description: "Incident created successfully" })
  async create(@Body() dto: CreateIncidentDto) {
    return this.incidentsService.create(dto);
  }

  @Get("export/csv")
  @ApiOperation({ summary: "Export incidents as CSV with formula-injection protection" })
  async exportCsv(@Query() query: QueryIncidentsDto, @Res() res: Response) {
    const csv = await this.incidentsService.exportCsv(query);
    const filename = `aapdawatch_incidents_${new Date().toISOString().slice(0, 10)}.csv`;

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    return res.send(csv);
  }

  @Get()
  @ApiOperation({ summary: "List disaster incidents with filtering and pagination" })
  async findAll(@Query() query: QueryIncidentsDto) {
    return this.incidentsService.findAll(query);
  }

  @Get(":id")
  @ApiOperation({ summary: "Retrieve detailed incident dossier by UUID or incidentCode" })
  async findOne(@Param("id") id: string) {
    return this.incidentsService.findOne(id);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update incident details" })
  async update(@Param("id") id: string, @Body() dto: UpdateIncidentDto) {
    return this.incidentsService.update(id, dto);
  }

  @Patch(":id/status")
  @ApiOperation({ summary: "Update incident operational status" })
  async updateStatus(
    @Param("id") id: string,
    @Body() dto: UpdateIncidentStatusDto,
  ) {
    return this.incidentsService.updateStatus(id, dto.status);
  }

  @Post(":id/reports")
  @ApiOperation({ summary: "Associate a disaster report with an incident dossier" })
  async addReport(
    @Param("id") id: string,
    @Body() dto: AddReportToIncidentDto,
  ) {
    return this.incidentsService.addReport(id, dto.reportId, dto.relationshipType);
  }

  @Delete(":id/reports/:reportId")
  @ApiOperation({ summary: "Remove association between report and incident" })
  async removeReport(
    @Param("id") id: string,
    @Param("reportId") reportId: string,
  ) {
    return this.incidentsService.removeReport(id, reportId);
  }
}

