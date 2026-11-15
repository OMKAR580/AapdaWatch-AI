"use client";

import React from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import { formatRelativeTime } from "@/lib/utils";
import { useApp } from "@/context/AppContext";
import {
  FileText,
  FolderPlus,
  CheckCircle,
  RefreshCw,
  Database,
  Activity,
} from "lucide-react";

export function ActivityFeed() {
  const { reports, incidents } = useApp();

  const dynamicActivities = React.useMemo(() => {
    const list: Array<{
      id: string;
      type: string;
      title: string;
      description: string;
      timestamp: string;
    }> = [];

    reports.slice(0, 5).forEach((r) => {
      list.push({
        id: `rep-${r.id}`,
        type: "report_added",
        title: "Report Ingested",
        description: `${r.source || "Field dispatch"}: "${r.text.slice(0, 50)}..."`,
        timestamp: r.timestamp,
      });
    });

    incidents.slice(0, 5).forEach((inc) => {
      list.push({
        id: `inc-${inc.id}`,
        type: "incident_created",
        title: `Dossier ${inc.incidentCode}`,
        description: `${inc.title} (${inc.location.name})`,
        timestamp: inc.createdAt,
      });
    });

    return list.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [reports, incidents]);

  const getIcon = (type: string) => {
    switch (type) {
      case "report_added":
        return <FileText className="w-3.5 h-3.5 text-blue-500" />;
      case "incident_created":
        return <FolderPlus className="w-3.5 h-3.5 text-amber-500" />;
      case "incident_verified":
        return <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />;
      case "status_changed":
        return <RefreshCw className="w-3.5 h-3.5 text-purple-500" />;
      case "batch_completed":
        return <Database className="w-3.5 h-3.5 text-indigo-500" />;
      default:
        return <Activity className="w-3.5 h-3.5 text-[var(--gw-accent)]" />;
    }
  };

  return (
    <GlassCard padding="none" className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--gw-line)]">
        <div>
          <h3 className="font-semibold text-[var(--gw-ink)] text-sm tracking-tight">
            Activity Stream
          </h3>
          <p className="text-[11px] text-[var(--gw-muted)] mt-0.5">
            Audit log of AI and reviewer operations
          </p>
        </div>
        <span className="text-[10px] font-semibold text-[var(--gw-muted)] bg-black/5 dark:bg-white/5 px-2 py-0.5 rounded-full">
          Live Sync
        </span>
      </div>

      <div className="divide-y divide-[var(--gw-line)] overflow-y-auto max-h-[380px] p-2">
        {dynamicActivities.length === 0 ? (
          <div className="p-8 text-center text-xs text-[var(--gw-muted)]">
            No activity records yet.
          </div>
        ) : (
          dynamicActivities.map((item) => (
            <div
              key={item.id}
              className="flex items-start gap-3 p-3 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            >
              <div className="p-2 rounded-lg bg-black/5 dark:bg-white/10 shrink-0 mt-0.5">
                {getIcon(item.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <p className="text-xs font-semibold text-[var(--gw-ink)] truncate">
                    {item.title}
                  </p>
                  <span className="text-[10px] text-[var(--gw-muted)] shrink-0">
                    {formatRelativeTime(item.timestamp)}
                  </span>
                </div>
                <p className="text-[11px] text-[var(--gw-muted)] line-clamp-2 mt-0.5">
                  {item.description}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </GlassCard>
  );
}
