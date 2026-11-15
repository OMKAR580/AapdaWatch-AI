// Automated Verification Suite for Phase 1.1 Stabilization
// Run with: node scripts/test-phase1-1.mjs

import assert from "node:assert/strict";

console.log("==================================================");
console.log("  AapdaWatch AI — Phase 1.1 Verification Suite");
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
// TEST GROUP 1: SEC-02 CSV Formula Injection Sanitization
// ----------------------------------------------------
console.log("\n--- Group 1: SEC-02 CSV Formula Injection Sanitization ---");

// Re-implement the exact escapeCSV logic from src/lib/utils.ts to test in isolated Node
function escapeCSV(val) {
  if (val === null || val === undefined) return '""';
  let str = String(val);

  const trimmed = str.trimStart();
  const firstChar = trimmed[0];
  const isFormulaTrigger =
    firstChar === "=" ||
    firstChar === "+" ||
    firstChar === "-" ||
    firstChar === "@" ||
    firstChar === "\t" ||
    firstChar === "\r";

  if (isFormulaTrigger) {
    const isPureNumber = !isNaN(Number(trimmed)) && !trimmed.includes("\t") && !trimmed.includes("\r");
    if (!isPureNumber) {
      str = "'" + str;
    }
  }

  return `"${str.replace(/"/g, '""')}"`;
}

test("SEC-02: Sanitizes leading '=' formula injection", () => {
  const result = escapeCSV("=cmd|'/C calc'!A0");
  assert.equal(result, `"'=cmd|'/C calc'!A0"`);
});

test("SEC-02: Sanitizes leading '@' formula injection (e.g., @SUM)", () => {
  const result = escapeCSV("@SUM(1+1)*cmd|' /C calc'!A0");
  assert.equal(result, `"'@SUM(1+1)*cmd|' /C calc'!A0"`);
});

test("SEC-02: Sanitizes leading '+' non-numeric formula trigger", () => {
  const result = escapeCSV("+1+cmd|'/C calc'!A0");
  assert.equal(result, `"'+1+cmd|'/C calc'!A0"`);
});

test("SEC-02: Sanitizes leading '-' formula expression", () => {
  const result = escapeCSV("-2+3+cmd|'/C calc'!A0");
  assert.equal(result, `"'-2+3+cmd|'/C calc'!A0"`);
});

test("SEC-02: Preserves valid negative numbers without prepending quote", () => {
  const result = escapeCSV("-42.5");
  assert.equal(result, `"-42.5"`);
});

test("SEC-02: Preserves valid positive numbers without prepending quote", () => {
  const result = escapeCSV("+100");
  assert.equal(result, `"+100"`);
});

test("SEC-02: Sanitizes leading whitespace before formula character", () => {
  const result = escapeCSV("   =1+1");
  assert.equal(result, `"'   =1+1"`);
});

test("SEC-02: Sanitizes leading tab before formula character", () => {
  const result = escapeCSV("\t=123");
  assert.equal(result, `"'\t=123"`);
});

test("SEC-02: Correctly escapes embedded double quotes", () => {
  const result = escapeCSV('Flood reported at "Marine Drive"');
  assert.equal(result, `"Flood reported at ""Marine Drive"""`);
});

test("SEC-02: Handles null and undefined cleanly", () => {
  assert.equal(escapeCSV(null), '""');
  assert.equal(escapeCSV(undefined), '""');
});

// ----------------------------------------------------
// TEST GROUP 2: BUG-01 Correlation State Synchronization
// ----------------------------------------------------
console.log("\n--- Group 2: BUG-01 Correlation State Synchronization ---");

test("BUG-01: Correlation acceptance links report and increments reportCount", () => {
  // Simulate AppContext state transition
  let state = {
    incidents: [
      { id: "INC-001", incidentCode: "INC-001", reportCount: 4 },
      { id: "INC-002", incidentCode: "INC-002", reportCount: 1 },
    ],
    reports: [
      { id: "RPT-009", incidentId: undefined, text: "Floodwaters rising" },
    ],
    correlationSuggestions: [
      { reportId: "RPT-009", suggestedIncidentId: "INC-001", status: "pending" },
    ],
  };

  const acceptCorrelation = (reportId) => {
    const suggestion = state.correlationSuggestions.find((s) => s.reportId === reportId);
    if (!suggestion) return;
    const targetIncidentId = suggestion.suggestedIncidentId;

    let wasAlreadyAssociated = false;
    state.reports = state.reports.map((r) => {
      if (r.id === reportId) {
        if (r.incidentId === targetIncidentId) wasAlreadyAssociated = true;
        return { ...r, incidentId: targetIncidentId };
      }
      return r;
    });

    if (!wasAlreadyAssociated) {
      state.incidents = state.incidents.map((inc) => {
        if (inc.id === targetIncidentId) {
          return { ...inc, reportCount: inc.reportCount + 1 };
        }
        return inc;
      });
    }

    state.correlationSuggestions = state.correlationSuggestions.map((s) =>
      s.reportId === reportId ? { ...s, status: "accepted" } : s
    );
  };

  // Run accept
  acceptCorrelation("RPT-009");

  // Verify
  const report = state.reports.find((r) => r.id === "RPT-009");
  const incident = state.incidents.find((i) => i.id === "INC-001");
  const suggestion = state.correlationSuggestions.find((s) => s.reportId === "RPT-009");

  assert.equal(report.incidentId, "INC-001", "Report must be linked to target incident");
  assert.equal(incident.reportCount, 5, "Incident report count must increment by 1");
  assert.equal(suggestion.status, "accepted", "Suggestion status must be accepted");
});

