/**
 * Read-only script testing PostGIS query planning and GiST index selection.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || "postgresql://aapdawatch_admin:aapdawatch_secure_pass@localhost:5433/aapdawatch_db?schema=public",
    },
  },
});

async function main() {
  console.log("=== PostGIS Spatial Index & Query Plan Verification ===\n");

  const countRes = await prisma.incident.count();
  console.log(`Current Incident table row count: ${countRes}`);

  // 1. Check Index existence in pg_indexes
  const indexes = await prisma.$queryRaw`
    SELECT indexname, indexdef 
    FROM pg_indexes 
    WHERE tablename = 'Incident' AND indexname LIKE '%geog%';
  `;
  console.log("\nIndexed Definition in PostgreSQL catalog:");
  console.log(indexes);

  // 2. Default planner EXPLAIN (ANALYZE, BUFFERS)
  console.log("\n--- Default Query Plan (enable_seqscan = ON, default planner) ---");
  const planDefault = await prisma.$queryRaw`
    EXPLAIN (ANALYZE, BUFFERS)
    SELECT id, "incidentCode", "title"
    FROM "Incident"
    WHERE "locationGeom" IS NOT NULL
      AND ST_DWithin(
        ("locationGeom")::geography,
        ST_SetSRID(ST_MakePoint(72.8777, 19.076), 4326)::geography,
        50000
      );
  `;
  planDefault.forEach((p) => console.log(" ", p["QUERY PLAN"]));

  // 3. Test if index is structurally matchable (when sequential scan cost is not artificially cheap due to tiny table)
  console.log("\n--- Plan with enable_seqscan = OFF (Testing Index Matchability) ---");
  const planWithIndex = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SET LOCAL enable_seqscan = off;`;
    const plan = await tx.$queryRaw`
      EXPLAIN (ANALYZE, BUFFERS)
      SELECT id, "incidentCode", "title"
      FROM "Incident"
      WHERE "locationGeom" IS NOT NULL
        AND ST_DWithin(
          ("locationGeom")::geography,
          ST_SetSRID(ST_MakePoint(72.8777, 19.076), 4326)::geography,
          50000
        );
    `;
    return plan;
  });
  planWithIndex.forEach((p) => console.log(" ", p["QUERY PLAN"]));

  await prisma.$disconnect();
}

main().catch(console.error);

