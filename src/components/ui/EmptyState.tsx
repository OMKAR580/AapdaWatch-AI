import { cn } from "@/lib/utils";
import { AlertCircle, Inbox } from "lucide-react";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
  size = "md",
}: EmptyStateProps) {
  const sizeClasses = {
    sm: "py-8",
    md: "py-16",
    lg: "py-24",
  };

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        sizeClasses[size],
        className
      )}
    >
      <div className="w-12 h-12 rounded-2xl bg-[#DCE9DA] flex items-center justify-center mb-4 text-[#326B54]">
        {icon ?? <Inbox className="w-6 h-6" />}
      </div>
      <h3 className="text-sm font-semibold text-[#242B27] mb-1">{title}</h3>
      {description && (
        <p className="text-xs text-[#737A70] max-w-xs leading-relaxed">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

interface LoadingSkeletonProps {
  className?: string;
  lines?: number;
}

export function LoadingSkeleton({ className, lines = 3 }: LoadingSkeletonProps) {
  return (
    <div className={cn("animate-pulse space-y-3", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="h-4 bg-[#DCE9DA] rounded-lg"
          style={{ width: `${100 - i * 15}%` }}
        />
      ))}
    </div>
  );
}

interface ErrorStateProps {
  title?: string;
  description?: string;
  className?: string;
}

export function ErrorState({
  title = "Something went wrong",
  description = "An error occurred. Please try again.",
  className,
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-12 text-center",
        className
      )}
    >
      <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center mb-4">
        <AlertCircle className="w-6 h-6 text-red-500" />
      </div>
      <h3 className="text-sm font-semibold text-[#242B27] mb-1">{title}</h3>
      <p className="text-xs text-[#737A70] max-w-xs">{description}</p>
    </div>
  );
}

