"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { GlassCard } from "@/components/ui/GlassCard";
import { formatRelativeTime } from "@/lib/utils";
import type { Incident } from "@/types";
import {
  AlertTriangle,
  Waves,
  Flame,
  Activity,
  Wind,
  Mountain,
  CheckCircle,
  ArrowRight,
  ShieldAlert,
} from "lucide-react";

interface RecentIncidentsProps {
  incidents: Incident[];
}

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  flood: Waves,
  fire: Flame,
  earthquake: Activity,
  cyclone: Wind,
  landslide: Mountain,
  other: AlertTriangle,
};

export function RecentIncidents({ incidents }: RecentIncidentsProps) {
  const router = useRouter();
  const recent = incidents.slice(0, 5);

  return (
    <GlassCard padding="none" className="flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--gw-line)]">
        <div>
          <h3 className="font-semibold text-[var(--gw-ink)] text-sm tracking-tight">
            Recent Incidents
          </h3>
          <p className="text-[11px] text-[var(--gw-muted)] mt-0.5">
            Active dossiers & correlated field signals
          </p>
        </div>
        <Link
          href="/incidents"
          className="text-xs font-medium text-[var(--gw-ink)] hover:underline flex items-center gap-1 group"
        >
          View all
          <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>

      {recent.length === 0 ? (
        <div className="text-center py-12 px-4 text-xs text-[var(--gw-muted)]">
          <ShieldAlert className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>No incidents recorded yet.</p>
          <Link
            href="/analyze"
            className="inline-block mt-2 text-[var(--gw-ink)] font-semibold underline"
          >
            Classify a new disaster report →
          </Link>
        </div>
      ) : (
        <div className="divide-y divide-[var(--gw-line)]">
          {recent.map((inc) => {
            const Icon = CATEGORY_ICONS[inc.category] || AlertTriangle;
            return (
              <div
                key={inc.id}
                onClick={() => router.push(`/incidents/${inc.id}`)}
                className="flex items-center justify-between px-5 py-3.5 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-black/5 dark:bg-white/10 flex items-center justify-center shrink-0 text-[var(--gw-ink)]">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-[var(--gw-ink)] truncate leading-tight">
                      {inc.title}
                    </p>
                    <p className="text-[11px] text-[var(--gw-muted)] truncate mt-0.5">
                      {inc.location?.name || "Unknown Area"} • {formatRelativeTime(inc.createdAt)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0 ml-3">
                  <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                    <CheckCircle className="w-2.5 h-2.5" />
                    {inc.status || "Active"}
                  </span>

                  <span className="text-xs font-semibold font-mono text-[var(--gw-ink)]">
                    {inc.reportCount || 1} rpts
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </GlassCard>
  );
}
