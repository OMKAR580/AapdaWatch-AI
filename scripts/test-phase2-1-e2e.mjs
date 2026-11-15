/**
 * AapdaWatch AI — Phase 2.1 End-to-End Full-Stack Verification Suite
 * Verifies live workflows against running NestJS REST API and PostgreSQL database.
 */

const API_BASE = "http://localhost:3001/api/v1";

async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`HTTP ${res.status}: ${err}`);
  }
  const json = await res.json();
  return json.data !== undefined ? json.data : json;
}

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

async function runE2ETests() {
  console.log("==================================================");
  console.log("  AapdaWatch AI — Phase 2.1 E2E Full-Stack Verification");
  console.log("==================================================\n");

  try {
    // ----------------------------------------------------
    // Workflow A: Report Ingestion to Analysis
    // ----------------------------------------------------
    console.log("--- Workflow A: Report Ingestion to Analysis ---");
    const testText = "E2E Test: Major landslide blocking NH-58 near Rishikesh. Several passenger vehicles stranded.";
    const report = await request("/reports", {
      method: "POST",
      body: JSON.stringify({
        text: testText,
        sourceType: "FIELD_DISPATCH",
        sourceName: "Uttarakhand Disaster Management Authority Dispatch",
        locationName: "Rishikesh, Uttarakhand",
        latitude: 30.0869,
        longitude: 78.2676,
      }),
    });
    assert(Boolean(report && report.id), `Report persisted in PostgreSQL with UUID: ${report.id}`);

    const analysis = await request(`/analysis/${report.id}`, { method: "POST" });
    assert(analysis.reportId === report.id, "Analysis generated and linked to DisasterReport");
    assert(analysis.predictedClass === "disaster-related", "Correctly predicted disaster-related");
    assert(analysis.suggestedCategory === "landslide", "Correctly identified LANDSLIDE category");
    assert(Boolean(analysis.note), "Contains demo notice labeling transparent rule-based heuristic");

    const fetchedReport = await request(`/reports/${report.id}`);
    assert(fetchedReport.text === testText, "Retrieved report text matches original submission");
    assert(fetchedReport.predictedClass === "disaster-related", "Retrieved report carries classification");

    // ----------------------------------------------------
    // Workflow B: Incident Management & Report Association
    // ----------------------------------------------------
    console.log("\n--- Workflow B: Incident Management & Report Association ---");
    const incident = await request("/incidents", {
      method: "POST",
      body: JSON.stringify({
        title: "Rishikesh NH-58 Landslide & Highway Blockade",
        description: "Massive debris obstructing highway corridor. Heavy machinery dispatched for clearance.",
        category: "LANDSLIDE",
        severity: "HIGH",
        locationName: "Rishikesh, Uttarakhand",
        latitude: 30.0869,
        longitude: 78.2676,
        operationalStatus: "OPEN",
      }),
    });
    assert(Boolean(incident && incident.id), `Incident dossier registered with UUID: ${incident.id}`);
    assert(incident.incidentCode.startsWith("INC-"), `Incident code generated: ${incident.incidentCode}`);

    // Associate report with incident
    await request(`/incidents/${incident.id}/reports`, {
      method: "POST",
      body: JSON.stringify({ reportId: report.id, relationshipType: "PRIMARY_SIGNAL" }),
    });
    const incidentDossier = await request(`/incidents/${incident.id}`);
    assert(incidentDossier.reportCount >= 1, `Incident report count accurately incremented: ${incidentDossier.reportCount}`);
    assert(incidentDossier.reports.some((r) => r.id === report.id), "Associated report present in incident dossier");

    // Update status to MONITORING
    const updatedStatus = await request(`/incidents/${incident.id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status: "MONITORING" }),
    });
    assert(updatedStatus.operationalStatus === "MONITORING", "Operational status transitioned to MONITORING");

    // ----------------------------------------------------
    // Workflow C: Human-in-the-Loop Verification
    // ----------------------------------------------------
    console.log("\n--- Workflow C: Human-in-the-Loop Verification ---");
    const pendingList = await request("/verification");
    assert(Array.isArray(pendingList), `Verification queue retrieved (${pendingList.length} items)`);

    const reviewRes = await request(`/verification/${report.id}/review`, {
      method: "POST",
      body: JSON.stringify({
        decision: "VERIFIED_DISASTER",
        notes: "E2E verification corroborated via State Emergency Operations Center feed.",
        incidentId: incident.id,
      }),
    });
    assert(reviewRes.success === true, "Verification review submitted successfully");

    const history = await request(`/verification/${report.id}/history`);
    assert(history.length >= 1, `Review audit history recorded (${history.length} decision entries)`);
    assert(history[0].decision === "VERIFIED_DISASTER", "Latest review decision is VERIFIED_DISASTER");

    // Check report status reflection
    const verifiedReport = await request(`/reports/${report.id}`);
    assert(verifiedReport.verificationStatus === "verified", "Report verificationStatus reflects 'verified'");

    // ----------------------------------------------------
    // Workflow D: Analytics & Spatial Map
    // ----------------------------------------------------
    console.log("\n--- Workflow D: Analytics & Spatial Map ---");
    const overview = await request("/analytics/overview");
    assert(overview.totalReports >= 5, `Analytics overview reports total count: ${overview.totalReports}`);
    assert(overview.activeIncidents >= 1, `Analytics overview reports active incidents: ${overview.activeIncidents}`);

    const categories = await request("/analytics/categories");
    assert(categories.data.length > 0, `Category distribution returned ${categories.data.length} categories`);
    const landslideCat = categories.data.find((c) => c.category === "landslide");
    assert(Boolean(landslideCat && landslideCat.count >= 1), `Landslide category count recorded: ${landslideCat?.count}`);

    const mapIncidents = await request("/map/incidents");
    assert(mapIncidents.length >= 1, `Map incidents retrieved: ${mapIncidents.length}`);
    const mappedTarget = mapIncidents.find((m) => m.id === incident.id);
    assert(Boolean(mappedTarget), "Newly created incident present in map layer");
    assert(
      Array.isArray(mappedTarget.coordinates) &&
        mappedTarget.coordinates[0] === 78.2676 &&
        mappedTarget.coordinates[1] === 30.0869,
      `Map coordinates [lon, lat] adhere strictly to PostGIS standard: [${mappedTarget?.coordinates?.join(", ")}]`,
    );

    console.log("\n==================================================");
    console.log(`  E2E Workflows Completed: ${totalTests}`);
    console.log(`  Passed: ${passedTests}`);
    console.log(`  Failed: ${failedTests}`);
    console.log("==================================================");
  } catch (err) {
    console.error("E2E Test execution failed:", err);
    process.exit(1);
  }
}

runE2ETests();
