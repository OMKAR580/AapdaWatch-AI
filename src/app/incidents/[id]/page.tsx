"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useApp } from "@/context/AppContext";
import { GlassCard } from "@/components/ui/GlassCard";
import { IncidentMap } from "@/components/map/IncidentMap";
import {
  StatusBadge,
  getSeverityVariant,
  getCategoryVariant,
  getVerificationVariant,
  getIncidentStatusVariant,
  getPredictedClassVariant,
} from "@/components/ui/StatusBadge";
import { useToast } from "@/components/ui/Toast";
import { formatDate, formatRelativeTime } from "@/lib/utils";
import type { Incident, DisasterReport, IncidentStatus } from "@/types";
import {
  ArrowLeft,
  MapPin,
  Calendar,
  Layers,
  ShieldCheck,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileText,
  Info,
  ChevronDown,
  ChevronUp,
  Globe,
} from "lucide-react";

export default function IncidentDetailPage() {
  const params = useParams();
  const { incidents, reports, updateIncidentStatus } = useApp();
  const { toast } = useToast();

  const id = params?.id as string;
  const [fetchedIncident, setFetchedIncident] = useState<(Incident & { reports: DisasterReport[] }) | null>(null);

  const localIncident = incidents.find((i) => i.id === id || i.incidentCode === id);
  const incident = fetchedIncident || localIncident;
  const [isFetching, setIsFetching] = useState(!localIncident);

  React.useEffect(() => {
    let active = true;
    if (id) {
      (async () => {
        try {
          const { apiClient } = await import("@/services/api.client");
          const res = await apiClient.incidents.get(id);
          if (active && res) {
            setFetchedIncident(res);
          }
        } catch {
          // Keep local match if available
        } finally {
          if (active) {
            setIsFetching(false);
          }
        }
      })();
    }
    return () => {
      active = false;
    };
  }, [id]);

  const [expandedReports, setExpandedReports] = useState<Record<string, boolean>>({});

  if (isFetching && !incident) {
    return (
      <div className="py-20 text-center text-xs text-[#737A70] flex flex-col items-center justify-center gap-3">
        <div className="w-5 h-5 border-2 border-[#326B54] border-t-transparent rounded-full animate-spin" />
        <span>Loading incident dossier from database...</span>
      </div>
    );
  }

  if (!incident) {
    return (
      <div className="space-y-4 max-w-md mx-auto py-16 text-center">
        <GlassCard className="p-8 space-y-4">
          <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto" />
          <h2 className="text-base font-bold text-[#242B27] dark:text-[#E8EDE9]">
            Incident Dossier Not Found
          </h2>
          <p className="text-xs text-[#737A70]">
            The incident folder with identifier &ldquo;{id}&rdquo; does not exist or has been archived.
          </p>
          <Link
            href="/incidents"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#326B54] text-white text-xs font-semibold"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Incident Folders</span>
          </Link>
        </GlassCard>
      </div>
    );
  }

  // Associated reports from fetched dossier or local context
  const associatedReports: DisasterReport[] =
    fetchedIncident?.reports || reports.filter((r) => r.incidentId === incident.id);

  const toggleReportExpand = (reportId: string) => {
    setExpandedReports((prev) => ({ ...prev, [reportId]: !prev[reportId] }));
  };

  const handleStatusChange = (newStatus: IncidentStatus) => {
    updateIncidentStatus(incident.id, newStatus);
    toast({
      title: "Incident Status Updated",
      description: `${incident.incidentCode} status is now marked as "${newStatus.replace("-", " ")}".`,
      variant: "success",
    });
  };

  return (
    <div className="space-y-6">
      {/* Back link */}
      <div>
        <Link
          href="/incidents"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-[#737A70] hover:text-[#326B54] dark:hover:text-[#DCE9DA] transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to All Incident Folders</span>
        </Link>
      </div>

      {/* Main Header Card */}
      <GlassCard className="p-6 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-mono font-bold tracking-wider text-[#326B54] dark:text-[#DCE9DA] uppercase bg-[#DCE9DA] dark:bg-[#326B54]/40 px-2.5 py-0.5 rounded-lg">
                {incident.incidentCode}
              </span>
              <span className="text-xs text-[#737A70]">
                Last updated {formatRelativeTime(incident.updatedAt)}
              </span>
            </div>
            <h1 className="text-xl md:text-2xl font-bold text-[#242B27] dark:text-[#E8EDE9] leading-tight">
              {incident.title}
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge size="md" variant={getSeverityVariant(incident.severity)} />
            <StatusBadge size="md" variant={getCategoryVariant(incident.category)} />
            <StatusBadge size="md" variant={getIncidentStatusVariant(incident.status)} />
          </div>
        </div>

        {/* Location & Meta strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-black/5 dark:border-white/10 text-xs">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-[#326B54] shrink-0" />
            <div>
              <p className="text-[#737A70] text-[11px]">Location</p>
              <p className="font-semibold text-[#242B27] dark:text-[#E8EDE9]">
                {incident.location.name} ({incident.location.latitude.toFixed(2)}°N, {incident.location.longitude.toFixed(2)}°E)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#326B54] shrink-0" />
            <div>
              <p className="text-[#737A70] text-[11px]">First Reported</p>
              <p className="font-semibold text-[#242B27] dark:text-[#E8EDE9]">
                {formatDate(incident.createdAt)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#326B54] shrink-0" />
            <div>
              <p className="text-[#737A70] text-[11px]">Total Correlated Reports</p>
              <p className="font-semibold text-[#242B27] dark:text-[#E8EDE9]">
                {associatedReports.length} Dispatches Linked
              </p>
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="p-4 rounded-xl bg-black/5 dark:bg-white/5">
          <h4 className="text-xs font-bold text-[#242B27] dark:text-[#E8EDE9] mb-1">Incident Summary:</h4>
          <p className="text-xs text-[#737A70] dark:text-[#8A9490] leading-relaxed">
            {incident.description}
          </p>
        </div>

        {/* Important Concept Distinction Callout */}
        <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-900 dark:text-blue-300 text-xs flex items-start gap-3">
          <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold">Human Verification vs Machine Classification:</span>
            <p className="leading-relaxed text-[11px] opacity-90">
              The NLP model calculates text similarity and disaster probability. However, human reviewers in the Verification Center assign factual confirmation. A high prediction score does not confirm an incident is physically verified.
            </p>
          </div>
        </div>
      </GlassCard>

      {/* Geospatial Telemetry & Intercontinental Arc Map */}
      <GlassCard className="p-5 space-y-3 border border-black/5 dark:border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-[#326B54]" />
            <h3 className="text-sm font-bold text-[#242B27] dark:text-[#E8EDE9]">
              Geospatial Telemetry & Cross-Border Correlation
            </h3>
          </div>
          <Link
            href="/map"
            className="text-[11px] font-semibold text-[#326B54] dark:text-emerald-400 hover:underline flex items-center gap-1"
          >
            <span>Open Fullscreen Live Map →</span>
          </Link>
        </div>
        <div className="rounded-xl overflow-hidden border border-black/10 dark:border-white/10">
          <IncidentMap
            incidents={[incident]}
            onIncidentClick={() => {}}
            selectedIncidentId={incident.id}
          />
        </div>
      </GlassCard>

      {/* Main Content Grid: 2/3 Reports + 1/3 Status Actions & Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Associated Reports (2/3) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#242B27] dark:text-[#E8EDE9]">
              Correlated Reports ({associatedReports.length})
            </h3>
            <span className="text-xs text-[#737A70]">Grouped by time & location proximity</span>
          </div>

          {associatedReports.length === 0 ? (
            <GlassCard className="p-8 text-center text-xs text-[#737A70]">
              No individual reports are currently linked to this incident folder.
            </GlassCard>
          ) : (
            <div className="space-y-3">
              {associatedReports.map((rpt) => {
                const isExpanded = expandedReports[rpt.id];
                return (
                  <GlassCard key={rpt.id} className="p-4 space-y-3 border border-black/5 dark:border-white/10">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-[#326B54]" />
                        <span className="text-xs font-mono font-bold text-[#242B27] dark:text-[#E8EDE9]">
                          {rpt.id}
                        </span>
                        <span className="text-[10px] text-[#737A70]">via {rpt.source}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <StatusBadge
                          variant={getPredictedClassVariant(rpt.predictedClass)}
                          label={rpt.predictedClass === "disaster-related" ? "Disaster" : "Non-Disaster"}
                        />
                        <StatusBadge variant={getVerificationVariant(rpt.verificationStatus)} />
                      </div>
                    </div>

                    {/* Report text */}
                    <p className={`text-xs text-[#242B27] dark:text-[#E8EDE9] leading-relaxed ${!isExpanded ? "line-clamp-2" : ""}`}>
                      &ldquo;{rpt.text}&rdquo;
                    </p>

                    {/* Expand/collapse button */}
                    {rpt.text.length > 120 && (
                      <button
                        onClick={() => toggleReportExpand(rpt.id)}
                        className="text-[11px] text-[#326B54] hover:underline flex items-center gap-1 font-medium"
                      >
                        {isExpanded ? (
                          <>
                            <span>Show less</span>
                            <ChevronUp className="w-3 h-3" />
                          </>
                        ) : (
                          <>
                            <span>Show full report</span>
                            <ChevronDown className="w-3 h-3" />
                          </>
                        )}
                      </button>
                    )}

                    {/* Metadata strip */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-black/5 dark:border-white/10 text-[11px] text-[#737A70]">
                      <span>Timestamp: {formatDate(rpt.timestamp)}</span>
                      <span>
                        Model Probability: <strong>{((rpt.disasterProbability ?? rpt.confidence ?? 0.9) * 100).toFixed(0)}%</strong> ({rpt.modelVersion ?? "Bi-LSTM"})
                      </span>
                    </div>

                    {rpt.reviewerNotes && (
                      <div className="p-2 rounded-lg bg-black/5 dark:bg-white/5 text-[11px] text-[#737A70]">
                        <span className="font-semibold text-[#242B27] dark:text-[#E8EDE9]">Reviewer Note: </span>
                        {rpt.reviewerNotes}
                      </div>
                    )}
                  </GlassCard>
                );
              })}
            </div>
          )}
        </div>

        {/* Status Actions & Audit Timeline (1/3) */}
        <div className="lg:col-span-1 space-y-5">
          {/* Status Transition Card */}
          <GlassCard className="p-5 space-y-3">
            <h4 className="text-xs font-bold text-[#242B27] dark:text-[#E8EDE9] uppercase tracking-wider">
              Manage Incident Lifecycle
            </h4>
            <p className="text-xs text-[#737A70]">
              Current status: <strong className="text-[#326B54] capitalize">{incident.status.replace("-", " ")}</strong>
            </p>

            <div className="space-y-2 pt-1">
              <button
                onClick={() => handleStatusChange("under-review")}
                disabled={incident.status === "under-review"}
                className="w-full py-2 px-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-800 dark:text-amber-300 text-xs font-semibold border border-amber-500/30 transition-colors disabled:opacity-40 text-left flex items-center justify-between"
              >
                <span>Move to Under Review</span>
                <Clock className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => handleStatusChange("verified")}
                disabled={incident.status === "verified"}
                className="w-full py-2 px-3 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-xs font-semibold border border-emerald-500/30 transition-colors disabled:opacity-40 text-left flex items-center justify-between"
              >
                <span>Mark Officially Verified</span>
                <CheckCircle2 className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => handleStatusChange("resolved")}
                disabled={incident.status === "resolved"}
                className="w-full py-2 px-3 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-black/10 text-[#242B27] dark:text-[#E8EDE9] text-xs font-semibold border border-black/10 transition-colors disabled:opacity-40 text-left flex items-center justify-between"
              >
                <span>Mark Situation Resolved</span>
                <ShieldCheck className="w-3.5 h-3.5" />
              </button>
            </div>
          </GlassCard>

          {/* Timeline Card */}
          <GlassCard className="p-5 space-y-3">
            <h4 className="text-xs font-bold text-[#242B27] dark:text-[#E8EDE9] uppercase tracking-wider">
              Incident Audit Timeline
            </h4>

            <div className="relative pl-5 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-black/10 dark:before:bg-white/10">
              <div className="relative">
                <span className="absolute -left-[17px] top-1 w-2.5 h-2.5 rounded-full bg-[#326B54]"></span>
                <p className="text-xs font-semibold text-[#242B27] dark:text-[#E8EDE9]">Incident Folder Created</p>
                <p className="text-[10px] text-[#737A70]">{formatDate(incident.createdAt)}</p>
              </div>

              {associatedReports.map((r) => (
                <div key={r.id} className="relative">
                  <span className="absolute -left-[17px] top-1 w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                  <p className="text-xs font-medium text-[#242B27] dark:text-[#E8EDE9]">
                    Report {r.id} Correlated
                  </p>
                  <p className="text-[10px] text-[#737A70]">{formatRelativeTime(r.timestamp)}</p>
                </div>
              ))}

              <div className="relative">
                <span className="absolute -left-[17px] top-1 w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                <p className="text-xs font-semibold text-[#242B27] dark:text-[#E8EDE9]">
                  Current Status: {incident.status}
                </p>
                <p className="text-[10px] text-[#737A70]">Last updated {formatRelativeTime(incident.updatedAt)}</p>
              </div>
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
