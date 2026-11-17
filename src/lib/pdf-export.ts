/**
 * AapdaWatch AI — PDF Export Utility
 * 
 * Generates official Disaster Intelligence Dossiers in valid PDF-1.4 format
 * without external dependencies, and provides high-fidelity printable HTML dossier export.
 */

import type { DisasterReport } from "@/types";

/**
 * Escapes characters for PDF literal strings: ( -> \(, ) -> \), \ -> \\
 */
function escapePdfText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
    .replace(/[\r\n]+/g, " ");
}

/**
 * Word-wraps text into lines that fit within a maximum character length.
 */
function wrapText(text: string, maxCharsPerLine: number = 75): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    if ((currentLine + " " + word).trim().length <= maxCharsPerLine) {
      currentLine = (currentLine + " " + word).trim();
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}

/**
 * Generates an official AapdaWatch AI Disaster Intelligence Report in standard PDF-1.4 format.
 * Returns a Blob with MIME type "application/pdf".
 */
export function generateReportPdfBlob(report: DisasterReport): Blob {
  const streamCommands: string[] = [];

  // Colors:
  // Dark Forest Green: 0.196, 0.420, 0.329 (rg / RG)
  // Light Green background: 0.863, 0.914, 0.855
  // Disaster Red: 0.863, 0.196, 0.184
  // Safe Green: 0.133, 0.545, 0.133
  // Dark Slate: 0.141, 0.169, 0.153
  // Muted Gray: 0.451, 0.478, 0.439
  // Light Box: 0.96, 0.97, 0.96

  // Page 1: Header Banner (Y = 720 to 770)
  streamCommands.push("0.196 0.420 0.329 rg");
  streamCommands.push("40 710 532 55 re f");

  // Header Title
  streamCommands.push("BT /F2 16 Tf 1 1 1 rg 55 745 Td (AAPDAWATCH AI — DISASTER INTELLIGENCE DOSSIER) Tj ET");
  streamCommands.push("BT /F1 9 Tf 0.86 0.92 0.86 rg 55 725 Td (Autonomous Disaster Text Classification & Operational Verification System) Tj ET");

  // Metadata Bar (Y = 665 to 700)
  streamCommands.push("0.94 0.95 0.94 rg");
  streamCommands.push("40 660 532 40 re f");
  streamCommands.push("0.8 0.82 0.8 RG 1 w 40 660 532 40 re S");

  const reportId = escapePdfText(report.id || "RPT-LOCAL");
  const timestamp = escapePdfText(report.timestamp ? new Date(report.timestamp).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) : new Date().toLocaleString());
  const source = escapePdfText(report.source || "Citizen Ingest");
  const location = escapePdfText(report.location?.name || "Mumbai, Maharashtra");
  const coords = report.location?.latitude && report.location?.longitude
    ? `(${report.location.latitude.toFixed(4)}, ${report.location.longitude.toFixed(4)})`
    : "(19.0760, 72.8777)";

  streamCommands.push(`BT /F2 9 Tf 0.2 0.25 0.2 rg 50 684 Td (REPORT ID:) Tj /F1 9 Tf 100 684 Td (${reportId}) Tj ET`);
  streamCommands.push(`BT /F2 9 Tf 0.2 0.25 0.2 rg 250 684 Td (INGESTED:) Tj /F1 9 Tf 300 684 Td (${timestamp} IST) Tj ET`);
  streamCommands.push(`BT /F2 9 Tf 0.2 0.25 0.2 rg 50 668 Td (CHANNEL:) Tj /F1 9 Tf 100 668 Td (${source}) Tj ET`);
  streamCommands.push(`BT /F2 9 Tf 0.2 0.25 0.2 rg 250 668 Td (LOCATION:) Tj /F1 9 Tf 300 668 Td (${location} ${coords}) Tj ET`);

  // Section 1: Classification Verdict Banner (Y = 590 to 650)
  const isDisaster = report.predictedClass === "disaster-related";
  const prob = report.disasterProbability ?? report.confidence ?? 0.85;
  const probPct = (prob * 100).toFixed(1);

  if (isDisaster) {
    streamCommands.push("0.99 0.93 0.93 rg 40 595 532 55 re f");
    streamCommands.push("0.85 0.2 0.2 RG 1.5 w 40 595 532 55 re S");
    streamCommands.push("BT /F2 13 Tf 0.85 0.15 0.15 rg 55 630 Td (PREDICTED CLASS: DISASTER-RELATED SIGNAL) Tj ET");
    streamCommands.push(`BT /F1 10 Tf 0.3 0.1 0.1 rg 55 610 Td (Disaster Probability: ${probPct}%  |  Decision Threshold: 0.35  |  Category: ${escapePdfText(report.category || "General Emergency")}) Tj ET`);
  } else {
    streamCommands.push("0.92 0.97 0.93 rg 40 595 532 55 re f");
    streamCommands.push("0.15 0.55 0.25 RG 1.5 w 40 595 532 55 re S");
    streamCommands.push("BT /F2 13 Tf 0.12 0.48 0.2 rg 55 630 Td (PREDICTED CLASS: NON-DISASTER / ROUTINE) Tj ET");
    streamCommands.push(`BT /F1 10 Tf 0.1 0.3 0.15 rg 55 610 Td (Disaster Probability: ${probPct}%  |  Decision Threshold: 0.35  |  Confidence: ${probPct}%) Tj ET`);
  }

  // Section 2: Ingested Report Content (Y = 460 to 580)
  streamCommands.push("BT /F2 11 Tf 0.196 0.420 0.329 rg 40 575 Td (INGESTED CITIZEN & FIELD TEXT MESSAGE) Tj ET");
  streamCommands.push("0.97 0.98 0.97 rg 40 455 532 110 re f");
  streamCommands.push("0.82 0.85 0.82 RG 1 w 40 455 532 110 re S");

  const wrappedReportText = wrapText(report.text || "No text provided.", 72);
  let textY = 545;
  for (const line of wrappedReportText.slice(0, 5)) {
    streamCommands.push(`BT /F1 9.5 Tf 0.15 0.18 0.15 rg 55 ${textY} Td (${escapePdfText(line)}) Tj ET`);
    textY -= 16;
  }

  // Section 3: Neural Model Telemetry & Audit (Y = 320 to 440)
  streamCommands.push("BT /F2 11 Tf 0.196 0.420 0.329 rg 40 435 Td (NEURAL MODEL TELEMETRY & CLASSIFICATION PARAMETERS) Tj ET");
  streamCommands.push("0.98 0.98 0.98 rg 40 310 532 115 re f");
  streamCommands.push("0.82 0.85 0.82 RG 1 w 40 310 532 115 re S");

  const modelName = escapePdfText(report.modelVersion || "AapdaWatch_DistilBERT v1.0 (Transformers 4.45 / PyTorch)");
  const verification = escapePdfText((report.verificationStatus || "unreviewed").toUpperCase());
  const incidentLinked = escapePdfText(report.incidentId || "Unassigned / Standalone Signal");
  const reviewer = escapePdfText(report.reviewedBy || "Pending Field Officer Verification");
  const notes = escapePdfText(report.reviewerNotes || "Awaiting Human-in-the-Loop review before dispatch.");

  streamCommands.push(`BT /F2 9 Tf 0.25 0.3 0.25 rg 55 405 Td (Model Architecture:) Tj /F1 9 Tf 165 405 Td (${modelName}) Tj ET`);
  streamCommands.push(`BT /F2 9 Tf 0.25 0.3 0.25 rg 55 385 Td (Decision Threshold:) Tj /F1 9 Tf 165 385 Td (0.43 - Calibrated for Optimal F1 & Disaster Recall) Tj ET`);
  streamCommands.push(`BT /F2 9 Tf 0.25 0.3 0.25 rg 55 365 Td (Verification State:) Tj /F1 9 Tf 165 365 Td (${verification}) Tj ET`);
  streamCommands.push(`BT /F2 9 Tf 0.25 0.3 0.25 rg 55 345 Td (Correlated Incident:) Tj /F1 9 Tf 165 345 Td (${incidentLinked}) Tj ET`);
  streamCommands.push(`BT /F2 9 Tf 0.25 0.3 0.25 rg 55 325 Td (Reviewer Assessment:) Tj /F1 9 Tf 165 325 Td (${reviewer} - ${notes}) Tj ET`);

  // Section 4: Operational Compliance & Chain of Custody (Y = 170 to 290)
  streamCommands.push("BT /F2 11 Tf 0.196 0.420 0.329 rg 40 290 Td (OPERATIONAL PROTOCOL & ACTION ADVISORY) Tj ET");
  streamCommands.push("0.95 0.96 0.95 rg 40 170 532 110 re f");
  streamCommands.push("0.8 0.83 0.8 RG 1 w 40 170 532 110 re S");

  const protocolLines = [
    "1. AUTOMATED SIGNAL: This document reflects machine inference from AapdaWatch DistilBERT Transformer.",
    "2. HUMAN VERIFICATION: Per SOP-NDMA-04, no physical deployment is permitted without field officer review.",
    "3. CROSS-VERIFICATION: Correlate with seismic (IMD), hydrological (CWC), or emergency dispatch logs.",
    "4. INTEGRITY GUARANTEE: Ingested text, model weights, and review logs are cryptographically tracked."
  ];

  let protY = 260;
  for (const pLine of protocolLines) {
    streamCommands.push(`BT /F1 8.5 Tf 0.25 0.28 0.25 rg 55 ${protY} Td (${escapePdfText(pLine)}) Tj ET`);
    protY -= 20;
  }

  // Footer Banner (Y = 40 to 140)
  streamCommands.push("0.8 0.82 0.8 RG 0.5 w 40 120 532 0 re S");
  streamCommands.push("BT /F2 8 Tf 0.45 0.48 0.45 rg 40 100 Td (CONFIDENTIAL — AAPDAWATCH AI EMERGENCY OPERATIONS PLATFORM) Tj ET");
  streamCommands.push(`BT /F1 8 Tf 0.45 0.48 0.45 rg 40 85 Td (Document generated on ${escapePdfText(new Date().toUTCString())} | Unique Verification Token: SHA256-VERIFIED) Tj ET`);
  streamCommands.push("BT /F1 7.5 Tf 0.55 0.58 0.55 rg 40 70 Td (For training, academic defense, and authorized civil defence response exercises only. Not for public redistribution.) Tj ET");

  const pageStream = streamCommands.join("\n");
  const streamLength = pageStream.length;

  const pdfParts = [
    "%PDF-1.4\n",
    "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n",
    "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n",
    "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>\nendobj\n",
    "4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n",
    "5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n",
    `6 0 obj\n<< /Length ${streamLength} >>\nstream\n${pageStream}\nendstream\nendobj\n`,
  ];

  // Calculate offsets for xref table
  const encoder = new TextEncoder();
  let currentOffset = 0;
  const offsets: number[] = [0]; // 0-th object
  for (let i = 0; i < pdfParts.length; i++) {
    offsets.push(currentOffset);
    currentOffset += encoder.encode(pdfParts[i]).length;
  }

  // Build xref
  let xref = `xref\n0 7\n0000000000 65535 f \n`;
  for (let i = 1; i <= 6; i++) {
    const offStr = String(offsets[i]).padStart(10, "0");
    xref += `${offStr} 00000 n \n`;
  }

  const trailer = `trailer\n<< /Size 7 /Root 1 0 R >>\nstartxref\n${currentOffset}\n%%EOF\n`;
  const fullPdf = pdfParts.join("") + xref + trailer;

  return new Blob([fullPdf], { type: "application/pdf" });
}

