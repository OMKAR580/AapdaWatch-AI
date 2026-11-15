"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useApp } from "@/context/AppContext";
import { GlassCard } from "@/components/ui/GlassCard";
import {
  StatusBadge,
  getSeverityVariant,
  getCategoryVariant,
  getIncidentStatusVariant,
} from "@/components/ui/StatusBadge";
import { useToast } from "@/components/ui/Toast";
import { formatRelativeTime } from "@/lib/utils";
import type { CorrelationSuggestion } from "@/types";
import * as Dialog from "@radix-ui/react-dialog";
import {
  FolderOpen,
  LayoutGrid,
  List,
  Search,
  MapPin,
  Layers,
  Sparkles,
  Check,
  X,
  ExternalLink,
  ChevronRight,
  Info,
} from "lucide-react";

export default function IncidentsPage() {
  const {
    incidents,
    correlationSuggestions,
    acceptCorrelation,
    rejectCorrelation,
    reports,
    searchQuery,
    setSearchQuery,
  } = useApp();
  const { toast } = useToast();

  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 6;

  // Correlation Dialog state
  const [selectedSuggestion, setSelectedSuggestion] = useState<CorrelationSuggestion | null>(null);

  // Create Incident Dialog state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newCategory, setNewCategory] = useState("flood");
  const [newSeverity, setNewSeverity] = useState("medium");
  const [newLocation, setNewLocation] = useState("");
  const [newLat, setNewLat] = useState("19.076");
  const [newLon, setNewLon] = useState("72.8777");
  const [isSubmittingIncident, setIsSubmittingIncident] = useState(false);
  const { createIncident } = useApp();

  const handleCreateIncidentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newLocation.trim()) {
      toast({ title: "Validation Error", description: "Title and Location are required.", variant: "warning" });
      return;
    }

    setIsSubmittingIncident(true);
    try {
      const created = await createIncident({
        title: newTitle.trim(),
        description: newDescription.trim() || "Field incident folder.",
        category: newCategory,
        severity: newSeverity,
        locationName: newLocation.trim(),
        latitude: parseFloat(newLat) || 19.076,
        longitude: parseFloat(newLon) || 72.8777,
      });

      toast({
        title: "Incident Folder Created",
        description: `Dossier ${created.incidentCode} registered and persisted in database.`,
        variant: "success",
      });

      setIsCreateOpen(false);
      setNewTitle("");
      setNewDescription("");
      setNewLocation("");
    } catch (err) {
      toast({
        title: "Creation Failed",
        description: err instanceof Error ? err.message : "Failed to create incident.",
        variant: "error",
      });
    } finally {
      setIsSubmittingIncident(false);
    }
  };

  // Filtered Incidents
  const filteredIncidents = useMemo(() => {
    return incidents.filter((inc) => {
      if (categoryFilter !== "all" && inc.category !== categoryFilter) return false;
      if (severityFilter !== "all" && inc.severity !== severityFilter) return false;
      if (statusFilter !== "all" && inc.status !== statusFilter) return false;
      if (
        searchQuery &&
        !inc.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !inc.incidentCode.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !inc.location.name.toLowerCase().includes(searchQuery.toLowerCase())
      ) {
        return false;
      }
      return true;
    });
  }, [incidents, categoryFilter, severityFilter, statusFilter, searchQuery]);

  // Pagination
  const totalPages = Math.ceil(filteredIncidents.length / pageSize) || 1;
  const paginatedIncidents = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredIncidents.slice(start, start + pageSize);
  }, [filteredIncidents, currentPage, pageSize]);

  // Pending correlation suggestion
  const pendingSuggestion = correlationSuggestions.find((s) => s.status === "pending");
  const correlatedReport = pendingSuggestion
    ? reports.find((r) => r.id === pendingSuggestion.reportId)
    : null;
  const targetIncident = pendingSuggestion
    ? incidents.find((i) => i.id === pendingSuggestion.suggestedIncidentId)
    : null;

  const handleAcceptCorrelation = (reportId: string) => {
    acceptCorrelation(reportId);
    setSelectedSuggestion(null);
    toast({
      title: "Correlation Accepted",
      description: `Report ${reportId} linked to ${targetIncident?.incidentCode}. Incident report count incremented.`,
      variant: "success",
    });
  };

  const handleRejectCorrelation = (reportId: string) => {
    rejectCorrelation(reportId);
    setSelectedSuggestion(null);
    toast({
      title: "Correlation Rejected",
      description: `Report ${reportId} will remain as an independent incident record.`,
      variant: "info",
    });
  };

  return (
    <div className="space-y-6">
      {/* Suggested Correlation Banner (if any) */}
      {pendingSuggestion && correlatedReport && targetIncident && (
        <GlassCard className="p-4 bg-gradient-to-r from-blue-500/10 to-indigo-500/10 border border-blue-500/30 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-[280px]">
            <div className="p-2.5 rounded-xl bg-blue-600 text-white shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#242B27] dark:text-[#E8EDE9]">
                  Correlation Engine Suggestion
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300">
                  {(pendingSuggestion.matchScore * 100).toFixed(0)}% MATCH
                </span>
              </div>
              <p className="text-xs text-[#737A70] dark:text-[#8A9490] mt-0.5">
                New incoming report <strong className="text-[#242B27] dark:text-[#E8EDE9]">{correlatedReport.id}</strong> appears related to incident <strong className="text-[#242B27] dark:text-[#E8EDE9]">{targetIncident.title}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedSuggestion(pendingSuggestion)}
              className="px-4 py-2 rounded-xl bg-[#326B54] hover:bg-[#294B39] text-white text-xs font-semibold shadow transition-colors"
            >
              Review Grouping
            </button>
            <button
              onClick={() => handleRejectCorrelation(pendingSuggestion.reportId)}
              className="p-2 rounded-xl text-[#737A70] hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              title="Dismiss Suggestion"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </GlassCard>
      )}

      {/* Filters & View Toggle */}
      <GlassCard className="p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#737A70]" />
            <input
              type="text"
              suppressHydrationWarning
              placeholder="Search by code, title, city..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-8 pr-8 py-1.5 text-xs rounded-xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 text-[#242B27] dark:text-[#E8EDE9] placeholder:text-[#737A70] focus:outline-none focus:ring-1 focus:ring-[#326B54]"
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setCurrentPage(1);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded text-[#737A70] hover:text-[#242B27] dark:hover:text-[#E8EDE9]"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Category */}
          <select
            suppressHydrationWarning
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-1.5 text-xs rounded-xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 text-[#242B27] dark:text-[#E8EDE9] focus:outline-none"
          >
            <option value="all">All Categories</option>
            <option value="flood">Flood</option>
            <option value="earthquake">Earthquake</option>
            <option value="fire">Fire</option>
            <option value="cyclone">Cyclone</option>
            <option value="landslide">Landslide</option>
            <option value="other">Other</option>
          </select>

          {/* Severity */}
          <select
            suppressHydrationWarning
            value={severityFilter}
            onChange={(e) => {
              setSeverityFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-1.5 text-xs rounded-xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 text-[#242B27] dark:text-[#E8EDE9] focus:outline-none"
          >
            <option value="all">All Severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          {/* Status */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-1.5 text-xs rounded-xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 text-[#242B27] dark:text-[#E8EDE9] focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="unreviewed">Unreviewed</option>
            <option value="under-review">Under Review</option>
            <option value="verified">Verified</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>

        {/* Actions & View Toggle */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#326B54] hover:bg-[#294B39] text-white text-xs font-semibold shadow transition-colors"
          >
            <FolderOpen className="w-3.5 h-3.5" />
            <span>New Incident</span>
          </button>

          <div className="flex items-center gap-1 p-1 rounded-xl bg-black/5 dark:bg-white/5">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded-lg text-xs transition-colors ${
                viewMode === "grid"
                  ? "bg-white dark:bg-[#1A2420] text-[#326B54] dark:text-[#DCE9DA] shadow-sm font-semibold"
                  : "text-[#737A70]"
              }`}
              aria-label="Grid view"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-1.5 rounded-lg text-xs transition-colors ${
                viewMode === "list"
                  ? "bg-white dark:bg-[#1A2420] text-[#326B54] dark:text-[#DCE9DA] shadow-sm font-semibold"
                  : "text-[#737A70]"
              }`}
              aria-label="List view"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </GlassCard>

      {/* Grid or List View */}
      {filteredIncidents.length === 0 ? (
        <GlassCard className="p-12 text-center">
          <FolderOpen className="w-10 h-10 text-[#737A70] mx-auto mb-2" />
          <h4 className="text-sm font-bold text-[#242B27] dark:text-[#E8EDE9]">No Incidents Match Filter</h4>
          <p className="text-xs text-[#737A70] mt-1">Try resetting the category or severity filters above.</p>
        </GlassCard>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {paginatedIncidents.map((inc) => (
            <Link key={inc.id} href={`/incidents/${inc.id}`}>
              <GlassCard
                hover
                className={`p-5 flex flex-col justify-between h-full border-t-4 transition-all ${
                  inc.severity === "critical"
                    ? "border-t-red-500"
                    : inc.severity === "high"
                    ? "border-t-amber-500"
                    : inc.severity === "medium"
                    ? "border-t-blue-500"
                    : "border-t-green-500"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[10px] font-bold tracking-wider text-[#326B54] dark:text-[#DCE9DA] uppercase">
                      {inc.incidentCode}
                    </span>
                    <span className="text-[10px] text-[#737A70]">
                      Updated {formatRelativeTime(inc.updatedAt)}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-[#242B27] dark:text-[#E8EDE9] line-clamp-2 leading-snug mb-2">
                    {inc.title}
                  </h3>

                  <div className="flex flex-wrap items-center gap-1.5 mb-3">
                    <StatusBadge variant={getCategoryVariant(inc.category)} />
                    <StatusBadge variant={getSeverityVariant(inc.severity)} />
                    <StatusBadge variant={getIncidentStatusVariant(inc.status)} />
                  </div>

                  <div className="flex items-center gap-1.5 text-xs text-[#737A70] mb-2">
                    <MapPin className="w-3.5 h-3.5 text-[#326B54] shrink-0" />
                    <span className="truncate">{inc.location.name}</span>
                  </div>

                  <p className="text-xs text-[#737A70] dark:text-[#8A9490] line-clamp-2 leading-relaxed">
                    {inc.description}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-4 mt-4 border-t border-black/5 dark:border-white/10 text-xs">
                  <div className="flex items-center gap-1.5 text-[#242B27] dark:text-[#E8EDE9] font-semibold">
                    <Layers className="w-3.5 h-3.5 text-[#326B54]" />
                    <span>{inc.reportCount} Correlated Reports</span>
                  </div>
                  <span className="text-[#326B54] font-semibold flex items-center gap-0.5 hover:underline">
                    Dossier <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </GlassCard>
            </Link>
          ))}
        </div>
      ) : (
        <GlassCard padding="none" className="overflow-hidden border border-black/5 dark:border-white/10">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-black/5 dark:bg-white/5 border-b border-black/5 dark:border-white/10 text-[#737A70]">
                <tr>
                  <th className="p-3">Incident Code</th>
                  <th className="p-3">Title</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Location</th>
                  <th className="p-3">Severity</th>
                  <th className="p-3">Reports</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5 dark:divide-white/5">
                {paginatedIncidents.map((inc) => (
                  <tr key={inc.id} className="hover:bg-black/[0.02] dark:hover:bg-white/[0.02]">
                    <td className="p-3 font-mono font-bold text-[#326B54] dark:text-[#DCE9DA]">
                      {inc.incidentCode}
                    </td>
                    <td className="p-3 font-medium text-[#242B27] dark:text-[#E8EDE9] max-w-xs truncate">
                      {inc.title}
                    </td>
                    <td className="p-3">
                      <StatusBadge variant={getCategoryVariant(inc.category)} />
                    </td>
                    <td className="p-3 text-[#737A70]">{inc.location.name}</td>
                    <td className="p-3">
                      <StatusBadge variant={getSeverityVariant(inc.severity)} />
                    </td>
                    <td className="p-3 font-semibold">{inc.reportCount}</td>
                    <td className="p-3">
                      <StatusBadge variant={getIncidentStatusVariant(inc.status)} />
                    </td>
                    <td className="p-3 text-right">
                      <Link
                        href={`/incidents/${inc.id}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#326B54]/10 hover:bg-[#326B54] text-[#326B54] hover:text-white transition-colors font-semibold text-[11px]"
                      >
                        <span>Open</span>
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-[#737A70] px-2">
          <span>
            Page {currentPage} of {totalPages} ({filteredIncidents.length} total incidents)
          </span>
          <div className="flex items-center gap-2">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1.5 rounded-xl bg-white dark:bg-[#1A2420] border border-black/10 dark:border-white/10 disabled:opacity-40"
            >
              Previous
            </button>
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="px-3 py-1.5 rounded-xl bg-white dark:bg-[#1A2420] border border-black/10 dark:border-white/10 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Correlation Review Dialog */}
      <Dialog.Root open={!!selectedSuggestion} onOpenChange={(open) => !open && setSelectedSuggestion(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm animate-in fade-in" />
          <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-lg rounded-2xl bg-white dark:bg-[#1A2420] p-6 shadow-2xl border border-black/10 dark:border-white/10 space-y-4 animate-in fade-in-50 zoom-in-95">
            <div className="flex items-center justify-between border-b border-black/5 dark:border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-blue-600" />
                <Dialog.Title className="text-sm font-bold text-[#242B27] dark:text-[#E8EDE9]">
                  Review Suggested Correlation
                </Dialog.Title>
              </div>
              <Dialog.Close className="p-1 rounded-lg text-[#737A70] hover:bg-black/5 dark:hover:bg-white/5">
                <X className="w-4 h-4" />
              </Dialog.Close>
            </div>

            {selectedSuggestion && correlatedReport && targetIncident && (
              <div className="space-y-4 text-xs">
                {/* Incoming report */}
                <div className="bg-black/5 dark:bg-white/5 p-3 rounded-xl space-y-1">
                  <span className="text-[10px] font-bold text-[#737A70] uppercase">Incoming Unassociated Report</span>
                  <p className="text-xs text-[#242B27] dark:text-[#E8EDE9] font-medium">
                    &ldquo;{correlatedReport.text}&rdquo;
                  </p>
                  <div className="flex items-center gap-2 text-[10px] text-[#737A70] pt-1">
                    <span>Source: {correlatedReport.source}</span>
                    <span>·</span>
                    <span>Model Confidence: {(correlatedReport.confidence! * 100).toFixed(0)}%</span>
                  </div>
                </div>

                {/* Target incident */}
                <div className="bg-[#DCE9DA]/30 dark:bg-[#326B54]/20 p-3 rounded-xl border border-[#326B54]/20 space-y-1">
                  <span className="text-[10px] font-bold text-[#326B54] uppercase">Target Incident Folder</span>
                  <h4 className="text-xs font-bold text-[#242B27] dark:text-[#E8EDE9]">
                    {targetIncident.incidentCode}: {targetIncident.title}
                  </h4>
                  <p className="text-[11px] text-[#737A70] dark:text-[#8A9490]">
                    Location: {targetIncident.location.name} | Category: {targetIncident.category}
                  </p>
                </div>

                {/* Match reasons */}
                <div className="space-y-1.5">
                  <span className="font-semibold text-[#242B27] dark:text-[#E8EDE9]">
                    Algorithm Matching Criteria:
                  </span>
                  <ul className="space-y-1 text-[#737A70]">
                    {selectedSuggestion.reasons.map((r: string, idx: number) => (
                      <li key={idx} className="flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                        <span>{r}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-300 text-[11px]">
                  <strong>Human Verification Rule:</strong> NLP semantic correlation groups candidate reports, but does not independently verify physical truth. A human reviewer confirms this grouping.
                </div>

                {/* Action buttons */}
                <div className="flex items-center justify-end gap-3 pt-3 border-t border-black/5 dark:border-white/10">
                  <button
                    onClick={() => handleRejectCorrelation(selectedSuggestion.reportId)}
                    className="px-4 py-2 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-black/10 text-xs font-semibold text-[#737A70] transition-colors"
                  >
                    Reject & Keep Separate
                  </button>
                  <button
                    onClick={() => handleAcceptCorrelation(selectedSuggestion.reportId)}
                    className="px-5 py-2 rounded-xl bg-[#326B54] hover:bg-[#294B39] text-white text-xs font-semibold shadow transition-colors flex items-center gap-1.5"
                  >
                    <Check className="w-4 h-4" />
                    <span>Confirm & Merge into Folder</span>
                  </button>
                </div>
              </div>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Create Incident Modal Dialog */}
      <Dialog.Root open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 animate-fade-in" />
          <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg glass-card p-6 rounded-3xl shadow-2xl z-50 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-black/5 dark:border-white/10">
              <Dialog.Title className="text-base font-bold text-[#242B27] dark:text-[#E8EDE9] flex items-center gap-2">
                <FolderOpen className="w-5 h-5 text-[#326B54]" />
                <span>Create Disaster Incident Folder</span>
              </Dialog.Title>
              <Dialog.Close asChild>
                <button
                  className="p-1 rounded-lg text-[#737A70] hover:bg-black/5 dark:hover:bg-white/5"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </Dialog.Close>
            </div>

            <form onSubmit={handleCreateIncidentSubmit} className="space-y-4 pt-4 text-xs">
              <div>
                <label className="font-semibold text-[#242B27] dark:text-[#E8EDE9] block mb-1">
                  Incident Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mumbai Suburban Flash Flood"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 text-[#242B27] dark:text-[#E8EDE9] focus:outline-none focus:ring-1 focus:ring-[#326B54]"
                />
              </div>

              <div>
                <label className="font-semibold text-[#242B27] dark:text-[#E8EDE9] block mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Describe situational impact and ongoing hazards..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 text-[#242B27] dark:text-[#E8EDE9] focus:outline-none focus:ring-1 focus:ring-[#326B54]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-[#242B27] dark:text-[#E8EDE9] block mb-1">
                    Disaster Category
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 text-[#242B27] dark:text-[#E8EDE9] focus:outline-none"
                  >
                    <option value="flood">Flood</option>
                    <option value="earthquake">Earthquake</option>
                    <option value="fire">Fire</option>
                    <option value="cyclone">Cyclone</option>
                    <option value="landslide">Landslide</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-[#242B27] dark:text-[#E8EDE9] block mb-1">
                    Operational Severity
                  </label>
                  <select
                    value={newSeverity}
                    onChange={(e) => setNewSeverity(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 text-[#242B27] dark:text-[#E8EDE9] focus:outline-none"
                  >
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-[#242B27] dark:text-[#E8EDE9] block mb-1">
                  Location Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Kurla East, Mumbai"
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 text-[#242B27] dark:text-[#E8EDE9] focus:outline-none focus:ring-1 focus:ring-[#326B54]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-[#242B27] dark:text-[#E8EDE9] block mb-1">
                    Latitude [-90, 90]
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    value={newLat}
                    onChange={(e) => setNewLat(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 text-[#242B27] dark:text-[#E8EDE9] focus:outline-none focus:ring-1 focus:ring-[#326B54]"
                  />
                </div>
                <div>
                  <label className="font-semibold text-[#242B27] dark:text-[#E8EDE9] block mb-1">
                    Longitude [-180, 180]
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    value={newLon}
                    onChange={(e) => setNewLon(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 text-[#242B27] dark:text-[#E8EDE9] focus:outline-none focus:ring-1 focus:ring-[#326B54]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-black/5 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-black/10 text-xs font-semibold text-[#737A70] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingIncident}
                  className="px-5 py-2 rounded-xl bg-[#326B54] hover:bg-[#294B39] text-white text-xs font-semibold shadow transition-colors"
                >
                  {isSubmittingIncident ? "Creating..." : "Save to Database"}
                </button>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
