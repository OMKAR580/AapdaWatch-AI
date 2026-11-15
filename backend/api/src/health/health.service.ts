import { Injectable } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";

export interface HealthCheckResponse {
  status: "ok" | "degraded";
  version: string;
  timestamp: string;
  uptimeSeconds: number;
  environment: string;
  database: {
    status: "connected" | "disconnected";
    provider: string;
  };
  memory: {
    heapUsedMb: number;
    heapTotalMb: number;
    rssMb: number;
  };
}

@Injectable()
export class HealthService {
  private readonly startTime = Date.now();

  constructor(private readonly prisma: PrismaService) {}

  async check(): Promise<HealthCheckResponse> {
    const dbCheck = await this.prisma.checkConnection();
    const mem = process.memoryUsage();

    const isHealthy = dbCheck.connected;

    return {
      status: isHealthy ? "ok" : "degraded",
      version: "1.0.0",
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor((Date.now() - this.startTime) / 1000),
      environment: process.env.NODE_ENV || "development",
      database: {
        status: dbCheck.connected ? "connected" : "disconnected",
        provider: "PostgreSQL / PostGIS",
      },
      memory: {
        heapUsedMb: Math.round((mem.heapUsed / 1024 / 1024) * 100) / 100,
        heapTotalMb: Math.round((mem.heapTotal / 1024 / 1024) * 100) / 100,
        rssMb: Math.round((mem.rss / 1024 / 1024) * 100) / 100,
      },
    };
  }
}

