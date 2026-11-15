import { NestFactory } from "@nestjs/core";
import { ValidationPipe, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { AppModule } from "./app.module";
import { HttpExceptionFilter } from "./common/filters/http-exception.filter";
import { LoggingInterceptor } from "./common/interceptors/logging.interceptor";
import { TransformInterceptor } from "./common/interceptors/transform.interceptor";

async function bootstrap() {
  const logger = new Logger("AapdaWatch-Bootstrap");
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const port = configService.get<number>("PORT", 3001);
  const apiPrefix = configService.get<string>("API_PREFIX", "api/v1");
  const frontendOrigin = configService.get<string>(
    "FRONTEND_ORIGIN",
    "http://localhost:3000",
  );

  // 1. Global API Prefix (/api/v1)
  app.setGlobalPrefix(apiPrefix);

  // 2. CORS Configuration
  app.enableCors({
    origin: [frontendOrigin, "http://localhost:3000", "http://localhost:3002"],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    credentials: true,
  });

  // 3. Global Request Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // 4. Global Error Filter
  app.useGlobalFilters(new HttpExceptionFilter());

  // 5. Global Interceptors (Logging & Envelope)
  app.useGlobalInterceptors(
    new LoggingInterceptor(),
    new TransformInterceptor(),
  );

  // 6. Swagger / OpenAPI Documentation
  const swaggerConfig = new DocumentBuilder()
    .setTitle("AapdaWatch AI — Disaster Intelligence Platform API")
    .setDescription(
      "RESTful Backend Services for Disaster Ingestion, Machine Learning Analysis, Incident Correlation, and Human Verification",
    )
    .setVersion("1.0.0")
    .addTag("System Health", "Operational and connectivity monitoring")
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup(`${apiPrefix}/docs`, app, document);

  // 7. Enable Shutdown Hooks
  app.enableShutdownHooks();

  await app.listen(port);
  logger.log(
    `🚀 AapdaWatch AI Backend API running at: http://localhost:${port}/${apiPrefix}`,
  );
  logger.log(
    `📚 Swagger API Documentation available at: http://localhost:${port}/${apiPrefix}/docs`,
  );
}

bootstrap().catch((err) => {
  const logger = new Logger("Bootstrap-Fatal");
  logger.error("Fatal startup error:", err);
  process.exit(1);
});