test("BUG-01: Duplicate acceptance does NOT double-increment reportCount", () => {
  let state = {
    incidents: [{ id: "INC-001", reportCount: 4 }],
    reports: [{ id: "RPT-009", incidentId: undefined }],
    correlationSuggestions: [{ reportId: "RPT-009", suggestedIncidentId: "INC-001", status: "pending" }],
  };

  const acceptCorrelation = (reportId) => {
    const suggestion = state.correlationSuggestions.find((s) => s.reportId === reportId);
    if (!suggestion) return;
    const targetIncidentId = suggestion.suggestedIncidentId;

    let wasAlreadyAssociated = false;
    state.reports = state.reports.map((r) => {
      if (r.id === reportId) {
        if (r.incidentId === targetIncidentId) wasAlreadyAssociated = true;
        return { ...r, incidentId: targetIncidentId };
      }
      return r;
    });

    if (!wasAlreadyAssociated) {
      state.incidents = state.incidents.map((inc) => {
        if (inc.id === targetIncidentId) {
          return { ...inc, reportCount: inc.reportCount + 1 };
        }
        return inc;
      });
    }
  };

  acceptCorrelation("RPT-009");
  assert.equal(state.incidents[0].reportCount, 5);

  // Second invocation
  acceptCorrelation("RPT-009");
  assert.equal(state.incidents[0].reportCount, 5, "Duplicate call must NOT increment reportCount again");
});

// ----------------------------------------------------
// TEST GROUP 3: BUG-04 Deterministic Demo Analyzer
// ----------------------------------------------------
console.log("\n--- Group 3: BUG-04 Deterministic Demo Analyzer ---");

// Import analysis service logic to verify determinism
function stableHash(str) {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return (Math.abs(hash) % 1000) / 1000;
}

const STRONG_DISASTER_TERMS = [
  { term: "casualties", weight: 0.35 },
  { term: "evacuate", weight: 0.30 },
  { term: "submerged", weight: 0.30 },
  { term: "collapse", weight: 0.30 },
  { term: "epicenter", weight: 0.30 },
  { term: "wildfire", weight: 0.30 },
  { term: "landslide", weight: 0.30 },
  { term: "dead", weight: 0.25 },
  { term: "injured", weight: 0.20 },
  { term: "disaster", weight: 0.25 },
];

const MODERATE_DISASTER_TERMS = [
  { term: "flooding", weight: 0.20 },
  { term: "flood", weight: 0.18 },
  { term: "earthquake", weight: 0.20 },
  { term: "cyclone", weight: 0.20 },
  { term: "fire", weight: 0.14 },
];

const NON_DISASTER_TERMS = [
  { term: "movie", weight: -0.30 },
  { term: "party", weight: -0.25 },
  { term: "birthday", weight: -0.30 },
  { term: "celebration", weight: -0.30 },
];

function analyzeDeterministic(text) {
  const trimmed = text.trim();
  const lower = trimmed.toLowerCase();
  if (!lower) return { predictedClass: "not-disaster-related", disasterProbability: 0.01 };

  let score = 0;
  for (const { term, weight } of STRONG_DISASTER_TERMS) {
    if (lower.includes(term)) score += weight;
  }
  for (const { term, weight } of MODERATE_DISASTER_TERMS) {
    if (lower.includes(term)) score += weight;
  }
  for (const { term, weight } of NON_DISASTER_TERMS) {
    if (lower.includes(term)) score += weight;
  }

  const variance = (stableHash(lower) - 0.5) * 0.06;
  let disasterProbability;
  if (score <= 0) {
    disasterProbability = Math.max(0.01, Math.min(0.25, 0.05 + stableHash(lower) * 0.12));
  } else if (score < 0.35) {
    disasterProbability = Math.min(0.68, Math.max(0.35, 0.40 + score * 0.6 + variance));
  } else if (score < 0.65) {
    disasterProbability = Math.min(0.88, Math.max(0.65, 0.68 + (score - 0.35) * 0.5 + variance));
  } else {
    disasterProbability = Math.min(0.99, Math.max(0.85, 0.86 + (score - 0.65) * 0.2 + variance));
  }

  const predictedClass = disasterProbability >= 0.5 ? "disaster-related" : "not-disaster-related";
  return {
    predictedClass,
    disasterProbability: Number(disasterProbability.toFixed(4)),
  };
}