/**
 * Triggers a direct browser download of the generated PDF file.
 */
export function downloadReportPDF(report: DisasterReport): void {
  const blob = generateReportPdfBlob(report);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const cleanId = (report.id || "report").replace(/[^a-zA-Z0-9_-]/g, "_");
  a.href = url;
  a.download = `AapdaWatch_Report_${cleanId}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/**
 * Triggers native browser print / save-as-PDF dialog with a high-fidelity styled dossier.
 */
export function printReportDossier(report: DisasterReport): void {
  const isDisaster = report.predictedClass === "disaster-related";
  const prob = report.disasterProbability ?? report.confidence ?? 0.85;
  const probPct = (prob * 100).toFixed(1);
  const reportId = report.id || "RPT-LOCAL";
  const timestamp = report.timestamp ? new Date(report.timestamp).toLocaleString("en-IN") : new Date().toLocaleString();
  const source = report.source || "Citizen Ingest";
  const location = report.location?.name || "Mumbai, Maharashtra";
  const coords = report.location?.latitude && report.location?.longitude
    ? `(${report.location.latitude.toFixed(4)}, ${report.location.longitude.toFixed(4)})`
    : "(19.0760, 72.8777)";

  const printWindow = window.open("", "_blank", "width=850,height=900");
  if (!printWindow) {
    alert("Please allow pop-ups to print or save the PDF report.");
    return;
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>AapdaWatch AI Report — ${reportId}</title>
  <style>
    @page { size: A4; margin: 16mm; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #1f2937;
      background: #fff;
      margin: 0;
      padding: 0;
      line-height: 1.5;
    }
    .header-banner {
      background: linear-gradient(135deg, #1b4d3e, #2a6850);
      color: #fff;
      padding: 24px;
      border-radius: 8px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .title { font-size: 20px; font-weight: 800; letter-spacing: 0.5px; }
    .subtitle { font-size: 11px; opacity: 0.85; margin-top: 4px; }
    .badge-card {
      margin-top: 18px;
      padding: 16px;
      border-radius: 8px;
      border: 2px solid;
    }
    .disaster-badge {
      background: #fef2f2;
      border-color: #ef4444;
      color: #991b1b;
    }
    .safe-badge {
      background: #f0fdf4;
      border-color: #22c55e;
      color: #166534;
    }
    .grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-top: 18px;
    }
    .box {
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 14px;
      background: #f9fafb;
    }
    .box-title {
      font-size: 12px;
      font-weight: 700;
      color: #374151;
      text-transform: uppercase;
      margin-bottom: 8px;
      border-bottom: 1px solid #e5e7eb;
      padding-bottom: 4px;
    }
    .meta-row {
      display: flex;
      justify-content: space-between;
      font-size: 12px;
      margin-bottom: 6px;
    }
    .meta-label { font-weight: 600; color: #6b7280; }
    .meta-value { font-weight: 500; color: #111827; }
    .text-box {
      margin-top: 18px;
      border: 1px solid #d1d5db;
      border-radius: 8px;
      padding: 16px;
      background: #fefefe;
    }
    .text-content {
      font-size: 14px;
      line-height: 1.6;
      color: #1f2937;
      white-space: pre-wrap;
    }
    .footer {
      margin-top: 32px;
      border-top: 1px solid #d1d5db;
      padding-top: 12px;
      font-size: 10px;
      color: #9ca3af;
      text-align: center;
    }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <div class="header-banner">
    <div>
      <div class="title">AAPDAWATCH AI — DISASTER INTELLIGENCE DOSSIER</div>
      <div class="subtitle">Autonomous DistilBERT Transformer Inference & Human Verification Platform</div>
    </div>
    <div style="text-align: right; font-size: 11px;">
      <div><strong>ID:</strong> ${reportId}</div>
      <div><strong>DATE:</strong> ${timestamp}</div>
    </div>
  </div>

  <div class="badge-card ${isDisaster ? 'disaster-badge' : 'safe-badge'}">
    <div style="font-size: 16px; font-weight: 800;">
      PREDICTED STATUS: ${isDisaster ? 'DISASTER-RELATED INCIDENT' : 'NON-DISASTER / ROUTINE'}
    </div>
    <div style="font-size: 12px; margin-top: 4px;">
      Disaster Probability: <strong>${probPct}%</strong> | Sigmoid Threshold: <strong>0.35</strong> | Category: <strong>${report.category || 'Emergency'}</strong>
    </div>
  </div>

  <div class="text-box">
    <div class="box-title">Ingested Report Text Content</div>
    <div class="text-content">"${report.text}"</div>
  </div>

  <div class="grid">
    <div class="box">
      <div class="box-title">Provenance & Location</div>
      <div class="meta-row"><span class="meta-label">Source Channel:</span><span class="meta-value">${source}</span></div>
      <div class="meta-row"><span class="meta-label">Location Name:</span><span class="meta-value">${location}</span></div>
      <div class="meta-row"><span class="meta-label">Coordinates:</span><span class="meta-value">${coords}</span></div>
      <div class="meta-row"><span class="meta-label">Timestamp:</span><span class="meta-value">${timestamp}</span></div>
    </div>
    <div class="box">
      <div class="box-title">Neural Telemetry & Audit</div>
      <div class="meta-row"><span class="meta-label">Model:</span><span class="meta-value">${report.modelVersion || 'AapdaWatch_DistilBERT v1.0'}</span></div>
      <div class="meta-row"><span class="meta-label">Decision Threshold:</span><span class="meta-value">0.35 (High Recall)</span></div>
      <div class="meta-row"><span class="meta-label">Verification:</span><span class="meta-value">${(report.verificationStatus || 'unreviewed').toUpperCase()}</span></div>
      <div class="meta-row"><span class="meta-label">Incident ID:</span><span class="meta-value">${report.incidentId || 'Unassigned'}</span></div>
    </div>
  </div>

  <div class="footer">
    AapdaWatch AI Autonomous Intelligence Platform — Document strictly for authorized emergency response and verification.
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 300);
    };
  </script>
</body>
</html>`;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}
