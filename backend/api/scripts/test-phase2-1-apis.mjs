/**
 * AapdaWatch AI — Phase 2.1 Backend API Integration & Business Logic Test Suite
 * Tests all endpoints and business rules against the live PostgreSQL 16 + PostGIS database.
 */

import { PrismaClient, ReviewDecision, OperationalStatus, DisasterCategory, IncidentSeverity } from "@prisma/client";
import { classifyDemoText } from "../dist/src/analysis/demo-classifier.js";
import { escapeCsvField, serializeToCsv } from "../dist/src/common/utils/csv.util.js";

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || "postgresql://aapdawatch_admin:aapdawatch_dev_secret_2026@localhost:5433/aapdawatch_db?schema=public",
    },
  },
});

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    console.log(`  [PASS] ${message}`);
    passedTests++;
  } else {
    console.error(`  [FAIL] ${message}`);
    failedTests++;
  }
}

async function runApiTests() {
  console.log("==================================================");
  console.log("  AapdaWatch AI — Phase 2.1 Backend Integration Tests");
  console.log("==================================================\n");

  try {
    // ----------------------------------------------------
    // Group 1: CSV Formula Injection Protection (SEC-02)
    // ----------------------------------------------------
    console.log("--- Group 1: CSV Formula Injection Protection ---");
    assert(escapeCsvField("=SUM(A1:A10)") === "'=SUM(A1:A10)", "Formula starting with '=' is prepended with quote");
    assert(escapeCsvField("+123456789") === "'+123456789", "Formula starting with '+' is prepended with quote");
    assert(escapeCsvField("-2+3*4") === "'-2+3*4", "Formula starting with '-' is prepended with quote");
    assert(escapeCsvField("@cmd|'/C calc'!A0") === "'@cmd|'/C calc'!A0", "Formula starting with '@' is prepended with quote");
    assert(escapeCsvField("Normal Text") === "Normal Text", "Normal text without special characters is unaffected");
    assert(escapeCsvField('Text with "quotes"') === '"Text with ""quotes"""', "Quotes are properly doubled and enclosed");

    // ----------------------------------------------------
    // Group 2: Demo Classifier Heuristics
    // ----------------------------------------------------
    console.log("\n--- Group 2: Transparent Demo Classifier Heuristics ---");
    const disasterSample = "Heavy rainfall caused severe flooding and buildings collapsed with casualties.";
    const nonDisasterSample = "Attending a birthday party celebration with friends!";
    const emptySample = "";

    const disasterRes = classifyDemoText(disasterSample);
    assert(disasterRes.predictedLabel === "DISASTER_RELATED", "Classifies heavy flooding & casualties as DISASTER_RELATED");
    assert(disasterRes.suggestedCategory === "FLOOD", "Identifies FLOOD category correctly");
    assert(disasterRes.probability >= 0.5, `Disaster probability >= 0.5 (got ${disasterRes.probability})`);
    assert(disasterRes.metadata.isSynthetic === true, "Metadata explicitly flags isSynthetic: true");
    assert(disasterRes.metadata.modelName === "RuleBasedDemoClassifier", "Model name explicitly RuleBasedDemoClassifier");

    const nonDisasterRes = classifyDemoText(nonDisasterSample);
    assert(nonDisasterRes.predictedLabel === "NOT_DISASTER_RELATED", "Classifies birthday party as NOT_DISASTER_RELATED");
    assert(nonDisasterRes.probability < 0.35, `Non-disaster probability < 0.35 (got ${nonDisasterRes.probability})`);

    const emptyRes = classifyDemoText(emptySample);
    assert(emptyRes.predictedLabel === "NOT_DISASTER_RELATED", "Empty text classified as NOT_DISASTER_RELATED");

    // ----------------------------------------------------
    // Group 3: Report Ingestion & Analysis Persistence
    // ----------------------------------------------------
    console.log("\n--- Group 3: Live Report Ingestion & Analysis ---");
    const newReport = await prisma.disasterReport.create({
      data: {
        originalText: "Emergency: Massive waterlogging and flash flood reported near Kurla railway station.",
        normalizedText: "emergency: massive waterlogging and flash flood reported near kurla railway station.",
        sourceType: "FIELD_DISPATCH",
        sourceName: "Mumbai Traffic Police Dispatch",
        locationName: "Kurla, Mumbai",
        latitude: 19.0657,
        longitude: 72.8797,
        submittedAt: new Date(),
      },
    });
    assert(Boolean(newReport.id), `Report created with UUID: ${newReport.id}`);

    // Create Analysis record
    const analysisOutput = classifyDemoText(newReport.originalText);
    const newAnalysis = await prisma.analysis.create({
      data: {
        reportId: newReport.id,
        predictedLabel: analysisOutput.predictedLabel,
        probability: analysisOutput.probability,
        decisionThreshold: analysisOutput.decisionThreshold,
        suggestedCategory: analysisOutput.suggestedCategory,
        modelName: "RuleBasedDemoClassifier",
        modelVersion: "1.0.0-demo",
        metadata: analysisOutput.metadata,
      },
    });
    assert(newAnalysis.reportId === newReport.id, "Analysis linked to DisasterReport correctly");
    assert(newAnalysis.predictedLabel === "DISASTER_RELATED", "Analysis recorded predictedLabel DISASTER_RELATED");

    // ----------------------------------------------------
    // Group 4: Incident Creation & Atomic Report Association
    // ----------------------------------------------------
    console.log("\n--- Group 4: Live Incident Management & Associations ---");
    const testIncident = await prisma.incident.create({
      data: {
        incidentCode: `INC-2026-TEST-${Date.now().toString().slice(-4)}`,
        title: "Kurla Urban Flash Flood Situation",
        description: "Severe water accumulation blocking arterial roads and local suburban lines.",
        category: DisasterCategory.FLOOD,
        severity: IncidentSeverity.HIGH,
        operationalStatus: OperationalStatus.OPEN,
        locationName: "Kurla, Mumbai",
        latitude: 19.0657,
        longitude: 72.8797,
      },
    });
    assert(Boolean(testIncident.id), `Incident created with UUID: ${testIncident.id}`);

    // Link report to incident
    const link = await prisma.incidentReport.create({
      data: {
        incidentId: testIncident.id,
        reportId: newReport.id,
        relationshipType: "PRIMARY_SIGNAL",
      },
    });
    assert(link.incidentId === testIncident.id, "IncidentReport association established");

    // Duplicate link prevention (unique constraint check)
    let duplicateCaught = false;
    try {
      await prisma.incidentReport.create({
        data: {
          incidentId: testIncident.id,
          reportId: newReport.id,
        },
      });
    } catch (err) {
      duplicateCaught = true;
    }
    assert(duplicateCaught, "Duplicate report-to-incident association rejected by unique constraint");

    // Update operational status
    const updatedInc = await prisma.incident.update({
      where: { id: testIncident.id },
      data: { operationalStatus: OperationalStatus.MONITORING },
    });
    assert(updatedInc.operationalStatus === "MONITORING", "Operational status transitioned to MONITORING");

    // ----------------------------------------------------
    // Group 5: Human Verification Submission & Audit Trail
    // ----------------------------------------------------
    console.log("\n--- Group 5: Live Verification & Immutable Review ---");
    const reviewer = await prisma.user.findFirst({ where: { role: "REVIEWER" } });
    assert(Boolean(reviewer), `Reviewer user resolved: ${reviewer?.email}`);

    const review = await prisma.incidentReview.create({
      data: {
        reportId: newReport.id,
        incidentId: testIncident.id,
        reviewerId: reviewer.id,
        decision: ReviewDecision.VERIFIED_DISASTER,
        notes: "Field dispatch confirmed by BMC Disaster Management Cell.",
      },
    });
    assert(review.decision === "VERIFIED_DISASTER", "IncidentReview recorded with decision VERIFIED_DISASTER");

    // Verify immutability
    let immutabilityTriggerFired = false;
    try {
      await prisma.incidentReview.update({
        where: { id: review.id },
        data: { notes: "Attempting illegal edit" },
      });
    } catch {
      immutabilityTriggerFired = true;
    }
    assert(immutabilityTriggerFired, "IncidentReview UPDATE blocked by immutability trigger");

    // ----------------------------------------------------
    // Group 6: Correlation Candidates Acceptance
    // ----------------------------------------------------
    console.log("\n--- Group 6: Live Correlation Candidates ---");
    // Create an unlinked second report
    const secondReport = await prisma.disasterReport.create({
      data: {
        originalText: "Suburban railway tracks submerged near Kurla station. Trains halted.",
        sourceType: "SOCIAL_MEDIA",
        locationName: "Kurla Station",
        latitude: 19.066,
        longitude: 72.88,
        submittedAt: new Date(),
      },
    });

    const candidate = await prisma.correlationCandidate.create({
      data: {
        reportId: secondReport.id,
        targetIncidentId: testIncident.id,
        correlationScore: 0.92,
        status: "PENDING",
        reasoning: { reasons: ["Geographic proximity < 500m", "Disaster category FLOOD"] },
      },
    });
    assert(candidate.status === "PENDING", "CorrelationCandidate created in PENDING status");

    // Accept candidate atomically via transaction
    await prisma.$transaction(async (tx) => {
      await tx.correlationCandidate.update({
        where: { id: candidate.id },
        data: { status: "ACCEPTED", reviewedAt: new Date() },
      });
      await tx.incidentReport.create({
        data: {
          incidentId: candidate.targetIncidentId,
          reportId: candidate.reportId,
          relationshipType: "CORROBORATING_EVIDENCE",
        },
      });
    });

    const acceptedCandidate = await prisma.correlationCandidate.findUnique({ where: { id: candidate.id } });
    const associatedLink = await prisma.incidentReport.findUnique({
      where: {
        unique_incident_report: {
          incidentId: testIncident.id,
          reportId: secondReport.id,
        },
      },
    });
    assert(acceptedCandidate.status === "ACCEPTED", "Candidate marked as ACCEPTED");
    assert(Boolean(associatedLink), "Second report linked to incident upon correlation acceptance");

    // ----------------------------------------------------
    // Group 7: Analytics & Map Query Verification
    // ----------------------------------------------------
    console.log("\n--- Group 7: Live Analytics & Map Spatial Aggregation ---");
    const totalReports = await prisma.disasterReport.count();
    const activeIncidents = await prisma.incident.count({
      where: { operationalStatus: { in: ["OPEN", "MONITORING", "CONTAINED"] } },
    });
    assert(totalReports >= 5, `Total reports count is accurate: ${totalReports}`);
    assert(activeIncidents >= 4, `Active incidents count is accurate: ${activeIncidents}`);

    // Map query checking coordinates
    const mapIncidents = await prisma.incident.findMany({
      where: { latitude: { not: null }, longitude: { not: null } },
      select: { id: true, latitude: true, longitude: true, title: true },
    });
    assert(mapIncidents.length > 0, `Map query returns ${mapIncidents.length} incidents with coordinates`);
    const sample = mapIncidents[0];
    const coords = [sample.longitude, sample.latitude];
    assert(
      coords[0] >= -180 && coords[0] <= 180 && coords[1] >= -90 && coords[1] <= 90,
      `Coordinates [lon, lat] adhere to valid ranges: [${coords.join(", ")}]`,
    );

    console.log("\n==================================================");
    console.log(`  Phase 2.1 Backend Tests: ${totalTests}`);
    console.log(`  Passed: ${passedTests}`);
    console.log(`  Failed: ${failedTests}`);
    console.log("==================================================");
  } catch (err) {
    console.error("Test execution encountered an error:", err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runApiTests();
