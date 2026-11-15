import { Controller, Get, Query } from "@nestjs/common";
import { ApiTags, ApiOperation } from "@nestjs/swagger";
import { AnalyticsService } from "./analytics.service";

@ApiTags("Analytics")
@Controller("analytics")
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get("overview")
  @ApiOperation({ summary: "Get high-level dashboard metrics calculated from database" })
  async getOverview() {
    return this.analyticsService.getOverview();
  }

  @Get("categories")
  @ApiOperation({ summary: "Get incident category distribution" })
  async getCategories() {
    return this.analyticsService.getCategoryDistribution();
  }

  @Get("severity")
  @ApiOperation({ summary: "Get incident severity breakdown" })
  async getSeverity() {
    return this.analyticsService.getSeverityDistribution();
  }

  @Get("timeline")
  @ApiOperation({ summary: "Get incident and report historical activity trend" })
  async getTimeline(@Query("range") range?: "7d" | "30d" | "90d") {
    return this.analyticsService.getTimeline(range || "7d");
  }

  @Get("status")
  @ApiOperation({ summary: "Get incident operational status distribution" })
  async getStatus() {
    return this.analyticsService.getStatusDistribution();
  }
}

