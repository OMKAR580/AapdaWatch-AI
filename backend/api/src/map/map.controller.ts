import { Controller, Get, Query } from "@nestjs/common";
import { ApiTags, ApiOperation } from "@nestjs/swagger";
import { MapService } from "./map.service";
import { DisasterCategory, IncidentSeverity } from "@prisma/client";

@ApiTags("Map")
@Controller("map")
export class MapController {
  constructor(private readonly mapService: MapService) {}

  @Get("incidents")
  @ApiOperation({
    summary:
      "Get all geographically mapped incidents with [longitude, latitude] coordinates",
  })
  async getMapIncidents(
    @Query("category") category?: DisasterCategory,
    @Query("severity") severity?: IncidentSeverity,
    @Query("status") status?: string,
  ) {
    return this.mapService.getMapIncidents({ category, severity, status });
  }
}

