"use client";

import React, { useMemo, useState } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import { useApp } from "@/context/AppContext";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import { Waves, Flame, Activity, Wind, Mountain, AlertCircle } from "lucide-react";

const CATEGORY_CONFIG: Record<
  string,
  { label: string; color: string; hoverColor: string; icon: React.ElementType }
> = {
  flood: { label: "Flood", color: "#10b981", hoverColor: "#34d399", icon: Waves },
  earthquake: { label: "Earthquake", color: "#f59e0b", hoverColor: "#fbbf24", icon: Activity },
  fire: { label: "Wildfire", color: "#ef4444", hoverColor: "#f87171", icon: Flame },
  cyclone: { label: "Cyclone", color: "#06b6d4", hoverColor: "#38bdf8", icon: Wind },
  landslide: { label: "Landslide", color: "#8b5cf6", hoverColor: "#a78bfa", icon: Mountain },
  other: { label: "Other Hazard", color: "#64748b", hoverColor: "#94a3b8", icon: AlertCircle },
};

interface TooltipPayload {
  name: string;
  value: number;
  payload: {
    color: string;
  };
}

function CustomDonutTooltip({ active, payload }: { active?: boolean; payload?: TooltipPayload[] }) {
  if (!active || !payload || payload.length === 0) return null;
  const entry = payload[0];
  return (
    <div className="gw-glass px-3 py-1.5 rounded-xl border border-[var(--gw-line)] shadow-xl text-xs flex items-center gap-2">
      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.payload.color }} />
      <span className="font-medium text-[var(--gw-ink)]">{entry.name}:</span>
      <span className="font-bold text-[var(--gw-ink)]">{entry.value}</span>
    </div>
  );
}

export function CategoryDonut() {
  const { incidents } = useApp();
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const data = useMemo(() => {
    const counts: Record<string, number> = {
      flood: 0,
      earthquake: 0,
      fire: 0,
      cyclone: 0,
      landslide: 0,
      other: 0,
    };

    for (const inc of incidents) {
      if (counts[inc.category] !== undefined) {
        counts[inc.category]++;
      } else {
        counts.other++;
      }
    }

    return Object.entries(counts)
      .map(([cat, count]) => ({
        key: cat,
        name: CATEGORY_CONFIG[cat]?.label || cat,
        value: count,
        color: CATEGORY_CONFIG[cat]?.color || "#64748b",
        icon: CATEGORY_CONFIG[cat]?.icon || AlertCircle,
      }))
      .filter((d) => d.value > 0);
  }, [incidents]);

  const total = useMemo(() => data.reduce((sum, d) => sum + d.value, 0), [data]);

  return (
    <GlassCard padding="md" className="flex flex-col h-full justify-between relative overflow-hidden">
      {/* Background neon ambient highlight */}
      <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between mb-3 z-10">
        <div>
          <h3 className="font-semibold text-[var(--gw-ink)] text-sm tracking-tight flex items-center gap-2">
            <span>Hazard Distribution</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          </h3>
          <p className="text-[11px] text-[var(--gw-muted)] mt-0.5">
            Active verified incident cluster
          </p>
        </div>
        <span className="text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
          {total} Active
        </span>
      </div>

      {total === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <AlertCircle className="w-8 h-8 text-[var(--gw-muted)] opacity-50 mb-2 animate-bounce" />
          <p className="text-xs text-[var(--gw-muted)] font-medium">No active incidents recorded</p>
          <p className="text-[10px] text-[var(--gw-muted)] mt-1">
            Run an analysis or await live feed ingestion
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4 my-auto z-10">
          {/* Recharts Glowing Donut Chart */}
          <div className="relative h-44 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip content={<CustomDonutTooltip />} />
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={72}
                  paddingAngle={4}
                  dataKey="value"
                  onMouseEnter={(_, index) => setActiveIndex(index)}
                  onMouseLeave={() => setActiveIndex(null)}
                >
                  {data.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.color}
                      stroke="rgba(0,0,0,0.2)"
                      strokeWidth={2}
                      className="transition-all duration-300 cursor-pointer"
                      style={{
                        filter:
                          activeIndex === index
                            ? `drop-shadow(0 0 8px ${entry.color})`
                            : "none",
                        transform: activeIndex === index ? "scale(1.05)" : "scale(1)",
                        transformOrigin: "center center",
                      }}
                    />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>

            {/* Central Donut Counter */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-extrabold text-[var(--gw-ink)] tracking-tight">
                {total}
              </span>
              <span className="text-[9px] font-semibold text-[var(--gw-muted)] uppercase tracking-wider">
                Incidents
              </span>
            </div>
          </div>

          {/* Category Badges with Progress */}
          <div className="space-y-2 pt-1 border-t border-[var(--gw-line)]">
            {data.map((item) => {
              const pct = Math.round((item.value / total) * 100);
              const Icon = item.icon;
              return (
                <div key={item.key} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <Icon className="w-3.5 h-3.5 text-[var(--gw-muted)]" />
                      <span className="font-medium text-[var(--gw-ink)] text-[11px]">
                        {item.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] font-mono">
                      <span className="font-bold text-[var(--gw-ink)]">{item.value}</span>
                      <span className="text-[var(--gw-muted)]">({pct}%)</span>
                    </div>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: item.color,
                        boxShadow: `0 0 6px ${item.color}88`,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </GlassCard>
  );
}
