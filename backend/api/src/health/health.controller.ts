import { Controller, Get, HttpCode, HttpStatus } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { HealthService, HealthCheckResponse } from "./health.service";

@ApiTags("System Health")
@Controller("health")
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "System & Database Connectivity Health Check" })
  @ApiResponse({
    status: 200,
    description: "System health check report",
  })
  async getHealth(): Promise<HealthCheckResponse> {
    return this.healthService.check();
  }
}

