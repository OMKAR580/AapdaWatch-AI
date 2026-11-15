/**
 * Phase 3.3 End-to-End Integration Test Suite
 * Tests NestJS API <-> FastAPI BiLSTM Neural Microservice communication
 */

import { spawn } from "child_process";
import http from "http";

const API_BASE = "http://127.0.0.1:3001/api/v1";
const ML_BASE = "http://127.0.0.1:8001";

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function request(url, options = {}) {
  const resp = await fetch(url, options);
  const text = await resp.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {}
  return { status: resp.status, ok: resp.ok, text, json };
}

async function main() {
  console.log("=================================================================");
  console.log("  AapdaWatch AI — Phase 3.3 Functional Integration Test Suite");
  console.log("=================================================================\n");

  let passed = 0;
  let total = 0;

  function assert(condition, message) {
    total++;
    if (condition) {
      console.log(`  [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${message}`);
    }
  }

  // 1. Verify FastAPI BiLSTM Health
  console.log("1. Verifying FastAPI BiLSTM microservice (Port 8001)...");
  const mlHealth = await request(`${ML_BASE}/health`);
  assert(mlHealth.status === 200, `FastAPI /health returns HTTP 200 (Got ${mlHealth.status})`);
  assert(mlHealth.json?.model_loaded === true, "FastAPI reports model_loaded === true");
  assert(mlHealth.json?.runtime_readiness === "READY", "FastAPI reports runtime_readiness === 'READY'");

  const mlInfo = await request(`${ML_BASE}/model/info`);
  assert(mlInfo.status === 200, "FastAPI /model/info returns HTTP 200");
  assert(mlInfo.json?.model_name === "AapdaWatch_BiLSTM", "Model name is AapdaWatch_BiLSTM");
  assert(mlInfo.json?.decision_threshold === 0.35, "Decision threshold is strictly 0.35");
  assert(mlInfo.json?.vocabulary_size === 13965, "Vocabulary size is 13,965");

  // 2. Start NestJS Backend
  console.log("\n2. Starting NestJS Backend (Port 3001)...");
  const nestProc = spawn("node", ["dist/src/main.js"], {
    cwd: "E:\\NLP\\aapdawatch-ai\\backend\\api",
    stdio: "pipe",
    env: { ...process.env, PORT: "3001" },
  });

  let nestReady = false;
  for (let i = 0; i < 30; i++) {
    await sleep(1000);
    try {
      const h = await request(`${API_BASE}/health`);
      if (h.status === 200) {
        nestReady = true;
        break;
      }
    } catch {}
  }

  assert(nestReady, "NestJS backend booted and responded on port 3001");

  try {
    // 3. Test Batch Neural Inference (NestJS -> FastAPI BiLSTM)
    console.log("\n3. Testing Vectorized Batch Inference (/analysis/batch)...");
    const batchPayload = {
      items: [
        {
          text: "Massive flash floods inundated several residential sectors in Guwahati following intense monsoon cloudburst.",
          requestId: "req-disaster-1",
        },
        {
          text: "Enjoying a peaceful sunny morning coffee at the terrace garden with friends.",
          requestId: "req-clean-1",
        },
        {
          text: "High intensity earthquake tremors felt across district; buildings shook and cracked.",
          requestId: "req-disaster-2",
        },
      ],
    };

    const batchRes = await request(`${API_BASE}/analysis/batch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(batchPayload),
    });

    const data = batchRes.json?.data || batchRes.json;

    assert(batchRes.status === 200, `POST /analysis/batch returns HTTP 200 (Got ${batchRes.status})`);
    assert(data?.totalItems === 3, `Batch response contains exactly 3 items (Got ${data?.totalItems})`);
    assert(data?.modelName === "AapdaWatch_BiLSTM", `Batch processed by AapdaWatch_BiLSTM (Got ${data?.modelName})`);

    const preds = data?.predictions || [];
    assert(preds.length === 3, "Returned 3 predictions");

    // Flood text
    const p1 = preds.find((p) => p.requestId === "req-disaster-1");
    assert(p1 && p1.predictedClass === "disaster-related", `Item 1 predicted disaster-related (Prob: ${p1?.probability})`);
    assert(p1 && p1.suggestedCategory === "flood", `Item 1 suggestedCategory is 'flood'`);
    assert(p1 && p1.isSynthetic === false, "Item 1 isSynthetic === false (Real Neural Inference)");

    // Neutral text
    const p2 = preds.find((p) => p.requestId === "req-clean-1");
    assert(p2 && p2.isSynthetic === false, "Item 2 isSynthetic === false");

    // Earthquake text
    const p3 = preds.find((p) => p.requestId === "req-disaster-2");
    assert(p3 && p3.predictedClass === "disaster-related", `Item 3 predicted disaster-related (Prob: ${p3?.probability})`);
    assert(p3 && p3.suggestedCategory === "earthquake", `Item 3 suggestedCategory is 'earthquake'`);

    // 4. Test Input Validation & Edge Cases
    console.log("\n4. Testing Input Validation & Error Handling...");
    const emptyBatch = await request(`${API_BASE}/analysis/batch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: [] }),
    });
    assert(emptyBatch.status === 400, `Empty batch items rejected with HTTP 400 (Got ${emptyBatch.status})`);

    const invalidItem = await request(`${API_BASE}/analysis/batch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: [{ text: "" }] }),
    });
    assert(invalidItem.status === 400, `Blank item text rejected with HTTP 400 (Got ${invalidItem.status})`);

    console.log("\n=================================================================");
    console.log(`  Tests Executed: ${total} | Passed: ${passed} | Failed: ${total - passed}`);
    console.log(`  Final Result: ${passed === total ? "ALL TESTS PASSED" : "TEST FAILURES DETECTED"}`);
    console.log("=================================================================\n");
  } finally {
    nestProc.kill("SIGKILL");
  }
}

main().catch((err) => {
  console.error("Test runner error:", err);
  process.exit(1);
});
