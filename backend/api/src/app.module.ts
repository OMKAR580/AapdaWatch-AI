import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { configuration } from "./config/configuration";
import { validate } from "./config/validation";
import { DatabaseModule } from "./database/database.module";
import { HealthModule } from "./health/health.module";
import { AuthModule } from "./auth/auth.module";
import { UsersModule } from "./users/users.module";
import { ReportsModule } from "./reports/reports.module";
import { IncidentsModule } from "./incidents/incidents.module";
import { AnalysisModule } from "./analysis/analysis.module";
import { VerificationModule } from "./verification/verification.module";
import { CorrelationModule } from "./correlation/correlation.module";
import { AuditModule } from "./audit/audit.module";
import { AnalyticsModule } from "./analytics/analytics.module";
import { BatchJobsModule } from "./batch-jobs/batch-jobs.module";
import { MapModule } from "./map/map.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate,
    }),
    DatabaseModule,
    HealthModule,
    AuthModule,
    UsersModule,
    ReportsModule,
    IncidentsModule,
    AnalysisModule,
    VerificationModule,
    CorrelationModule,
    AuditModule,
    AnalyticsModule,
    BatchJobsModule,
    MapModule,
  ],
})
export class AppModule {}
