"use client";

import React, { useState, useMemo } from "react";
import { useApp } from "@/context/AppContext";
import { GlassCard } from "@/components/ui/GlassCard";
import { StatusBadge, getVerificationVariant } from "@/components/ui/StatusBadge";
import { useToast } from "@/components/ui/Toast";
import { downloadCSV, escapeCSV, formatDate, formatRelativeTime } from "@/lib/utils";
import { downloadReportPDF, printReportDossier } from "@/lib/pdf-export";
import type { DisasterReport } from "@/types";
import {
  FileSpreadsheet,
  Filter,
  Download,
  Info,
  Layers,
  Calendar,
  ShieldCheck,
  Eye,
  FileDown,
  Printer,
  Search,
  X,
  AlertTriangle,
  Flame,
  CheckCircle2,
  Clock,
  Sparkles,
  Copy,
} from "lucide-react";

export default function ReportsAndExportsPage() {
  const { incidents, reports } = useApp();
  const { toast } = useToast();

  // Active view tab: "dossiers" or "bulk-export"
  const [activeTab, setActiveTab] = useState<"dossiers" | "bulk-export">("dossiers");

  // Filters for dossiers table
  const [searchQuery, setSearchQuery] = useState("");
  const [classFilter, setClassFilter] = useState("all");
  const [verificationFilter, setVerificationFilter] = useState("all");

  // Selected report for modal detail view
  const [selectedReport, setSelectedReport] = useState<DisasterReport | null>(null);

  // Filters for bulk incident exports
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Filtered reports for table
  const filteredReports = useMemo(() => {
    return reports.filter((rpt) => {
      if (classFilter !== "all" && rpt.predictedClass !== classFilter) return false;
      if (verificationFilter !== "all" && rpt.verificationStatus !== verificationFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesText = rpt.text?.toLowerCase().includes(q);
        const matchesId = rpt.id?.toLowerCase().includes(q);
        const matchesSource = (rpt.source || "").toLowerCase().includes(q);
        const matchesLoc = (rpt.location?.name || "").toLowerCase().includes(q);
        if (!matchesText && !matchesId && !matchesSource && !matchesLoc) return false;
      }
      return true;
    });
  }, [reports, classFilter, verificationFilter, searchQuery]);

  // Quick stats
  const disasterCount = reports.filter((r) => r.predictedClass === "disaster-related").length;
  const nonDisasterCount = reports.filter((r) => r.predictedClass === "not-disaster-related").length;
  const verifiedCount = reports.filter((r) => r.verificationStatus === "verified").length;
  const pendingCount = reports.filter(
    (r) => r.verificationStatus === "unreviewed" || r.verificationStatus === "under-review"
  ).length;

  // Handler: Single Report PDF Download
  const handleDownloadSinglePDF = (rpt: DisasterReport, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      downloadReportPDF(rpt);
      toast({
        title: "PDF Dossier Generated",
        description: `Downloaded official report PDF for ${rpt.id}.`,
        variant: "success",
      });
    } catch (err) {
      console.error("PDF download error:", err);
      toast({
        title: "PDF Download Failed",
        description: "Could not generate PDF dossier.",
        variant: "error",
      });
    }
  };

  // Handler: Print Single Report Dossier
  const handlePrintSingleDossier = (rpt: DisasterReport, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      printReportDossier(rpt);
    } catch (err) {
      console.error("Print error:", err);
      toast({
        title: "Print Error",
        description: "Could not open print dossier.",
        variant: "error",
      });
    }
  };

  // Export 1: Incident Summary CSV
  const handleExportIncidents = () => {
    const filtered = incidents.filter((inc) => {
      if (categoryFilter !== "all" && inc.category !== categoryFilter) return false;
      if (severityFilter !== "all" && inc.severity !== severityFilter) return false;
      if (statusFilter !== "all" && inc.status !== statusFilter) return false;
      return true;
    });

    const headers = [
      "incident_id",
      "incident_code",
      "title",
      "category",
      "severity",
      "location_name",
      "latitude",
      "longitude",
      "report_count",
      "status",
      "verification_status",
      "description",
      "created_at",
      "updated_at",
      "provenance_note",
    ];

    const lines = [headers.map(escapeCSV).join(",")];

    filtered.forEach((inc) => {
      lines.push(
        [
          escapeCSV(inc.id),
          escapeCSV(inc.incidentCode),
          escapeCSV(inc.title),
          escapeCSV(inc.category),
          escapeCSV(inc.severity),
          escapeCSV(inc.location.name),
          escapeCSV(inc.location.latitude),
          escapeCSV(inc.location.longitude),
          escapeCSV(inc.reportCount),
          escapeCSV(inc.status),
          escapeCSV(inc.verificationStatus),
          escapeCSV(inc.description),
          escapeCSV(inc.createdAt),
          escapeCSV(inc.updatedAt),
          escapeCSV("AapdaWatch AI Incident Registry"),
        ].join(",")
      );
    });

    downloadCSV(lines.join("\n"), `aapdawatch_incidents_export_${Date.now()}.csv`);
    toast({
      title: "Export Generated",
      description: `Downloaded ${filtered.length} incident dossiers as CSV.`,
      variant: "success",
    });
  };

  // Export 2: Disaster Reports CSV
  const handleExportReports = () => {
    const headers = [
      "report_id",
      "submitted_text",
      "source_channel",
      "timestamp",
      "predicted_class",
      "disaster_probability",
      "confidence",
      "category",
      "verification_status",
      "incident_id",
      "model_version",
      "reviewer_notes",
      "reviewed_by",
      "reviewed_at",
      "verification_disclaimer",
    ];

    const lines = [headers.map(escapeCSV).join(",")];

    reports.forEach((rpt) => {
      lines.push(
        [
          escapeCSV(rpt.id),
          escapeCSV(rpt.text),
          escapeCSV(rpt.source || "Citizen"),
          escapeCSV(rpt.timestamp),
          escapeCSV(rpt.predictedClass),
          escapeCSV(rpt.disasterProbability ?? rpt.confidence ?? 0.85),
          escapeCSV(rpt.confidence ?? 0.85),
          escapeCSV(rpt.category ?? "unspecified"),
          escapeCSV(rpt.verificationStatus),
          escapeCSV(rpt.incidentId ?? "unassigned"),
          escapeCSV(rpt.modelVersion ?? "AapdaWatch_BiLSTM"),
          escapeCSV(rpt.reviewerNotes ?? ""),
          escapeCSV(rpt.reviewedBy ?? ""),
          escapeCSV(rpt.reviewedAt ?? ""),
          escapeCSV("Prediction score represents BiLSTM model probability; human verification confirmed separately"),
        ].join(",")
      );
    });

    downloadCSV(lines.join("\n"), `aapdawatch_reports_export_${Date.now()}.csv`);
    toast({
      title: "Export Generated",
      description: `Downloaded ${reports.length} individual disaster reports as CSV.`,
      variant: "success",
    });
  };

  // Export 3: Human Verification Audit Log CSV
  const handleExportAudit = () => {
    const verifiedReports = reports.filter((r) => r.verificationStatus !== "unreviewed");

    const headers = [
      "audit_id",
      "report_id",
      "incident_id",
      "text_sample",
      "model_prediction",
      "human_verdict",
      "reviewer_notes",
      "reviewed_by",
      "reviewed_at",
    ];

    const lines = [headers.map(escapeCSV).join(",")];

    verifiedReports.forEach((rpt, idx) => {
      lines.push(
        [
          escapeCSV(`AUDIT-${1000 + idx}`),
          escapeCSV(rpt.id),
          escapeCSV(rpt.incidentId ?? "none"),
          escapeCSV(rpt.text.slice(0, 100)),
          escapeCSV(rpt.predictedClass),
          escapeCSV(rpt.verificationStatus),
          escapeCSV(rpt.reviewerNotes ?? "N/A"),
          escapeCSV(rpt.reviewedBy ?? "System Operator"),
          escapeCSV(rpt.reviewedAt ?? new Date().toISOString()),
        ].join(",")
      );
    });

    downloadCSV(lines.join("\n"), `aapdawatch_verification_audit_${Date.now()}.csv`);
    toast({
      title: "Audit Log Exported",
      description: `Exported ${verifiedReports.length} human-reviewed verification decisions.`,
      variant: "info",
    });
  };

  // Export 4: Analytics Summary CSV
  const handleExportAnalytics = () => {
    const headers = ["domain_metric", "category_or_level", "count_or_value", "reporting_date"];
    const lines = [headers.map(escapeCSV).join(",")];
    const today = new Date().toISOString().slice(0, 10);

    const categoryCounts: Record<string, number> = {};
    incidents.forEach((inc) => {
      categoryCounts[inc.category] = (categoryCounts[inc.category] || 0) + 1;
    });

    Object.entries(categoryCounts).forEach(([cat, count]) => {
      lines.push([escapeCSV("category_volume"), escapeCSV(cat), escapeCSV(count), escapeCSV(today)].join(","));
    });

    const severityCounts: Record<string, number> = {};
    incidents.forEach((inc) => {
      severityCounts[inc.severity] = (severityCounts[inc.severity] || 0) + 1;
    });

    Object.entries(severityCounts).forEach(([sev, count]) => {
      lines.push([escapeCSV("severity_distribution"), escapeCSV(sev), escapeCSV(count), escapeCSV(today)].join(","));
    });

    const verificationCounts: Record<string, number> = {};
    reports.forEach((rpt) => {
      verificationCounts[rpt.verificationStatus] = (verificationCounts[rpt.verificationStatus] || 0) + 1;
    });

    Object.entries(verificationCounts).forEach(([stat, count]) => {
      lines.push([escapeCSV("verification_status_distribution"), escapeCSV(stat), escapeCSV(count), escapeCSV(today)].join(","));
    });

    downloadCSV(lines.join("\n"), `aapdawatch_analytics_summary_${Date.now()}.csv`);
    toast({
      title: "Analytics Summary Exported",
      description: "Downloaded aggregate domain metrics as CSV.",
      variant: "info",
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <GlassCard className="p-4 flex flex-col justify-between">
          <span className="text-[11px] font-medium text-[#737A70]">Total Ingested Reports</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-bold text-[#242B27] dark:text-[#E8EDE9]">{reports.length}</span>
            <FileSpreadsheet className="w-4 h-4 text-[#326B54]" />
          </div>
        </GlassCard>

        <GlassCard className="p-4 flex flex-col justify-between">
          <span className="text-[11px] font-medium text-[#737A70]">Disaster Signals</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-bold text-red-600 dark:text-red-400">{disasterCount}</span>
            <Flame className="w-4 h-4 text-red-500" />
          </div>
        </GlassCard>

        <GlassCard className="p-4 flex flex-col justify-between">
          <span className="text-[11px] font-medium text-[#737A70]">Routine / Non-Disaster</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{nonDisasterCount}</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
        </GlassCard>

        <GlassCard className="p-4 flex flex-col justify-between">
          <span className="text-[11px] font-medium text-[#737A70]">Pending Verification</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">{pendingCount}</span>
            <Clock className="w-4 h-4 text-blue-500" />
          </div>
        </GlassCard>
      </div>

      {/* View Switcher Tabs */}
      <div className="flex items-center gap-2 border-b border-black/10 dark:border-white/10 pb-2">
        <button
          onClick={() => setActiveTab("dossiers")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === "dossiers"
              ? "bg-[#326B54] text-white shadow-sm"
              : "bg-black/5 dark:bg-white/5 text-[#737A70] hover:text-[#242B27] dark:hover:text-[#E8EDE9]"
          }`}
        >
          <Eye className="w-4 h-4" />
          <span>Disaster Reports & Dossiers ({reports.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("bulk-export")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === "bulk-export"
              ? "bg-[#326B54] text-white shadow-sm"
              : "bg-black/5 dark:bg-white/5 text-[#737A70] hover:text-[#242B27] dark:hover:text-[#E8EDE9]"
          }`}
        >
          <Download className="w-4 h-4" />
          <span>Bulk Export Packages</span>
        </button>
      </div>

      {/* TAB 1: Dossiers & Interactive Reports Table */}
      {activeTab === "dossiers" && (
        <div className="space-y-4">
          {/* Search & Filter Bar */}
          <GlassCard className="p-3.5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-1 min-w-[240px]">
              <Search className="w-4 h-4 text-[#737A70]" />
              <input
                type="text"
                suppressHydrationWarning
                placeholder="Search reports by ID, text content, location, or source..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs bg-transparent text-[#242B27] dark:text-[#E8EDE9] placeholder-[#737A70] focus:outline-none"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="text-[#737A70] hover:text-black dark:hover:text-white">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                suppressHydrationWarning
                value={classFilter}
                onChange={(e) => setClassFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs rounded-xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 text-[#242B27] dark:text-[#E8EDE9] focus:outline-none"
              >
                <option value="all">All Predictions</option>
                <option value="disaster-related">Disaster-Related</option>
                <option value="not-disaster-related">Non-Disaster</option>
              </select>

              <select
                suppressHydrationWarning
                value={verificationFilter}
                onChange={(e) => setVerificationFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs rounded-xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 text-[#242B27] dark:text-[#E8EDE9] focus:outline-none"
              >
                <option value="all">All Verification Statuses</option>
                <option value="unreviewed">Unreviewed</option>
                <option value="under-review">Under Review</option>
                <option value="verified">Verified</option>
                <option value="false-positive">False Positive</option>
              </select>

              <button
                onClick={handleExportReports}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-black/10 text-xs font-semibold text-[#242B27] dark:text-[#E8EDE9] transition-colors"
                title="Download all filtered reports as CSV"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>
            </div>
          </GlassCard>

          {/* Reports Table */}
          <GlassCard className="overflow-hidden border border-black/5 dark:border-white/10">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-black/5 dark:bg-white/5 text-[#737A70] uppercase font-bold text-[10px] tracking-wider border-b border-black/5 dark:border-white/10">
                  <tr>
                    <th className="px-4 py-3">Report ID / Time</th>
                    <th className="px-4 py-3">Source & Location</th>
                    <th className="px-4 py-3 min-w-[280px]">Report Text Sample</th>
                    <th className="px-4 py-3">BiLSTM Classification</th>
                    <th className="px-4 py-3">Verification</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5 dark:divide-white/5 text-[#242B27] dark:text-[#E8EDE9]">
                  {filteredReports.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center text-[#737A70]">
                        No reports matching your search or filters found.
                      </td>
                    </tr>
                  ) : (
                    filteredReports.map((rpt) => {
                      const isDisaster = rpt.predictedClass === "disaster-related";
                      const prob = rpt.disasterProbability ?? rpt.confidence ?? 0.85;
                      const probPct = (prob * 100).toFixed(1);

                      return (
                        <tr
                          key={rpt.id}
                          onClick={() => setSelectedReport(rpt)}
                          className="hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer transition-colors"
                        >
                          {/* ID & Time */}
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <div className="font-mono font-bold text-[#326B54] dark:text-[#DCE9DA]">
                              {rpt.id.slice(0, 16)}
                            </div>
                            <div className="text-[10px] text-[#737A70] mt-0.5">
                              {rpt.timestamp ? formatRelativeTime(rpt.timestamp) : "Recently"}
                            </div>
                          </td>

                          {/* Source & Location */}
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <div className="font-medium text-[#242B27] dark:text-[#E8EDE9]">
                              {rpt.source || "Citizen Ingest"}
                            </div>
                            <div className="text-[10px] text-[#737A70] mt-0.5">
                              {rpt.location?.name || "Mumbai, Maharashtra"}
                            </div>
                          </td>

                          {/* Text Snippet */}
                          <td className="px-4 py-3.5">
                            <p className="line-clamp-2 text-xs leading-relaxed max-w-md text-[#242B27] dark:text-[#E8EDE9]">
                              {rpt.text}
                            </p>
                          </td>

                          {/* BiLSTM Prediction */}
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <span
                                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                                  isDisaster
                                    ? "bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-900/40"
                                    : "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/40"
                                }`}
                              >
                                {isDisaster ? <Flame className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
                                <span>{isDisaster ? "Disaster" : "Routine"}</span>
                              </span>
                              <span className="font-mono text-[11px] font-bold text-[#737A70]">
                                {probPct}%
                              </span>
                            </div>
                          </td>

                          {/* Verification Status */}
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <StatusBadge variant={getVerificationVariant(rpt.verificationStatus)} />
                          </td>

                          {/* Actions */}
                          <td className="px-4 py-3.5 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                            <div className="inline-flex items-center gap-1.5">
                              {/* View Button */}
                              <button
                                onClick={() => setSelectedReport(rpt)}
                                className="p-1.5 rounded-lg bg-black/5 dark:bg-white/5 hover:bg-[#326B54] hover:text-white text-[#737A70] transition-colors"
                                title="View Complete Report Dossier"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>

                              {/* Download PDF Button */}
                              <button
                                onClick={(e) => handleDownloadSinglePDF(rpt, e)}
                                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#326B54]/10 hover:bg-[#326B54] text-[#326B54] hover:text-white dark:text-[#DCE9DA] text-[11px] font-semibold transition-colors"
                                title="Download Official PDF Dossier"
                              >
                                <FileDown className="w-3.5 h-3.5" />
                                <span>PDF</span>
                              </button>

                              {/* Print Button */}
                              <button
                                onClick={(e) => handlePrintSingleDossier(rpt, e)}
                                className="p-1.5 rounded-lg bg-black/5 dark:bg-white/5 hover:bg-black/10 text-[#737A70] transition-colors"
                                title="Print / Vector Save as PDF"
                              >
                                <Printer className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="p-3 border-t border-black/5 dark:border-white/10 flex items-center justify-between text-xs text-[#737A70]">
              <span>Showing {filteredReports.length} of {reports.length} total disaster reports</span>
              <span>Click on any row to open full dossier</span>
            </div>
          </GlassCard>
        </div>
      )}

      {/* TAB 2: Bulk Export Packages (Existing CSV Cards) */}
      {activeTab === "bulk-export" && (
        <div className="space-y-6">
          {/* Export Filter Bar */}
          <GlassCard className="p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3 flex-1">
              <span className="text-xs font-bold text-[#242B27] dark:text-[#E8EDE9] flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-[#326B54]" />
                <span>Apply Dossier Filters:</span>
              </span>

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 text-[#242B27] dark:text-[#E8EDE9] focus:outline-none"
              >
                <option value="all">All Disaster Categories</option>
                <option value="flood">Flood</option>
                <option value="earthquake">Earthquake</option>
                <option value="fire">Fire</option>
                <option value="cyclone">Cyclone</option>
                <option value="landslide">Landslide</option>
                <option value="other">Other</option>
              </select>

              <select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 text-[#242B27] dark:text-[#E8EDE9] focus:outline-none"
              >
                <option value="all">All Severities</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 text-[#242B27] dark:text-[#E8EDE9] focus:outline-none"
              >
                <option value="all">All Incident Statuses</option>
                <option value="unreviewed">Unreviewed</option>
                <option value="under-review">Under Review</option>
                <option value="verified">Verified</option>
                <option value="resolved">Resolved</option>
              </select>
            </div>
          </GlassCard>

          {/* Export Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Card 1: Incident Summary CSV */}
            <GlassCard className="p-6 space-y-4 border border-black/5 dark:border-white/10 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="p-2.5 rounded-xl bg-[#DCE9DA] dark:bg-[#326B54]/30 text-[#326B54] dark:text-[#DCE9DA]">
                    <Layers className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-black/5 dark:bg-white/5 text-[#737A70]">
                    CSV Export
                  </span>
                </div>

                <h3 className="text-base font-bold text-[#242B27] dark:text-[#E8EDE9]">
                  Incident Dossiers Summary
                </h3>
                <p className="text-xs text-[#737A70] leading-relaxed">
                  Export consolidated incident records containing geographic coordinates, correlated report counts, current verification status, and disaster categories.
                </p>
              </div>

              <div className="pt-4 border-t border-black/5 dark:border-white/10 flex items-center justify-between">
                <span className="text-xs text-[#737A70]">
                  {incidents.length} incidents in registry
                </span>
                <button
                  onClick={handleExportIncidents}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#326B54] hover:bg-[#294B39] text-white text-xs font-semibold shadow transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span>Download CSV</span>
                </button>
              </div>
            </GlassCard>

            {/* Card 2: Disaster Reports CSV */}
            <GlassCard className="p-6 space-y-4 border border-black/5 dark:border-white/10 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="p-2.5 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-black/5 dark:bg-white/5 text-[#737A70]">
                    CSV Export
                  </span>
                </div>

                <h3 className="text-base font-bold text-[#242B27] dark:text-[#E8EDE9]">
                  Submitted Disaster Reports
                </h3>
                <p className="text-xs text-[#737A70] leading-relaxed">
                  Export all granular social media and field reports, including model prediction scores, disaster probabilities, assigned incident mappings, and reviewer notes.
                </p>
              </div>

              <div className="pt-4 border-t border-black/5 dark:border-white/10 flex items-center justify-between">
                <span className="text-xs text-[#737A70]">
                  {reports.length} ingested reports
                </span>
                <button
                  onClick={handleExportReports}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#326B54] hover:bg-[#294B39] text-white text-xs font-semibold shadow transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span>Download CSV</span>
                </button>
              </div>
            </GlassCard>

            {/* Card 3: Human Verification Audit Log */}
            <GlassCard className="p-6 space-y-4 border border-black/5 dark:border-white/10 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="p-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-black/5 dark:bg-white/5 text-[#737A70]">
                    CSV Audit Trail
                  </span>
                </div>

                <h3 className="text-base font-bold text-[#242B27] dark:text-[#E8EDE9]">
                  Human Verification Audit Records
                </h3>
                <p className="text-xs text-[#737A70] leading-relaxed">
                  Export all reviewer decisions (Verified, False Positive, Duplicate), rationale notes, operator IDs, and timestamps for supervisory and legal compliance.
                </p>
              </div>

              <div className="pt-4 border-t border-black/5 dark:border-white/10 flex items-center justify-between">
                <span className="text-xs text-[#737A70]">
                  Audit trail of reviewer decisions
                </span>
                <button
                  onClick={handleExportAudit}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#326B54] hover:bg-[#294B39] text-white text-xs font-semibold shadow transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Audit CSV</span>
                </button>
              </div>
            </GlassCard>

            {/* Card 4: Analytics Summary CSV */}
            <GlassCard className="p-6 space-y-4 border border-black/5 dark:border-white/10 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="p-2.5 rounded-xl bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-black/5 dark:bg-white/5 text-[#737A70]">
                    CSV Summary
                  </span>
                </div>

                <h3 className="text-base font-bold text-[#242B27] dark:text-[#E8EDE9]">
                  Operational Analytics Summary
                </h3>
                <p className="text-xs text-[#737A70] leading-relaxed">
                  Export categorized counts by disaster type, severity thresholds, and weekly ingestion volumes for higher-level administrative reports.
                </p>
              </div>

              <div className="pt-4 border-t border-black/5 dark:border-white/10 flex items-center justify-between">
                <span className="text-xs text-[#737A70]">
                  Aggregated operational metrics
                </span>
                <button
                  onClick={handleExportAnalytics}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#326B54] hover:bg-[#294B39] text-white text-xs font-semibold shadow transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span>Download CSV</span>
                </button>
              </div>
            </GlassCard>
          </div>
        </div>
      )}

      {/* MODAL: Full Disaster Report Dossier View */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#FAFDF9] dark:bg-[#1E2521] border border-black/10 dark:border-white/15 rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-6">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-black/10 dark:border-white/10 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-[#326B54] dark:text-[#DCE9DA]">
                    {selectedReport.id}
                  </span>
                  <StatusBadge variant={getVerificationVariant(selectedReport.verificationStatus)} />
                </div>
                <h3 className="text-lg font-bold text-[#242B27] dark:text-[#E8EDE9] mt-1">
                  Disaster Intelligence Report Dossier
                </h3>
                <p className="text-xs text-[#737A70]">
                  Ingested on {selectedReport.timestamp ? formatDate(selectedReport.timestamp) : "Recent"} via {selectedReport.source || "Citizen Ingest"}
                </p>
              </div>

              <button
                onClick={() => setSelectedReport(null)}
                className="p-2 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-black/10 text-[#737A70] hover:text-black dark:hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Prediction Banner */}
            {(() => {
              const isDisaster = selectedReport.predictedClass === "disaster-related";
              const prob = selectedReport.disasterProbability ?? selectedReport.confidence ?? 0.85;
              const probPct = (prob * 100).toFixed(1);

              return (
                <div
                  className={`p-4 rounded-2xl border flex items-center justify-between ${
                    isDisaster
                      ? "bg-red-500/10 border-red-500/20 text-red-900 dark:text-red-300"
                      : "bg-emerald-500/10 border-emerald-500/20 text-emerald-900 dark:text-emerald-300"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2.5 rounded-xl ${
                        isDisaster ? "bg-red-100 text-red-600 dark:bg-red-900/50" : "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50"
                      }`}
                    >
                      {isDisaster ? <Flame className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
                    </div>
                    <div>
                      <div className="text-sm font-bold">
                        {isDisaster ? "Disaster-Related Emergency Signal" : "Non-Disaster / Routine Message"}
                      </div>
                      <div className="text-xs opacity-80">
                        BiLSTM Confidence: <strong>{probPct}%</strong> | Sigmoid Threshold: <strong>0.35</strong>
                      </div>
                    </div>
                  </div>
                  <div className="text-right font-mono text-xl font-bold">
                    {probPct}%
                  </div>
                </div>
              );
            })()}

            {/* Ingested Text Box */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-[#242B27] dark:text-[#E8EDE9]">
                <span>Ingested Message Content</span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(selectedReport.text);
                    toast({ title: "Copied", description: "Report text copied to clipboard.", variant: "info" });
                  }}
                  className="flex items-center gap-1 text-[11px] text-[#326B54] dark:text-[#DCE9DA] hover:underline"
                >
                  <Copy className="w-3 h-3" />
                  <span>Copy Text</span>
                </button>
              </div>
              <div className="p-4 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 text-xs leading-relaxed text-[#242B27] dark:text-[#E8EDE9]">
                &ldquo;{selectedReport.text}&rdquo;
              </div>
            </div>

            {/* Neural Telemetry & Metadata Grid */}
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="p-3.5 rounded-2xl bg-black/5 dark:bg-white/5 space-y-1.5">
                <span className="text-[10px] font-bold text-[#737A70] uppercase">Geographic Location</span>
                <div className="font-semibold text-[#242B27] dark:text-[#E8EDE9]">
                  {selectedReport.location?.name || "Mumbai, Maharashtra"}
                </div>
                <div className="font-mono text-[11px] text-[#737A70]">
                  Lat: {selectedReport.location?.latitude ?? 19.0760}, Lon: {selectedReport.location?.longitude ?? 72.8777}
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-black/5 dark:bg-white/5 space-y-1.5">
                <span className="text-[10px] font-bold text-[#737A70] uppercase">Neural Classification Engine</span>
                <div className="font-semibold text-[#242B27] dark:text-[#E8EDE9]">
                  {selectedReport.modelVersion || "AapdaWatch_BiLSTM (Keras 3 / PyTorch CPU)"}
                </div>
                <div className="text-[11px] text-[#737A70]">
                  13,964 vocabulary tokens | max_len=100
                </div>
              </div>
            </div>

            {/* Reviewer / Verification Notes */}
            <div className="p-3.5 rounded-2xl bg-black/5 dark:bg-white/5 space-y-1 text-xs">
              <span className="text-[10px] font-bold text-[#737A70] uppercase">Human Verification & Audit Log</span>
              <div className="text-[#242B27] dark:text-[#E8EDE9]">
                Status: <span className="font-semibold">{selectedReport.verificationStatus}</span>
                {selectedReport.reviewedBy && ` | Reviewer: ${selectedReport.reviewedBy}`}
              </div>
              {selectedReport.reviewerNotes && (
                <div className="text-[#737A70] italic mt-1">&ldquo;{selectedReport.reviewerNotes}&rdquo;</div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-black/10 dark:border-white/10">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownloadSinglePDF(selectedReport)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#326B54] hover:bg-[#294B39] text-white text-xs font-semibold shadow transition-colors"
                >
                  <FileDown className="w-4 h-4" />
                  <span>Download Official PDF</span>
                </button>

                <button
                  onClick={() => handlePrintSingleDossier(selectedReport)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-black/10 text-[#242B27] dark:text-[#E8EDE9] text-xs font-semibold transition-colors"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Dossier</span>
                </button>
              </div>

              <button
                onClick={() => setSelectedReport(null)}
                className="px-4 py-2 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-black/10 text-[#737A70] text-xs font-semibold transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
