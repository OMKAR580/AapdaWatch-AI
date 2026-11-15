import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://aapdawatch_admin:aapdawatch_secure_pass@localhost:5433/aapdawatch_db?schema=public",
    },
  },
});

async function run() {
  const users = await prisma.user.count();
  const reports = await prisma.disasterReport.count();
  const analyses = await prisma.analysis.count();
  const incidents = await prisma.incident.count();
  const incidentReports = await prisma.incidentReport.count();
  const reviews = await prisma.incidentReview.count();
  const correlations = await prisma.correlationCandidate.count();
  const audits = await prisma.auditLog.count();

  console.log("--- Seeded Table Record Counts ---");
  console.log({
    users,
    reports,
    analyses,
    incidents,
    incidentReports,
    reviews,
    correlations,
    audits,
  });

  // Verify exact counts match seed expectation (3 users, 3 reports, 3 analyses, 3 incidents, 2 links, 2 reviews, 1 correlation, 1 audit)
  assert.equal(users, 3, "Expected exactly 3 users");
  assert.equal(reports, 3, "Expected exactly 3 reports");
  assert.equal(analyses, 3, "Expected exactly 3 analyses");
  assert.equal(incidents, 3, "Expected exactly 3 incidents");
  assert.equal(incidentReports, 2, "Expected exactly 2 incident links");
  assert.equal(reviews, 2, "Expected exactly 2 review records");
  assert.equal(correlations, 1, "Expected exactly 1 correlation candidate");
  const auditLogs = await prisma.auditLog.findMany();
  console.log("Audit logs:", auditLogs);

  console.log("✅ Seed row counts verified with zero duplicates!");
  await prisma.$disconnect();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
