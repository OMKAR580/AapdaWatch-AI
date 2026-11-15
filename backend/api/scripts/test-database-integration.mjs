// Live Database Integration Verification for Phase 2.0.1
// Executes against PostgreSQL 16 + PostGIS 3.4 on localhost:5433

import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || "postgresql://aapdawatch_admin:aapdawatch_secure_pass@localhost:5433/aapdawatch_db?schema=public",
    },
  },
});

console.log("==================================================");
console.log("  AapdaWatch AI — Live DB Integration Test Suite");
console.log("==================================================");

let passed = 0;
let failed = 0;

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

try {
  // ----------------------------------------------------
  // TEST GROUP 1: Engine Versions
  // ----------------------------------------------------
  console.log("\n--- Group 1: PostgreSQL & PostGIS Engine Versions ---");

  await asyncTest("PostgreSQL: Running version 16+", async () => {
    const res = await prisma.$queryRaw`SELECT version();`;
    const ver = res[0].version;
    console.log(`         Version: ${ver.split(" on ")[0]}`);
    assert.ok(ver.includes("PostgreSQL 16"), `Expected PG 16, got: ${ver}`);
  });

  await asyncTest("PostGIS: Extension enabled and running version 3.4+", async () => {
    const res = await prisma.$queryRaw`SELECT PostGIS_Full_Version() as ver;`;
    const ver = res[0].ver;
    console.log(`         PostGIS: ${ver.split(" [EXTENSION]")[0]}`);
    assert.ok(ver.includes("POSTGIS=\"3.4"), `Expected PostGIS 3.4, got: ${ver}`);
  });

  // ----------------------------------------------------
  // TEST GROUP 2: Tables, Enums & Columns
  // ----------------------------------------------------
  console.log("\n--- Group 2: Tables, Enums, and Column Types ---");

  await asyncTest("Tables: All 9 domain tables exist in public schema", async () => {
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE' AND table_name NOT IN ('_prisma_migrations', 'spatial_ref_sys');
    `;
    const tableNames = tables.map((t) => t.table_name).sort();
    const expected = [
      "Analysis",
      "AuditLog",
      "BatchJob",
      "CorrelationCandidate",
      "DisasterReport",
      "Incident",
      "IncidentReport",
      "IncidentReview",
      "User",
    ].sort();
    assert.deepEqual(tableNames, expected);
  });

  await asyncTest("Enums: All 14 custom domain enum types exist", async () => {
    const enums = await prisma.$queryRaw`
      SELECT typname FROM pg_type WHERE typcategory = 'E' ORDER BY typname;
    `;
    const enumNames = enums.map((e) => e.typname);
    const expectedEnums = [
      "AccountStatus",
      "AuditAction",
      "BatchJobStatus",
      "BatchJobType",
      "CorrelationStatus",
      "DisasterCategory",
      "IncidentSeverity",
      "InferenceStatus",
      "OperationalStatus",
      "PredictedLabel",
      "RelationshipType",
      "ReportSourceType",
      "ReviewDecision",
      "UserRole",
    ];
    for (const exp of expectedEnums) {
      assert.ok(enumNames.includes(exp), `Enum ${exp} must exist in database`);
    }
  });

  await asyncTest("Spatial Columns: locationGeom has geometry(Point, 4326) type", async () => {
    const geomCols = await prisma.$queryRaw`
      SELECT f_table_name, f_geometry_column, srid, type 
      FROM geometry_columns 
      WHERE f_table_name IN ('DisasterReport', 'Incident');
    `;
    assert.equal(geomCols.length, 2, "Both DisasterReport and Incident must register geometry columns");
    for (const col of geomCols) {
      assert.equal(col.f_geometry_column, "locationGeom");
      assert.equal(col.srid, 4326, "SRID must be 4326");
      assert.equal(col.type, "POINT", "Geometry type must be Point");
    }
  });

  await asyncTest("Spatial Indexes: GiST indexes exist for geometry and geography", async () => {
    const indexes = await prisma.$queryRaw`
      SELECT indexname, indexdef 
      FROM pg_indexes 
      WHERE schemaname = 'public' AND (indexname LIKE '%location_geom%' OR indexname LIKE '%geography%');
    `;
    const indexNames = indexes.map((i) => i.indexname);
    assert.ok(indexNames.includes("idx_disaster_report_location_geom"), "Geometry GiST index on DisasterReport");
    assert.ok(indexNames.includes("idx_incident_location_geom"), "Geometry GiST index on Incident");
    assert.ok(indexNames.includes("idx_disaster_report_geography"), "Geography GiST index on DisasterReport");
    assert.ok(indexNames.includes("idx_incident_geography"), "Geography GiST index on Incident");
  });

  await asyncTest("Triggers: Automated coordinate sync & immutability triggers exist", async () => {
    const triggers = await prisma.$queryRaw`
      SELECT trigger_name, event_manipulation, event_object_table 
      FROM information_schema.triggers 
      WHERE trigger_schema = 'public';
    `;
    const triggerNames = triggers.map((t) => t.trigger_name);
    assert.ok(triggerNames.includes("trg_sync_disaster_report_geom"), "Sync trigger for DisasterReport");
    assert.ok(triggerNames.includes("trg_sync_incident_geom"), "Sync trigger for Incident");
    assert.ok(triggerNames.includes("trg_protect_audit_log"), "Protection trigger for AuditLog");
    assert.ok(triggerNames.includes("trg_protect_incident_review"), "Protection trigger for IncidentReview");
  });

  // ----------------------------------------------------
  // TEST GROUP 3: PostGIS Trigger Verification
  // ----------------------------------------------------
  console.log("\n--- Group 3: PostGIS Trigger Execution & Coordinate Sync ---");

  let testReportId = null;
  let testIncidentId = null;

  await asyncTest("Trigger Insert: Longitude is X, Latitude is Y in generated Point", async () => {
    // Insert test report at Mumbai: Lat 19.0760, Lon 72.8777
    const result = await prisma.$queryRaw`
      INSERT INTO "DisasterReport" (
        "id", "originalText", "sourceType", "submittedAt", "latitude", "longitude"
      ) VALUES (
        gen_random_uuid(), 'Test flood report for spatial trigger test', 'SOCIAL_MEDIA', NOW(), 19.0760, 72.8777
      ) RETURNING "id", "latitude", "longitude", ST_AsText("locationGeom") as wkt, ST_X("locationGeom") as x_lon, ST_Y("locationGeom") as y_lat;
    `;
    const row = result[0];
    testReportId = row.id;

    assert.equal(row.wkt, "POINT(72.8777 19.076)");
    assert.equal(Number(row.x_lon.toFixed(4)), 72.8777, "X coordinate must be longitude");
    assert.equal(Number(row.y_lat.toFixed(4)), 19.0760, "Y coordinate must be latitude");
  });

  await asyncTest("Trigger Update: Updating latitude and longitude updates geometry", async () => {
    // Update to Kutch: Lat 23.2420, Lon 69.6669
    const result = await prisma.$queryRaw`
      UPDATE "DisasterReport"
      SET "latitude" = 23.2420, "longitude" = 69.6669
      WHERE "id" = ${testReportId}::uuid
      RETURNING ST_AsText("locationGeom") as wkt, ST_X("locationGeom") as x_lon, ST_Y("locationGeom") as y_lat;
    `;
    const row = result[0];
    assert.equal(row.wkt, "POINT(69.6669 23.242)");
    assert.equal(Number(row.x_lon.toFixed(4)), 69.6669);
    assert.equal(Number(row.y_lat.toFixed(4)), 23.2420);
  });

  await asyncTest("Trigger Nullify: Setting coordinates to NULL sets locationGeom to NULL", async () => {
    const result = await prisma.$queryRaw`
      UPDATE "DisasterReport"
      SET "latitude" = NULL, "longitude" = NULL
      WHERE "id" = ${testReportId}::uuid
      RETURNING ST_AsText("locationGeom") as wkt;
    `;
    assert.equal(result[0].wkt, null);
  });

  await asyncTest("Check Constraint: Rejects partial coordinates (lat populated, lon null)", async () => {
    try {
      await prisma.$executeRaw`
        INSERT INTO "DisasterReport" (
          "id", "originalText", "sourceType", "submittedAt", "latitude", "longitude"
        ) VALUES (
          gen_random_uuid(), 'Invalid partial coordinate', 'SOCIAL_MEDIA', NOW(), 19.0, NULL
        );
      `;
      assert.fail("Should have failed check constraint");
    } catch (err) {
      assert.ok(err.message.includes("chk_disaster_report_coordinates"));
    }
  });

  await asyncTest("Check Constraint: Rejects out-of-range coordinates (latitude > 90)", async () => {
    try {
      await prisma.$executeRaw`
        INSERT INTO "DisasterReport" (
          "id", "originalText", "sourceType", "submittedAt", "latitude", "longitude"
        ) VALUES (
          gen_random_uuid(), 'Invalid latitude', 'SOCIAL_MEDIA', NOW(), 95.0, 72.0
        );
      `;
      assert.fail("Should have failed check constraint");
    } catch (err) {
      assert.ok(err.message.includes("chk_disaster_report_coordinates"));
    }
  });

  await asyncTest("Trigger Incident: Verified identical sync behavior on Incident table", async () => {
    const result = await prisma.$queryRaw`
      INSERT INTO "Incident" (
        "id", "incidentCode", "title", "description", "category", "severity", "operationalStatus", "locationName", "latitude", "longitude"
      ) VALUES (
        gen_random_uuid(), 'INC-TEST-001', 'Test Incident', 'Spatial verification test', 'FLOOD', 'CRITICAL', 'OPEN', 'Mumbai', 18.9220, 72.8347
      ) RETURNING "id", ST_AsText("locationGeom") as wkt;
    `;
    testIncidentId = result[0].id;
    assert.equal(result[0].wkt, "POINT(72.8347 18.922)");
  });

  // ----------------------------------------------------
  // TEST GROUP 4: Spatial Distance Semantics
  // ----------------------------------------------------
  console.log("\n--- Group 4: Spatial Distance Semantics (Meters vs Degrees) ---");

  await asyncTest("Geodesic Proximity: ST_DWithin with geography cast accurately uses meters", async () => {
    // Gateway of India: Lat 18.9220, Lon 72.8347
    // Marine Drive: Lat 18.9438, Lon 72.8234 (Approx 2.7 km away = 2700 meters)
    // Nariman Point: Lat 18.9260, Lon 72.8230 (Approx 1.3 km away = 1300 meters)

    // Test 1: Within 3000 meters (3km) -> should MATCH
    const matchResults = await prisma.$queryRaw`
      SELECT "id", "incidentCode", 
        ST_Distance("locationGeom"::geography, ST_SetSRID(ST_MakePoint(72.8234, 18.9438), 4326)::geography) as dist_meters
      FROM "Incident"
      WHERE "id" = ${testIncidentId}::uuid
        AND ST_DWithin("locationGeom"::geography, ST_SetSRID(ST_MakePoint(72.8234, 18.9438), 4326)::geography, 3000);
    `;
    assert.equal(matchResults.length, 1);
    const dist = matchResults[0].dist_meters;
    console.log(`         Calculated distance: ${Math.round(dist)} meters`);
    assert.ok(dist > 2000 && dist < 3000, `Expected ~2600m, got ${dist}`);

    // Test 2: Within 1000 meters (1km) -> should NOT MATCH
    const noMatchResults = await prisma.$queryRaw`
      SELECT "id" FROM "Incident"
      WHERE "id" = ${testIncidentId}::uuid
        AND ST_DWithin("locationGeom"::geography, ST_SetSRID(ST_MakePoint(72.8234, 18.9438), 4326)::geography, 1000);
    `;
    assert.equal(noMatchResults.length, 0, "Distance > 1000m must return 0 records");
  });

  // ----------------------------------------------------
  // TEST GROUP 5: Immutability & Business Check Constraints
  // ----------------------------------------------------
  console.log("\n--- Group 5: Immutability Triggers & Business Constraints ---");

  await asyncTest("AuditLog Immutability: Rejects UPDATE or DELETE operations", async () => {
    // Create an audit log
    const auditRes = await prisma.$queryRaw`
      INSERT INTO "AuditLog" ("id", "action", "entityType", "entityId", "createdAt")
      VALUES (gen_random_uuid(), 'SYSTEM_CONFIG_CHANGED', 'TestEntity', '123', NOW())
      RETURNING "id";
    `;
    const auditId = auditRes[0].id;

    // Try to update
    try {
      await prisma.$executeRaw`
        UPDATE "AuditLog" SET "entityType" = 'Hacked' WHERE "id" = ${auditId}::uuid;
      `;
      assert.fail("Should have blocked UPDATE");
    } catch (err) {
      assert.ok(err.message.includes("Immutable record violation"));
    }

    // Try to delete
    try {
      await prisma.$executeRaw`
        DELETE FROM "AuditLog" WHERE "id" = ${auditId}::uuid;
      `;
      assert.fail("Should have blocked DELETE");
    } catch (err) {
      assert.ok(err.message.includes("Immutable record violation"));
    }
  });

  await asyncTest("Analysis Probability Constraint: Rejects probability > 1.0 or < 0.0", async () => {
    try {
      await prisma.$executeRaw`
        INSERT INTO "Analysis" (
          "id", "reportId", "predictedLabel", "probability", "decisionThreshold", "modelName", "modelVersion", "preprocessingVersion", "inferenceStatus", "createdAt"
        ) VALUES (
          gen_random_uuid(), ${testReportId}::uuid, 'DISASTER_RELATED', 1.45, 0.35, 'BiLSTM', '1.0', '1.0', 'COMPLETED', NOW()
        );
      `;
      assert.fail("Should have rejected probability > 1.0");
    } catch (err) {
      assert.ok(err.message.includes("chk_analysis_probability"));
    }
  });

  // Cleanup test rows
  await prisma.$executeRaw`DELETE FROM "DisasterReport" WHERE "id" = ${testReportId}::uuid;`;
  await prisma.$executeRaw`DELETE FROM "Incident" WHERE "id" = ${testIncidentId}::uuid;`;

} finally {
  await prisma.$disconnect();
}

console.log("\n==================================================");
console.log(`  Live Integration Tests: ${passed + failed}`);
console.log(`  Passed: ${passed}`);
console.log(`  Failed: ${failed}`);
console.log("==================================================");

if (failed > 0) {
  process.exit(1);
}
