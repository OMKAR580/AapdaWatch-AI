import { cn } from "@/lib/utils";
import type { DisasterCategory, Severity, VerificationStatus, IncidentStatus, PredictedClass } from "@/types";

type BadgeVariant =
  | "default"
  | "critical"
  | "high"
  | "medium"
  | "low"
  | "verified"
  | "unreviewed"
  | "under-review"
  | "false-positive"
  | "duplicate"
  | "resolved"
  | "flood"
  | "earthquake"
  | "fire"
  | "cyclone"
  | "landslide"
  | "other"
  | "disaster"
  | "not-disaster"
  | "demo";

const variantStyles: Record<BadgeVariant, string> = {
  default: "bg-gray-100 text-gray-700 border-gray-200",
  critical: "bg-red-100 text-red-700 border-red-200",
  high: "bg-amber-100 text-amber-700 border-amber-200",
  medium: "bg-blue-100 text-blue-700 border-blue-200",
  low: "bg-green-100 text-green-700 border-green-200",
  verified: "bg-emerald-100 text-emerald-700 border-emerald-200",
  unreviewed: "bg-gray-100 text-gray-600 border-gray-200",
  "under-review": "bg-amber-100 text-amber-700 border-amber-200",
  "false-positive": "bg-red-100 text-red-700 border-red-200",
  duplicate: "bg-purple-100 text-purple-700 border-purple-200",
  resolved: "bg-green-100 text-green-700 border-green-200",
  flood: "bg-blue-100 text-blue-700 border-blue-200",
  earthquake: "bg-amber-100 text-amber-700 border-amber-200",
  fire: "bg-red-100 text-red-700 border-red-200",
  cyclone: "bg-purple-100 text-purple-700 border-purple-200",
  landslide: "bg-orange-100 text-orange-700 border-orange-200",
  other: "bg-gray-100 text-gray-700 border-gray-200",
  disaster: "bg-red-50 text-red-700 border-red-200",
  "not-disaster": "bg-green-50 text-green-700 border-green-200",
  demo: "bg-yellow-100 text-yellow-700 border-yellow-200 font-semibold",
};

interface StatusBadgeProps {
  variant: BadgeVariant;
  label?: string;
  className?: string;
  size?: "sm" | "md";
}

export function StatusBadge({ variant, label, className, size = "sm" }: StatusBadgeProps) {
  const displayLabel = label ?? formatLabel(variant);
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border font-medium leading-none",
        size === "sm" ? "px-2.5 py-1 text-[11px]" : "px-3 py-1.5 text-xs",
        variantStyles[variant] ?? variantStyles.default,
        className
      )}
    >
      {displayLabel}
    </span>
  );
}

function formatLabel(v: string): string {
  return v
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function getSeverityVariant(severity: Severity): BadgeVariant {
  return severity as BadgeVariant;
}

export function getCategoryVariant(category: DisasterCategory): BadgeVariant {
  return category as BadgeVariant;
}

export function getVerificationVariant(status: VerificationStatus): BadgeVariant {
  return status as BadgeVariant;
}

export function getIncidentStatusVariant(status: IncidentStatus): BadgeVariant {
  if (status === "verified") return "verified";
  if (status === "resolved") return "resolved";
  if (status === "under-review") return "under-review";
  return "unreviewed";
}

export function getPredictedClassVariant(cls: PredictedClass): BadgeVariant {
  return cls === "disaster-related" ? "disaster" : "not-disaster";
}

