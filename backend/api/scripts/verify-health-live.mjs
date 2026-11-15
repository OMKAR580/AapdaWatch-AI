// Live Health Endpoint Probe for Phase 2.0.1
import assert from "node:assert/strict";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "../dist/src/app.module.js";
import { ValidationPipe } from "@nestjs/common";
import { HttpExceptionFilter } from "../dist/src/common/filters/http-exception.filter.js";

async function run() {
  console.log("🚀 Booting NestJS Application for live health probe...");
  const app = await NestFactory.create(AppModule, { logger: ["error", "warn"] });

  app.setGlobalPrefix("api/v1");
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new HttpExceptionFilter());

  const port = 3001;
  await app.listen(port);
  console.log(`📡 Application listening on port ${port}. Probing GET /api/v1/health...`);

  const response = await fetch(`http://localhost:${port}/api/v1/health`);
  assert.equal(response.status, 200, `Expected status 200, got ${response.status}`);

  const body = await response.json();
  console.log("\n--- Live Health Response Received ---");
  console.log(JSON.stringify(body, null, 2));

  // Assertions
  assert.equal(body.status, "ok");
  assert.equal(body.version, "1.0.0");
  assert.equal(body.database.status, "connected");
  assert.equal(body.database.provider, "PostgreSQL / PostGIS");
  assert.ok(body.memory.heapUsedMb > 0);
  assert.ok(!("password" in body.database));
  assert.ok(!("url" in body.database));

  console.log("\n✅ Health endpoint live probe verified successfully!");
  await app.close();
}

run().catch((e) => {
  console.error("❌ Live health probe failed:", e);
  process.exit(1);
});

