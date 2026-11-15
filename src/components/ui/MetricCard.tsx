import { GlassCard } from "./GlassCard";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  iconColor?: string;
  iconBg?: string;
  trend?: { value: number; label: string };
  className?: string;
  isDemoData?: boolean;
}

export function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  className,
}: MetricCardProps) {
  return (
    <GlassCard
      className={cn(
        "relative overflow-hidden flex flex-col justify-between min-h-[140px] p-5",
        className
      )}
      hover
    >
      <div className="flex items-center justify-between gap-2 mb-3">
        <span className="text-xs font-medium text-[var(--gw-muted)] truncate">
          {title}
        </span>
        <div className="w-8 h-8 rounded-full bg-black/5 dark:bg-white/10 flex items-center justify-center text-[var(--gw-ink)] opacity-80">
          <Icon className="w-4 h-4" />
        </div>
      </div>

      <div>
        <div className="text-3xl sm:text-4xl font-semibold tracking-tight text-[var(--gw-ink)] leading-none mb-2">
          {value}
        </div>

        {subtitle && (
          <p className="text-[11px] text-[var(--gw-muted)] truncate">
            {subtitle}
          </p>
        )}

        {trend && (
          <div className="inline-flex items-center gap-1 text-[11px] font-medium mt-1 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">
            <span>{trend.value >= 0 ? "▲" : "▼"}</span>
            <span>{Math.abs(trend.value)}% {trend.label}</span>
          </div>
        )}
      </div>
    </GlassCard>
  );
}
