"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useApp } from "@/context/AppContext";
import { IncidentMap } from "@/components/map/IncidentMap";
import { GlassCard } from "@/components/ui/GlassCard";
import { LocationMap } from "@/components/ui/expand-map";
import type { Incident } from "@/types";
import { Search } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function LiveMapPage() {
  const router = useRouter();
  const { incidents } = useApp();

  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchLocation, setSearchLocation] = useState<string>("");

  const filteredIncidents = useMemo(() => {
    return incidents.filter((inc) => {
      if (categoryFilter !== "all" && inc.category !== categoryFilter) return false;
      if (severityFilter !== "all" && inc.severity !== severityFilter) return false;
      if (statusFilter !== "all" && inc.verificationStatus !== statusFilter) return false;
      if (
        searchLocation &&
        !inc.location.name.toLowerCase().includes(searchLocation.toLowerCase()) &&
        !inc.title.toLowerCase().includes(searchLocation.toLowerCase())
      ) {
        return false;
      }
      return true;
    });
  }, [incidents, categoryFilter, severityFilter, statusFilter, searchLocation]);

  return (
    <div className="space-y-5">
      {/* Filter and Search Bar */}
      <GlassCard className="flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
          {/* Search location */}
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--gw-muted)]" />
            <input
              type="text"
              suppressHydrationWarning
              placeholder="Search by city or state..."
              value={searchLocation}
              onChange={(e) => setSearchLocation(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-black/5 dark:bg-white/5 border border-[var(--gw-line)] text-[var(--gw-ink)] placeholder-[var(--gw-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--gw-accent)]"
            />
          </div>

          {/* Category Filter */}
          <select
            suppressHydrationWarning
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-1.5 text-xs rounded-xl bg-black/5 dark:bg-white/5 border border-[var(--gw-line)] text-[var(--gw-ink)] focus:outline-none"
          >
            <option value="all">All Categories</option>
            <option value="flood">Flood</option>
            <option value="earthquake">Earthquake</option>
            <option value="fire">Fire</option>
            <option value="cyclone">Cyclone</option>
            <option value="landslide">Landslide</option>
            <option value="other">Other</option>
          </select>

          {/* Severity Filter */}
          <select
            suppressHydrationWarning
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="px-3 py-1.5 text-xs rounded-xl bg-black/5 dark:bg-white/5 border border-[var(--gw-line)] text-[var(--gw-ink)] focus:outline-none"
          >
            <option value="all">All Severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          {/* Verification Status */}
          <select
            suppressHydrationWarning
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 text-xs rounded-xl bg-black/5 dark:bg-white/5 border border-[var(--gw-line)] text-[var(--gw-ink)] focus:outline-none"
          >
            <option value="all">All Verification</option>
            <option value="verified">Verified</option>
            <option value="under-review">Under Review</option>
            <option value="unreviewed">Unreviewed</option>
          </select>
        </div>

        {/* Status Count badge */}
        <div className="flex items-center gap-2 text-xs text-[var(--gw-muted)]">
          <span>
            Showing <strong className="text-[var(--gw-ink)]">{filteredIncidents.length}</strong> of {incidents.length} incidents
          </span>
        </div>
      </GlassCard>

      {/* Main Map + Side Panel Layout */}
      <div className="relative w-full space-y-4">
        {/* Full-Width Map Container with Floating Dossier */}
        <div className="relative w-full">
          <GlassCard padding="none" className="overflow-hidden border border-[var(--gw-line)]">
            <IncidentMap
              incidents={filteredIncidents}
              onIncidentClick={(inc) => setSelectedIncident(inc)}
              selectedIncidentId={selectedIncident?.id}
            />
          </GlassCard>

          {/* 3D Expandable Incident Card when an incident marker is clicked */}
          <AnimatePresence>
            {selectedIncident && (
              <motion.div
                key={selectedIncident.id}
                initial={{ opacity: 0, scale: 0.9, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 15 }}
                transition={{ duration: 0.25 }}
                className="absolute top-4 right-4 z-40"
              >
                <LocationMap
                  title={selectedIncident.title}
                  location={selectedIncident.location.name}
                  coordinates={`${selectedIncident.location.latitude.toFixed(4)}° N, ${selectedIncident.location.longitude.toFixed(4)}° E`}
                  category={selectedIncident.category}
                  severity={selectedIncident.severity}
                  reportCount={selectedIncident.reportCount}
                  status={selectedIncident.verificationStatus}
                  initialExpanded={true}
                  onClose={() => setSelectedIncident(null)}
                  onViewDossier={() => router.push(`/incidents/${selectedIncident.id}`)}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Map Marker Legend */}
        <GlassCard className="flex flex-wrap items-center justify-between gap-4 py-3 px-4 text-xs">
          <span className="font-semibold text-[var(--gw-ink)]">Marker Legend:</span>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#EF4444] shadow-sm animate-pulse" />
              <span className="text-[var(--gw-muted)]">Critical (Pulsing)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]" />
              <span className="text-[var(--gw-muted)]">High Severity</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#3B82F6]" />
              <span className="text-[var(--gw-muted)]">Medium / Low</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#10B981]" />
              <span className="text-[var(--gw-muted)]">Resolved / Verified</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#9CA3AF]" />
              <span className="text-[var(--gw-muted)]">Unreviewed</span>
            </div>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
