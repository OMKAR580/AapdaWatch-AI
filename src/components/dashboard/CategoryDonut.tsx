"use client";

import React, { useMemo } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import { useApp } from "@/context/AppContext";
import { Waves, Flame, Activity, Wind, Mountain, AlertCircle } from "lucide-react";

const CATEGORY_CONFIG: Record<
  string,
  { label: string; color: string; icon: React.ElementType }
> = {
  flood: { label: "Flood", color: "#294B39", icon: Waves },
  earthquake: { label: "Earthquake", color: "#D97706", icon: Activity },
  fire: { label: "Wildfire", color: "#DC2626", icon: Flame },
  cyclone: { label: "Cyclone", color: "#2563EB", icon: Wind },
  landslide: { label: "Landslide", color: "#7C3AED", icon: Mountain },
  other: { label: "Other Hazard", color: "#6B7280", icon: AlertCircle },
};

export function CategoryDonut() {
  const { incidents } = useApp();

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
        color: CATEGORY_CONFIG[cat]?.color || "#6B7280",
        icon: CATEGORY_CONFIG[cat]?.icon || AlertCircle,
      }))
      .filter((d) => d.value > 0);
  }, [incidents]);

  const total = useMemo(() => data.reduce((sum, d) => sum + d.value, 0), [data]);

  return (
    <GlassCard padding="md" className="flex flex-col h-full justify-between">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-[var(--gw-ink)] text-sm tracking-tight">
            Hazard Distribution
          </h3>
          <p className="text-[11px] text-[var(--gw-muted)] mt-0.5">
            Active verified incident types
          </p>
        </div>
        <span className="text-[10px] font-semibold text-[var(--gw-muted)] bg-black/5 dark:bg-white/5 px-2 py-0.5 rounded-full">
          {total} Total
        </span>
      </div>

      {total === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <AlertCircle className="w-8 h-8 text-[var(--gw-muted)] opacity-50 mb-2" />
          <p className="text-xs text-[var(--gw-muted)]">No active incidents recorded</p>
          <p className="text-[10px] text-[var(--gw-muted)] mt-1">
            Make a new prediction to see hazard distribution
          </p>
        </div>
      ) : (
        <div className="space-y-3.5 my-auto">
          {data.map((item) => {
            const pct = Math.round((item.value / total) * 100);
            const Icon = item.icon;
            return (
              <div key={item.key} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-md bg-black/5 dark:bg-white/5 flex items-center justify-center text-[var(--gw-ink)]">
                      <Icon className="w-3 h-3" />
                    </div>
                    <span className="font-medium text-[var(--gw-ink)]">
                      {item.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[var(--gw-muted)]">
                    <span className="font-semibold text-[var(--gw-ink)]">{item.value}</span>
                    <span className="text-[10px]">({pct}%)</span>
                  </div>
                </div>

                {/* Minimalist Progress Meter matching reference */}
                <div className="w-full h-1.5 bg-black/5 dark:bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${pct}%`,
                      backgroundColor: item.color,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </GlassCard>
  );
}