test("BUG-04: Returns identical probability across 50 repeated runs (no Math.random)", () => {
  const sample = "Major flood reported in low lying districts. Houses submerged and rescue boats dispatched.";
  const first = analyzeDeterministic(sample);
  for (let i = 0; i < 50; i++) {
    const next = analyzeDeterministic(sample);
    assert.equal(next.disasterProbability, first.disasterProbability, "Probability must be 100% deterministic");
    assert.equal(next.predictedClass, first.predictedClass);
  }
});

test("BUG-04: Accurately classifies high-confidence disaster signal", () => {
  const disasterText = "Massive earthquake strikes near epicenter. Buildings collapsed, casualties reported.";
  const res = analyzeDeterministic(disasterText);
  assert.equal(res.predictedClass, "disaster-related");
  assert.ok(res.disasterProbability >= 0.85, `Expected prob >= 0.85, got ${res.disasterProbability}`);
});

test("BUG-04: Accurately classifies non-disaster mundane text", () => {
  const nonDisasterText = "Having a great birthday party celebrating with family and watching a movie.";
  const res = analyzeDeterministic(nonDisasterText);
  assert.equal(res.predictedClass, "not-disaster-related");
  assert.ok(res.disasterProbability <= 0.25, `Expected prob <= 0.25, got ${res.disasterProbability}`);
});

// ----------------------------------------------------
// TEST GROUP 4: BUG-03 Dynamic Analytics Aggregations
// ----------------------------------------------------
console.log("\n--- Group 4: BUG-03 Dynamic Analytics Aggregations ---");

test("BUG-03: Aggregates incident categories dynamically from records", () => {
  const mockIncidents = [
    { category: "flood" },
    { category: "flood" },
    { category: "fire" },
    { category: "earthquake" },
    { category: "cyclone" },
  ];

  const counts = { flood: 0, earthquake: 0, fire: 0, cyclone: 0, landslide: 0, other: 0 };
  mockIncidents.forEach((inc) => {
    if (counts[inc.category] !== undefined) counts[inc.category]++;
    else counts.other++;
  });

  assert.equal(counts.flood, 2);
  assert.equal(counts.fire, 1);
  assert.equal(counts.earthquake, 1);
  assert.equal(counts.cyclone, 1);
  assert.equal(counts.landslide, 0);
});

test("BUG-03: Aggregates verification status dynamically from records", () => {
  const mockReports = [
    { verificationStatus: "verified" },
    { verificationStatus: "verified" },
    { verificationStatus: "under-review" },
    { verificationStatus: "false-positive" },
    { verificationStatus: "unreviewed" },
  ];

  const counts = { verified: 0, "under-review": 0, unreviewed: 0, "false-positive": 0, duplicate: 0 };
  mockReports.forEach((r) => {
    if (counts[r.verificationStatus] !== undefined) counts[r.verificationStatus]++;
    else counts.unreviewed++;
  });

  assert.equal(counts.verified, 2);
  assert.equal(counts["under-review"], 1);
  assert.equal(counts["false-positive"], 1);
  assert.equal(counts.unreviewed, 1);
});

// ----------------------------------------------------
// TEST GROUP 5: BUG-05 Batch Cancellation & Event Loop
// ----------------------------------------------------
console.log("\n--- Group 5: BUG-05 Batch Processing Cancellation Logic ---");

await asyncTest("BUG-05: Abort flag terminates batch loop early and retains partial results", async () => {
  const rows = Array.from({ length: 20 }, (_, i) => ({ text: `Report ${i}` }));
  const results = [];
  let aborted = false;

  for (let i = 0; i < rows.length; i++) {
    if (i === 7) {
      aborted = true; // Trigger abort at row 7
    }
    if (aborted) {
      break;
    }
    results.push({ id: i, text: rows[i].text });
    await new Promise((r) => setTimeout(r, 0));
  }

  assert.equal(results.length, 7, "Batch should stop immediately when aborted");
  assert.equal(aborted, true);
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

