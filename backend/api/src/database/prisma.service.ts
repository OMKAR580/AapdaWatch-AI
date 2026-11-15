import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      log:
        process.env.NODE_ENV === "development"
          ? [
              { emit: "event", level: "query" },
              { emit: "stdout", level: "info" },
              { emit: "stdout", level: "warn" },
              { emit: "stdout", level: "error" },
            ]
          : [{ emit: "stdout", level: "error" }],
    });
  }

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log("✅ Successfully connected to PostgreSQL / PostGIS database.");
    } catch (error) {
      this.logger.warn(
        `⚠️ Database connection deferred or failed at startup: ${
          error instanceof Error ? error.message : String(error)
        }. Ensure PostgreSQL is running.`,
      );
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log("Prisma disconnected gracefully.");
  }

  /**
   * Safe connectivity check without throwing unhandled exceptions.
   */
  async checkConnection(): Promise<{ connected: boolean; error?: string }> {
    try {
      await this.$queryRaw`SELECT 1`;
      return { connected: true };
    } catch (err) {
      return {
        connected: false,
        error: err instanceof Error ? err.message : "Connection failed",
      };
    }
  }
}

