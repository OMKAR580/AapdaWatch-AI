"use client";

import React, { useState, useMemo } from "react";
import { useApp } from "@/context/AppContext";
import { GlassCard } from "@/components/ui/GlassCard";
import {
  StatusBadge,
  getVerificationVariant,
  getPredictedClassVariant,
} from "@/components/ui/StatusBadge";
import { useToast } from "@/components/ui/Toast";
import { formatDate, formatRelativeTime } from "@/lib/utils";
import type { VerificationStatus } from "@/types";
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Copy,
  Clock,
  Search,
  FileText,
  Info,
  X,
} from "lucide-react";

export default function VerificationCenterPage() {
  const { reports, updateReportVerification, searchQuery, setSearchQuery } = useApp();
  const { toast } = useToast();

  const [selectedReportId, setSelectedReportId] = useState<string | null>(
    reports[0]?.id ?? null
  );
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [notesInput, setNotesInput] = useState(reports[0]?.reviewerNotes ?? "");

  const filteredReports = useMemo(() => {
    return reports.filter((r) => {
      if (statusFilter !== "all" && r.verificationStatus !== statusFilter) return false;
      if (
        searchQuery &&
        !r.text.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !r.id.toLowerCase().includes(searchQuery.toLowerCase())
      ) {
        return false;
      }
      return true;
    });
  }, [reports, statusFilter, searchQuery]);

  const activeReport = reports.find((r) => r.id === selectedReportId) ?? filteredReports[0] ?? null;

  const handleApplyDecision = (newStatus: VerificationStatus) => {
    if (!activeReport) return;

    updateReportVerification(activeReport.id, newStatus, notesInput);

    toast({
      title: "Review Decision Recorded",
      description: `Report ${activeReport.id} status updated to "${newStatus.replace("-", " ")}". Audit trail logged.`,
      variant: newStatus === "verified" ? "success" : newStatus === "false-positive" ? "warning" : "info",
    });
  };

  return (
    <div className="space-y-6">
      {/* Main Review Workspace: 2-column layout (Queue list on left, detail on right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Queue List (5/12) */}
        <div className="lg:col-span-5 space-y-4">
          <GlassCard className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#242B27] dark:text-[#E8EDE9] flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#326B54]" />
                <span>Verification Queue</span>
              </h3>
              <span className="text-xs text-[#737A70]">
                {filteredReports.length} reports
              </span>
            </div>

            {/* Filter controls */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#737A70]" />
                <input
                  type="text"
                  placeholder="Filter queue by text..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-8 py-1.5 text-xs rounded-xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 text-[#242B27] dark:text-[#E8EDE9] placeholder:text-[#737A70] focus:outline-none"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded text-[#737A70] hover:text-[#242B27] dark:hover:text-[#E8EDE9]"
                    aria-label="Clear search"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs rounded-xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 text-[#242B27] dark:text-[#E8EDE9] focus:outline-none"
              >
                <option value="all">All Status</option>
                <option value="unreviewed">Unreviewed</option>
                <option value="under-review">Under Review</option>
                <option value="verified">Verified</option>
                <option value="false-positive">False Positive</option>
                <option value="duplicate">Duplicate</option>
              </select>
            </div>
          </GlassCard>

          {/* Queue items */}
          <div className="space-y-2.5 max-h-[620px] overflow-y-auto pr-1">
            {filteredReports.length === 0 ? (
              <GlassCard className="p-8 text-center text-xs text-[#737A70]">
                No reports match the selected verification filter.
              </GlassCard>
            ) : (
              filteredReports.map((rpt) => {
                const isSelected = rpt.id === activeReport?.id;
                return (
                  <GlassCard
                    key={rpt.id}
                    onClick={() => {
                      setSelectedReportId(rpt.id);
                      setNotesInput(rpt.reviewerNotes ?? "");
                    }}
                    hover
                    className={`p-3.5 space-y-2 cursor-pointer transition-all border ${
                      isSelected
                        ? "border-[#326B54] bg-[#DCE9DA]/20 dark:bg-[#326B54]/20 shadow-md"
                        : "border-black/5 dark:border-white/5"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-[#242B27] dark:text-[#E8EDE9]">
                        <FileText className="w-3.5 h-3.5 text-[#326B54]" />
                        <span>{rpt.id}</span>
                      </div>
                      <StatusBadge variant={getVerificationVariant(rpt.verificationStatus)} />
                    </div>

                    <p className="text-xs text-[#242B27] dark:text-[#E8EDE9] line-clamp-2 leading-relaxed">
                      {rpt.text}
                    </p>

                    <div className="flex items-center justify-between text-[11px] text-[#737A70] pt-1 border-t border-black/5 dark:border-white/5">
                      <div className="flex items-center gap-2">
                        <StatusBadge
                          variant={getPredictedClassVariant(rpt.predictedClass)}
                          label={rpt.predictedClass === "disaster-related" ? "Disaster" : "Non-Disaster"}
                        />
                        <span>Prob: {((rpt.disasterProbability ?? rpt.confidence ?? 0.9) * 100).toFixed(0)}%</span>
                      </div>
                      <span>{formatRelativeTime(rpt.timestamp)}</span>
                    </div>
                  </GlassCard>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Inspection & Decision Console (7/12) */}
        <div className="lg:col-span-7">
          {activeReport ? (
            <GlassCard className="p-6 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-black/5 dark:border-white/10 pb-4">
                <div>
                  <span className="text-[10px] font-mono font-bold uppercase text-[#326B54] dark:text-[#DCE9DA]">
                    Active Case File
                  </span>
                  <h2 className="text-lg font-bold text-[#242B27] dark:text-[#E8EDE9]">
                    Report {activeReport.id}
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge size="md" variant={getVerificationVariant(activeReport.verificationStatus)} />
                </div>
              </div>

              {/* Full submitted message */}
              <div className="space-y-1.5">
                <span className="text-xs font-bold text-[#737A70]">Full Submitted Text:</span>
                <div className="p-4 rounded-xl bg-black/5 dark:bg-white/5 text-xs md:text-sm text-[#242B27] dark:text-[#E8EDE9] leading-relaxed font-medium">
                  &ldquo;{activeReport.text}&rdquo;
                </div>
              </div>

              {/* Metadata strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-black/5 dark:bg-white/5 p-3 rounded-xl">
                <div>
                  <p className="text-[#737A70] text-[10px]">Source Channel</p>
                  <p className="font-semibold text-[#242B27] dark:text-[#E8EDE9]">{activeReport.source}</p>
                </div>
                <div>
                  <p className="text-[#737A70] text-[10px]">Model Prediction</p>
                  <p className="font-semibold capitalize text-[#242B27] dark:text-[#E8EDE9]">
                    {activeReport.predictedClass.replace("-", " ")}
                  </p>
                </div>
                <div>
                  <p className="text-[#737A70] text-[10px]">Confidence</p>
                  <p className="font-semibold text-red-600">
                    {((activeReport.disasterProbability ?? activeReport.confidence ?? 0.9) * 100).toFixed(1)}%
                  </p>
                </div>
                <div>
                  <p className="text-[#737A70] text-[10px]">Associated Incident</p>
                  <p className="font-semibold text-[#326B54]">
                    {activeReport.incidentId ?? "Unlinked"}
                  </p>
                </div>
              </div>

              {/* Reviewer Notes Field */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#242B27] dark:text-[#E8EDE9]">
                  Reviewer Justification & Field Corroboration Notes:
                </label>
                <textarea
                  rows={3}
                  value={notesInput}
                  onChange={(e) => setNotesInput(e.target.value)}
                  placeholder="Record cross-reference notes (e.g. 'Verified with district flood helpline dispatch #402. Water level rising on Ring Road.')"
                  className="w-full p-3 text-xs rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-[#242B27] dark:text-[#E8EDE9] focus:outline-none focus:ring-1 focus:ring-[#326B54]"
                />
              </div>

              {/* Decision Action Buttons */}
              <div className="space-y-2 pt-2 border-t border-black/5 dark:border-white/10">
                <span className="text-xs font-bold text-[#242B27] dark:text-[#E8EDE9] block">
                  Assign Human Review Verdict:
                </span>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    onClick={() => handleApplyDecision("verified")}
                    className="p-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex flex-col items-center justify-center gap-1.5 shadow transition-colors"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Verified Disaster</span>
                  </button>

                  <button
                    onClick={() => handleApplyDecision("under-review")}
                    className="p-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold flex flex-col items-center justify-center gap-1.5 shadow transition-colors"
                  >
                    <Clock className="w-4 h-4" />
                    <span>Under Review</span>
                  </button>

                  <button
                    onClick={() => handleApplyDecision("false-positive")}
                    className="p-3 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold flex flex-col items-center justify-center gap-1.5 shadow transition-colors"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>False Positive</span>
                  </button>

                  <button
                    onClick={() => handleApplyDecision("duplicate")}
                    className="p-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold flex flex-col items-center justify-center gap-1.5 shadow transition-colors"
                  >
                    <Copy className="w-4 h-4" />
                    <span>Duplicate Report</span>
                  </button>
                </div>
              </div>

              {/* Audit stamp */}
              {activeReport.reviewedBy && (
                <div className="p-3 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/5 dark:border-white/10 flex items-center justify-between text-xs text-[#737A70]">
                  <span>Last Reviewed By: <strong>{activeReport.reviewedBy}</strong></span>
                  <span>{formatDate(activeReport.reviewedAt!)}</span>
                </div>
              )}
            </GlassCard>
          ) : (
            <GlassCard className="p-12 text-center text-xs text-[#737A70]">
              Select a report from the verification queue on the left to review its classification.
            </GlassCard>
          )}
        </div>
      </div>
    </div>
  );
}
