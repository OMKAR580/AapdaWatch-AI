/**
 * Live HTTP probe script testing running NestJS endpoints on port 3001.
 */
import { spawn } from "child_process";

async function probeHttp() {
  console.log("🚀 Starting NestJS server for live HTTP verification...");

  const server = spawn("node", ["dist/src/main.js"], {
    cwd: "E:\\NLP\\aapdawatch-ai\\backend\\api",
    env: { ...process.env, PORT: "3001" },
    stdio: ["ignore", "pipe", "pipe"],
  });

  server.stdout.on("data", (data) => {
    const text = data.toString();
    if (text.includes("Nest application successfully started")) {
      console.log("✅ NestJS started successfully!");
    }
  });

  server.stderr.on("data", (data) => {
    // console.error("ERR:", data.toString());
  });

  // Wait 4 seconds for NestJS to bootstrap
  await new Promise((r) => setTimeout(r, 4000));

  let passed = 0;
  let failed = 0;

  async function checkEndpoint(name, url, method = "GET", body = null) {
    try {
      const opts = { method, headers: { "Content-Type": "application/json" } };
      if (body) opts.body = JSON.stringify(body);
      const res = await fetch(url, opts);
      const json = await res.json();
      if (res.status >= 200 && res.status < 300 && json.success !== false) {
        console.log(`  [PASS] ${name}: HTTP ${res.status}`);
        passed++;
        return json;
      } else {
        console.error(`  [FAIL] ${name}: HTTP ${res.status}`, json);
        failed++;
        return null;
      }
    } catch (err) {
      console.error(`  [FAIL] ${name}: ${err.message}`);
      failed++;
      return null;
    }
  }

  try {
    console.log("\n--- Probing REST Endpoints ---");
    await checkEndpoint("Health", "http://localhost:3001/api/v1/health");
    await checkEndpoint("Analytics Overview", "http://localhost:3001/api/v1/analytics/overview");
    await checkEndpoint("Analytics Categories", "http://localhost:3001/api/v1/analytics/categories");
    await checkEndpoint("Analytics Timeline", "http://localhost:3001/api/v1/analytics/timeline?range=7d");
    await checkEndpoint("Map Incidents", "http://localhost:3001/api/v1/map/incidents");
    await checkEndpoint("Incidents List", "http://localhost:3001/api/v1/incidents?limit=5");
    await checkEndpoint("Reports List", "http://localhost:3001/api/v1/reports?limit=5");
    await checkEndpoint("Verification List", "http://localhost:3001/api/v1/verification");
    await checkEndpoint("Correlation Candidates", "http://localhost:3001/api/v1/correlation/candidates");

    // Test creating a report via HTTP
    const createRes = await checkEndpoint("Create Report", "http://localhost:3001/api/v1/reports", "POST", {
      text: "HTTP probe test: Heavy rain reported in Chembur colony.",
      sourceType: "CITIZEN_REPORT",
      locationName: "Chembur, Mumbai",
      latitude: 19.06,
      longitude: 72.89,
    });

    if (createRes && createRes.data?.id) {
      const reportId = createRes.data.id;
      await checkEndpoint("Analyze Report", `http://localhost:3001/api/v1/analysis/${reportId}`, "POST");
      await checkEndpoint("Get Analysis", `http://localhost:3001/api/v1/analysis/${reportId}`);
      await checkEndpoint("Submit Review", `http://localhost:3001/api/v1/verification/${reportId}/review`, "POST", {
        decision: "UNDER_REVIEW",
        notes: "HTTP probe verified initial ingest status",
      });
    }

    console.log("\n==================================================");
    console.log(`  Live HTTP Probes: ${passed + failed}`);
    console.log(`  Passed: ${passed}`);
    console.log(`  Failed: ${failed}`);
    console.log("==================================================");
  } finally {
    server.kill();
  }
}

probeHttp();

