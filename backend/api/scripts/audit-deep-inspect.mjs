/**
 * Read-only deep inspection script for Audit 4, 5, 6, 7.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || "postgresql://aapdawatch_admin:aapdawatch_secure_pass@localhost:5433/aapdawatch_db?schema=public",
    },
  },
});

async function inspect() {
  console.log("=== AapdaWatch AI Deep Read-Only Inspection ===\n");

  // 1. Check Analysis records metadata
  console.log("--- 1. Analysis Records Verification ---");
  const analyses = await prisma.analysis.findMany({
    take: 5,
    orderBy: { createdAt: "desc" },
    include: { report: { select: { id: true, originalText: true } } },
  });
  analyses.forEach((a) => {
    console.log(`Analysis: ${a.id}`);
    console.log(`  Report: ${a.reportId} -> "${a.report?.originalText.slice(0, 50)}..."`);
    console.log(`  Label: ${a.predictedLabel}, Prob: ${a.probability}, Threshold: ${a.decisionThreshold}`);
    console.log(`  Model: ${a.modelName} (v${a.modelVersion})`);
    console.log(`  Metadata:`, JSON.stringify(a.metadata));
  });

  // 2. Check IncidentReport associations and report count consistency
  console.log("\n--- 2. Incident & Report Count Integrity ---");
  const incidents = await prisma.incident.findMany({
    include: {
      _count: { select: { incidentReports: true } },
      incidentReports: { select: { reportId: true } },
    },
  });
  incidents.forEach((inc) => {
    const actualLinks = inc.incidentReports.length;
    console.log(`Incident: ${inc.incidentCode} (${inc.title})`);
    console.log(`  Actual DB Links: ${actualLinks}, _count: ${inc._count.incidentReports}`);
    console.log(`  Location: ${inc.locationName} [${inc.longitude}, ${inc.latitude}]`);
  });

  // 3. Check AuditLog records
  console.log("\n--- 3. AuditLog Sample (Append-Only) ---");
  const audits = await prisma.auditLog.findMany({
    take: 5,
    orderBy: { createdAt: "desc" },
    include: { actor: { select: { email: true, role: true } } },
  });
  audits.forEach((au) => {
    console.log(`Audit: ${au.id} | Action: ${au.action} | Entity: ${au.entityType}:${au.entityId} | Actor: ${au.actor?.email || "SYSTEM"}`);
  });

  // 4. Check Correlation candidates
  console.log("\n--- 4. Correlation Candidates Lifecycle ---");
  const candidates = await prisma.correlationCandidate.findMany({
    include: { targetIncident: { select: { incidentCode: true } } },
  });
  candidates.forEach((c) => {
    console.log(`Candidate: ${c.id} | Status: ${c.status} | Score: ${c.correlationScore} | Target: ${c.targetIncident.incidentCode}`);
  });

  // 5. Check Spatial Points in PostGIS
  console.log("\n--- 5. PostGIS LocationGeom WKT Points ---");
  const points = await prisma.$queryRaw`
    SELECT id, "incidentCode", "locationName", ST_AsText("locationGeom") as geom_wkt, longitude, latitude
    FROM "Incident"
    WHERE "locationGeom" IS NOT NULL
    LIMIT 3;
  `;
  console.log(points);

  await prisma.$disconnect();
}

inspect().catch(console.error);

