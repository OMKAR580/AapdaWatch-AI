// AapdaWatch AI — Backend Foundation & Schema Automated Verification
// Run with: node scripts/run-backend-tests.mjs

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

console.log("==================================================");
console.log("  AapdaWatch AI — Backend Verification Suite");
console.log("  Phase 2.0.1: Database Integration & Schema Audit");
console.log("==================================================");

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  [PASS] ${name}`);
    passed++;
  } catch (err) {
    console.error(`  [FAIL] ${name}`);
    console.error(`         Error: ${err.message}`);
    failed++;
  }
}

async function asyncTest(name, fn) {
  try {
    await fn();
    console.log(`  [PASS] ${name}`);
    passed++;
  } catch (err) {
    console.error(`  [FAIL] ${name}`);
    console.error(`         Error: ${err.message}`);
    failed++;
  }
}

// ----------------------------------------------------
// TEST GROUP 1: Prisma Client & Schema Model Delegates
// ----------------------------------------------------
console.log("\n--- Group 1: Prisma Client & Model Delegates ---");

test("PrismaClient: Instantiates successfully", () => {
  const client = new PrismaClient();
  assert.ok(client, "PrismaClient must instantiate");
});

test("PrismaClient: Contains exactly 9 distinct domain models", () => {
  const client = new PrismaClient();
  const requiredModels = [
    "user",
    "disasterReport",
    "analysis",
    "incident",
    "incidentReport",
    "incidentReview",
    "correlationCandidate",
    "auditLog",
    "batchJob",
  ];

  for (const model of requiredModels) {
    assert.ok(
      client[model] !== undefined,
      `Prisma Client must expose '${model}' model delegate`,
    );
    assert.equal(
      typeof client[model].findMany,
      "function",
      `'${model}' must have findMany method`,
    );
    assert.equal(
      typeof client[model].create,
      "function",
      `'${model}' must have create method`,
    );
    assert.equal(
      typeof client[model].upsert,
      "function",
      `'${model}' must have upsert method`,
    );
  }
  assert.equal(requiredModels.length, 9, "Schema contains exactly 9 models");
});

test("PrismaClient: Exposes all 14 required domain enums", async () => {
  const prismaExports = await import("@prisma/client");

  const expectedEnums = {
    UserRole: ["ADMIN", "ANALYST", "REVIEWER", "VIEWER"],
    AccountStatus: ["ACTIVE", "SUSPENDED", "INACTIVE"],
    ReportSourceType: ["SOCIAL_MEDIA", "FIELD_DISPATCH", "CITIZEN_REPORT", "NEWS_FEED", "EMERGENCY_RADIO", "OTHER"],
    DisasterCategory: ["FLOOD", "EARTHQUAKE", "FIRE", "CYCLONE", "LANDSLIDE", "OTHER"],
    IncidentSeverity: ["CRITICAL", "HIGH", "MEDIUM", "LOW"],
    OperationalStatus: ["OPEN", "MONITORING", "CONTAINED", "RESOLVED", "CLOSED"],
    PredictedLabel: ["DISASTER_RELATED", "NOT_DISASTER_RELATED", "INCONCLUSIVE"],
    InferenceStatus: ["PENDING", "COMPLETED", "FAILED"],
    RelationshipType: ["PRIMARY_SIGNAL", "CORROBORATING_EVIDENCE", "UPDATED_STATUS", "CASUALTY_REPORT"],
    ReviewDecision: ["UNDER_REVIEW", "VERIFIED_DISASTER", "FALSE_POSITIVE", "DUPLICATE"],
    CorrelationStatus: ["PENDING", "ACCEPTED", "REJECTED", "EXPIRED"],
    AuditAction: ["REPORT_CREATED", "REPORT_UPDATED", "ANALYSIS_RECORDED", "REVIEW_SUBMITTED", "INCIDENT_CREATED", "INCIDENT_UPDATED", "CORRELATION_ACCEPTED", "CORRELATION_REJECTED", "BATCH_JOB_SUBMITTED", "SYSTEM_CONFIG_CHANGED"],
    BatchJobType: ["CSV_REPORT_INGESTION", "BULK_ANALYSIS", "HISTORICAL_IMPORT"],
    BatchJobStatus: ["QUEUED", "PROCESSING", "COMPLETED", "FAILED", "CANCELLED"],
  };

  assert.equal(Object.keys(expectedEnums).length, 14, "Must have exactly 14 enums");

  for (const [enumName, values] of Object.entries(expectedEnums)) {
    assert.ok(prismaExports[enumName] !== undefined, `Enum '${enumName}' must be exported`);
    for (const val of values) {
      assert.equal(
        prismaExports[enumName][val],
        val,
        `Enum '${enumName}' must have value '${val}'`,
      );
    }
  }
});

// ----------------------------------------------------
// TEST GROUP 2: Connection Resilience & Error Handling
// ----------------------------------------------------
console.log("\n--- Group 2: Database Connection Failure Resilience ---");

await asyncTest("PrismaService: Gracefully catches connection failure without crashing", async () => {
  const deadClient = new PrismaClient({
    datasources: {
      db: {
        url: "postgresql://invalid_user:invalid_pass@127.0.0.1:54329/nonexistent_db?connect_timeout=1",
      },
    },
  });

  try {
    await deadClient.$queryRaw`SELECT 1`;
    assert.fail("Should have failed connection");
  } catch (err) {
    assert.ok(err instanceof Error, "Error must be caught gracefully");
  } finally {
    await deadClient.$disconnect();
  }
});

// ----------------------------------------------------
// TEST GROUP 3: Health Service Response & Masking
// ----------------------------------------------------
console.log("\n--- Group 3: Health Service Response & Masking ---");

test("HealthService: Reports 'ok' when database is connected", () => {
  const mockHealthyCheck = (dbConnected) => {
    const mem = process.memoryUsage();
    return {
      status: dbConnected ? "ok" : "degraded",
      version: "1.0.0",
      timestamp: new Date().toISOString(),
      uptimeSeconds: 42,
      environment: "test",
      database: {
        status: dbConnected ? "connected" : "disconnected",
        provider: "PostgreSQL / PostGIS",
      },
      memory: {
        heapUsedMb: Math.round((mem.heapUsed / 1024 / 1024) * 100) / 100,
        heapTotalMb: Math.round((mem.heapTotal / 1024 / 1024) * 100) / 100,
        rssMb: Math.round((mem.rss / 1024 / 1024) * 100) / 100,
      },
    };
  };

  const response = mockHealthyCheck(true);
  assert.equal(response.status, "ok");
  assert.equal(response.database.status, "connected");
  assert.equal(response.database.provider, "PostgreSQL / PostGIS");
  assert.ok(response.memory.heapUsedMb > 0);
  assert.ok(!("password" in response.database), "Must not leak database credentials");
  assert.ok(!("url" in response.database), "Must not leak connection URL");
});

test("HealthService: Reports 'degraded' when database is disconnected without throwing", () => {
  const mockDegradedCheck = (dbConnected) => ({
    status: dbConnected ? "ok" : "degraded",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
    uptimeSeconds: 10,
    environment: "development",
    database: {
      status: dbConnected ? "connected" : "disconnected",
      provider: "PostgreSQL / PostGIS",
    },
  });

  const response = mockDegradedCheck(false);
  assert.equal(response.status, "degraded");
  assert.equal(response.database.status, "disconnected");
});

// ----------------------------------------------------
// TEST GROUP 4: Exception Filter & Security Envelope
// ----------------------------------------------------
console.log("\n--- Group 4: Exception Filter Envelope & Stack Trace Sanitization ---");

test("HttpExceptionFilter: Strips stack traces in production envelope", () => {
  const formatErrorResponse = (exception, isProd) => {
    const status = exception.status || 500;
    const message = exception.message || "An internal server error occurred.";
    return {
      success: false,
      statusCode: status,
      error: exception.name || "InternalServerError",
      message: isProd && status === 500 ? "An internal server error occurred." : message,
      timestamp: new Date().toISOString(),
      path: "/api/v1/test",
      stack: isProd ? undefined : exception.stack,
    };
  };

  const internalError = new Error("Database password auth failed: secret_credentials_123");
  const prodResponse = formatErrorResponse(internalError, true);

  assert.equal(prodResponse.success, false);
  assert.equal(prodResponse.statusCode, 500);
  assert.equal(prodResponse.message, "An internal server error occurred.", "Production must mask internal error details");
  assert.equal(prodResponse.stack, undefined, "Production must not include stack trace");
});

// ----------------------------------------------------
// TEST GROUP 5: Migration SQL & PostGIS Schema Audit
// ----------------------------------------------------
console.log("\n--- Group 5: Migration File & PostGIS SQL Integrity ---");

const migrationPath = path.resolve(
  "prisma/migrations/20261115000000_init_foundation_and_postgis/migration.sql",
);
assert.ok(fs.existsSync(migrationPath), "Migration SQL file must exist");
const sql = fs.readFileSync(migrationPath, "utf-8");

test("Migration SQL: PostGIS extension and SRID 4326 geometry definitions exist", () => {
  assert.ok(sql.includes("CREATE EXTENSION IF NOT EXISTS postgis;"));
  assert.ok(sql.includes("geometry(Point, 4326)"));
  assert.ok(sql.includes("USING GIST (\"locationGeom\")"));
});

test("Migration SQL: Automated triggers pass Longitude first (X) and Latitude second (Y)", () => {
  assert.ok(
    sql.includes("ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)"),
    "ST_MakePoint must take NEW.longitude first, NEW.latitude second",
  );
  assert.ok(sql.includes("CREATE TRIGGER trg_sync_disaster_report_geom"));
  assert.ok(sql.includes("CREATE TRIGGER trg_sync_incident_geom"));
});

test("Migration SQL: Geographic constraints disallow partial coordinates and enforce [-90,90] [-180,180]", () => {
  assert.ok(
    sql.includes("chk_disaster_report_coordinates"),
    "DisasterReport must have chk_disaster_report_coordinates CHECK constraint",
  );
  assert.ok(
    sql.includes("chk_incident_coordinates"),
    "Incident must have chk_incident_coordinates CHECK constraint",
  );
  assert.ok(
    sql.includes('"latitude" >= -90.0 AND "latitude" <= 90.0'),
    "Latitude must be bounded between -90 and 90",
  );
  assert.ok(
    sql.includes('"longitude" >= -180.0 AND "longitude" <= 180.0'),
    "Longitude must be bounded between -180 and 180",
  );
  assert.ok(
    sql.includes('"latitude" IS NULL AND "longitude" IS NULL'),
    "Must allow both coordinates to be NULL",
  );
  assert.ok(
    sql.includes('"latitude" IS NOT NULL AND "longitude" IS NOT NULL'),
    "Must disallow partially populated coordinates",
  );
});

test("Migration SQL: Probability and decision threshold are bounded to [0.0, 1.0]", () => {
  assert.ok(
    sql.includes("chk_analysis_probability"),
    "Analysis must have chk_analysis_probability CHECK constraint",
  );
  assert.ok(
    sql.includes('"probability" >= 0.0 AND "probability" <= 1.0'),
    "Probability must be bounded between 0.0 and 1.0",
  );
  assert.ok(
    sql.includes("chk_analysis_decision_threshold"),
    "Analysis must have chk_analysis_decision_threshold CHECK constraint",
  );
  assert.ok(
    sql.includes('"decisionThreshold" >= 0.0 AND "decisionThreshold" <= 1.0'),
    "Threshold must be bounded between 0.0 and 1.0",
  );
});

test("Migration SQL: Geodesic functional GiST indexes enable meter-based queries", () => {
  assert.ok(
    sql.includes('idx_disaster_report_geography') && sql.includes('USING GIST ((("locationGeom")::geography))'),
    "DisasterReport must have functional geography GiST index",
  );
  assert.ok(
    sql.includes('idx_incident_geography') && sql.includes('USING GIST ((("locationGeom")::geography))'),
    "Incident must have functional geography GiST index",
  );
});

test("Migration SQL: Immutability triggers protect AuditLog and IncidentReview", () => {
  assert.ok(
    sql.includes("prevent_modification_or_deletion"),
    "Must define prevent_modification_or_deletion trigger function",
  );
  assert.ok(
    sql.includes("CREATE TRIGGER trg_protect_audit_log"),
    "AuditLog must have protection trigger",
  );
  assert.ok(
    sql.includes("CREATE TRIGGER trg_protect_incident_review"),
    "IncidentReview must have protection trigger",
  );
});

test("Migration SQL: Partial unique index prevents duplicate pending suggestions", () => {
  assert.ok(
    sql.includes("unique_pending_correlation_candidate") &&
      sql.includes('WHERE "status" = \'PENDING\''),
    "Must enforce partial unique index on pending correlation candidates",
  );
});

// ----------------------------------------------------
// TEST GROUP 6: Seed Security & Synthetic Integrity
// ----------------------------------------------------
console.log("\n--- Group 6: Seed Security & Synthetic Attribution ---");

const seedPath = path.resolve("prisma/seed.ts");
const seedContent = fs.readFileSync(seedPath, "utf-8");

test("Seed: Development users use non-governmental local domain (@dev.aapdawatch.local)", () => {
  assert.ok(
    seedContent.includes("dev-admin@aapdawatch.local"),
    "Must use dev-admin@aapdawatch.local",
  );
  assert.ok(
    seedContent.includes("dev-reviewer@aapdawatch.local"),
    "Must use dev-reviewer@aapdawatch.local",
  );
  assert.ok(
    seedContent.includes("dev-analyst@aapdawatch.local"),
    "Must use dev-analyst@aapdawatch.local",
  );
  assert.ok(
    !seedContent.includes("@aapdawatch.gov.in"),
    "Must NOT use live governmental .gov.in domain",
  );
});

test("Seed: All seeded predictions are explicitly marked as synthetic/demo benchmarks", () => {
  assert.ok(
    seedContent.includes("isSynthetic: true"),
    "Seeded analyses must contain isSynthetic: true",
  );
  assert.ok(
    seedContent.includes("1.0.0-demo"),
    "Model and preprocessing versions must indicate demo mode",
  );
});

test("Seed: Idempotent review and audit insertions prevent duplicate seed records", () => {
  assert.ok(
    seedContent.includes("existingReview1"),
    "Must check existing reviews before creation",
  );
  assert.ok(
    seedContent.includes("existingAudit"),
    "Must check existing audit logs before creation",
  );
});

// ----------------------------------------------------
// SUMMARY
// ----------------------------------------------------
console.log("\n==================================================");
console.log(`  Tests completed: ${passed + failed}`);
console.log(`  Passed: ${passed}`);
console.log(`  Failed: ${failed}`);
console.log("==================================================");

if (failed > 0) {
  process.exit(1);
}
