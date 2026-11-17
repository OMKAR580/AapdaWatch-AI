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
import { TrendingUp, Radio } from "lucide-react";

type TimeRange = "7d" | "30d" | "90d";

const RANGE_OPTIONS: { label: string; value: TimeRange }[] = [
  { label: "7 Days", value: "7d" },
  { label: "30 Days", value: "30d" },
  { label: "90 Days", value: "90d" },
];

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string; dataKey: string }>;
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="gw-glass rounded-2xl p-3.5 shadow-2xl border border-[var(--gw-line)] text-xs min-w-[170px] backdrop-blur-xl">
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-[var(--gw-line)]">
        <span className="font-semibold text-[var(--gw-ink)]">{label}</span>
        <span className="text-[9px] font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
          TELEMETRY
        </span>
      </div>
      <div className="space-y-1.5">
        {payload.map((entry) => (
          <div key={entry.dataKey} className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-1.5">
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: entry.color, boxShadow: `0 0 6px ${entry.color}` }}
              />
              <span className="text-[var(--gw-muted)] text-[11px]">{entry.name}</span>
            </div>
            <span className="font-bold font-mono text-[var(--gw-ink)]">{entry.value}</span>
          </div>
        ))}
      </div>
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
    <GlassCard padding="md" className="flex flex-col h-full relative overflow-hidden">
      {/* Background ambient subtle cyan/emerald glow */}
      <div className="absolute -bottom-16 -left-16 w-44 h-44 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 z-10">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-[var(--gw-ink)] text-sm tracking-tight flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-500" />
              <span>Incident Activity & Ingestion Cadence</span>
            </h3>
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
              <Radio className="w-2.5 h-2.5 animate-pulse text-emerald-500" />
              LIVE
            </span>
          </div>

          <div className="flex items-center gap-4 mt-2 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
              <span className="text-[var(--gw-muted)] text-[11px]">Reports Ingested:</span>
              <span className="font-bold font-mono text-[var(--gw-ink)]">{totalRangeReports}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.6)]" />
              <span className="text-[var(--gw-muted)] text-[11px]">Incidents Clustered:</span>
              <span className="font-bold font-mono text-[var(--gw-ink)]">{totalRangeIncidents}</span>
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
                "px-3 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer",
                range === opt.value
                  ? "bg-emerald-500 text-black dark:text-black font-bold shadow-md shadow-emerald-500/20"
                  : "text-[var(--gw-muted)] hover:text-[var(--gw-ink)]"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="h-[240px] w-full z-10">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 12, right: 12, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="emeraldNeonGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="cyanNeonGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
              </linearGradient>
            </defs>

            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="var(--gw-line)"
              opacity={0.6}
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
              stroke="#10b981"
              strokeWidth={2.5}
              fill="url(#emeraldNeonGrad)"
              activeDot={{ r: 5, fill: "#10b981", stroke: "#fff", strokeWidth: 2 }}
            />

            <Area
              type="monotone"
              dataKey="incidents"
              name="Active Incidents"
              stroke="#06b6d4"
              strokeWidth={2}
              fill="url(#cyanNeonGrad)"
              activeDot={{ r: 4, fill: "#06b6d4", stroke: "#fff", strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </GlassCard>
  );
}
