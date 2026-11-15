"use client";

import { useState, useMemo } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { GlassCard } from "@/components/ui/GlassCard";
import { useApp } from "@/context/AppContext";
import { cn } from "@/lib/utils";

type TimeRange = "7d" | "30d" | "90d";

const RANGE_OPTIONS: { label: string; value: TimeRange }[] = [
  { label: "Week", value: "7d" },
  { label: "Month", value: "30d" },
  { label: "Quarter", value: "90d" },
];

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="gw-glass rounded-xl p-3 shadow-xl border border-[var(--gw-line)] text-xs">
      <p className="font-semibold text-[var(--gw-ink)] mb-1.5">{label}</p>
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center gap-2">
          <span
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-[var(--gw-muted)] capitalize">{entry.name}:</span>
          <span className="font-semibold text-[var(--gw-ink)]">{entry.value}</span>
        </div>
      ))}
    </div>
  );
}

export function ActivityChart() {
  const { reports, incidents } = useApp();
  const [range, setRange] = useState<TimeRange>("7d");

  const data = useMemo(() => {
    const days = range === "30d" ? 30 : range === "90d" ? 90 : 7;
    const result: { date: string; reports: number; incidents: number }[] = [];
    const now = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });

      const dayReports = reports.filter((r) => {
        const rDate = (r.timestamp || "").split("T")[0];
        return rDate === dateStr;
      }).length;

      const dayIncidents = incidents.filter((inc) => {
        const incDate = (inc.createdAt || "").split("T")[0];
        return incDate === dateStr;
      }).length;

      result.push({
        date: label,
        reports: dayReports,
        incidents: dayIncidents,
      });
    }

    return result;
  }, [reports, incidents, range]);

  const totalRangeReports = data.reduce((acc, curr) => acc + curr.reports, 0);
  const totalRangeIncidents = data.reduce((acc, curr) => acc + curr.incidents, 0);

  return (
    <GlassCard padding="md" className="flex flex-col">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-[var(--gw-ink)] text-sm tracking-tight">
              Incident Activity & Ingestion
            </h3>
            <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded-full">
              LIVE
            </span>
          </div>

          <div className="flex items-center gap-4 mt-2 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[var(--gw-ink)]" />
              <span className="text-[var(--gw-muted)]">Reports Ingested:</span>
              <span className="font-semibold text-[var(--gw-ink)]">{totalRangeReports}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-600 dark:text-emerald-400" />
              <span className="text-[var(--gw-muted)]">Incidents:</span>
              <span className="font-semibold text-[var(--gw-ink)]">{totalRangeIncidents}</span>
            </div>
          </div>
        </div>

        {/* Minimalist Range Pills */}
        <div className="flex items-center p-1 rounded-xl bg-black/5 dark:bg-white/5 border border-[var(--gw-line)] self-start sm:self-auto">
          {RANGE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              suppressHydrationWarning
              onClick={() => setRange(opt.value)}
              className={cn(
                "px-3 py-1 rounded-lg text-xs font-medium transition-all",
                range === opt.value
                  ? "bg-[var(--gw-dock-active)] text-[var(--gw-dock-ink)] shadow-sm font-semibold"
                  : "text-[var(--gw-muted)] hover:text-[var(--gw-ink)]"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="h-[220px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
            <defs>
              <linearGradient id="inkGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--gw-ink)" stopOpacity={0.2} />
                <stop offset="95%" stopColor="var(--gw-ink)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="emeraldGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#294B39" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#294B39" stopOpacity={0} />
              </linearGradient>
            </defs>

            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="var(--gw-line)"
            />

            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 10, fill: "var(--gw-muted)" }}
              dy={10}
            />

            <YAxis
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 10, fill: "var(--gw-muted)" }}
              allowDecimals={false}
            />

            <Tooltip content={<CustomTooltip />} />

            <Area
              type="monotone"
              dataKey="reports"
              name="Reports Ingested"
              stroke="var(--gw-ink)"
              strokeWidth={2}
              fill="url(#inkGradient)"
            />

            <Area
              type="monotone"
              dataKey="incidents"
              name="Active Incidents"
              stroke="#294B39"
              strokeWidth={2}
              fill="url(#emeraldGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </GlassCard>
  );
}
