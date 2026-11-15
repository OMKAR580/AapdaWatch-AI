"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ShieldAlert,
  LayoutDashboard,
  Map,
  ScanText,
  FolderOpen,
  ShieldCheck,
  BarChart3,
  FileDown,
  Settings,
  CircleHelp,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", icon: LayoutDashboard, label: "Overview" },
  { href: "/map", icon: Map, label: "Live Incident Map" },
  { href: "/analyze", icon: ScanText, label: "Analyze Information" },
  { href: "/incidents", icon: FolderOpen, label: "Incident Folders" },
  { href: "/verification", icon: ShieldCheck, label: "Verification Center" },
  { href: "/analytics", icon: BarChart3, label: "Analytics & Model" },
  { href: "/reports", icon: FileDown, label: "Reports & Exports" },
];

const bottomItems = [
  { href: "/settings", icon: Settings, label: "Settings" },
  { href: "/help", icon: CircleHelp, label: "Help & Docs" },
];

interface SidebarProps {
  isOpen: boolean;
  onClose?: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Mobile backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm md:hidden"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Mobile-only Slide-out Drawer */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-50 h-screen w-72 flex flex-col md:hidden",
          "gw-glass border-r border-[var(--gw-line)] shadow-2xl text-[var(--gw-ink)]",
          "transition-transform duration-300 ease-in-out"
        )}
      >
        {/* Brand */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-[var(--gw-line)]">
          <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-[#294B39] text-white shrink-0 shadow-sm">
            <ShieldAlert className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold tracking-tight text-[var(--gw-ink)] leading-tight truncate">
              AapdaWatch AI
            </p>
            <p className="text-[11px] text-[var(--gw-muted)] leading-tight truncate">
              Disaster Intelligence
            </p>
          </div>
          {/* Close button */}
          <button
            type="button"
            suppressHydrationWarning
            className="ml-auto p-1.5 rounded-lg text-[var(--gw-muted)] hover:text-[var(--gw-ink)] hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            onClick={onClose}
            aria-label="Close sidebar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Main nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-1">
          {navItems.map(({ href, icon: Icon, label }) => {
            const active = isActive(href);
            return (
              <Link
                key={href}
                href={href}
                onClick={onClose}
                suppressHydrationWarning
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all duration-150",
                  active
                    ? "bg-[var(--gw-dock-active)] text-[var(--gw-dock-ink)] shadow-sm font-semibold"
                    : "text-[var(--gw-muted)] hover:bg-black/5 dark:hover:bg-white/5 hover:text-[var(--gw-ink)]"
                )}
              >
                <Icon
                  className={cn(
                    "h-4 w-4 shrink-0",
                    active ? "text-[var(--gw-ink)]" : "text-[var(--gw-muted)]"
                  )}
                />
                <span className="truncate">{label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Bottom section */}
        <div className="border-t border-[var(--gw-line)] px-3 py-3 space-y-1">
          {bottomItems.map(({ href, icon: Icon, label }) => {
            const active = isActive(href);
            return (
              <Link
                key={href}
                href={href}
                onClick={onClose}
                suppressHydrationWarning
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all duration-150",
                  active
                    ? "bg-[var(--gw-dock-active)] text-[var(--gw-dock-ink)] shadow-sm font-semibold"
                    : "text-[var(--gw-muted)] hover:bg-black/5 dark:hover:bg-white/5 hover:text-[var(--gw-ink)]"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{label}</span>
              </Link>
            );
          })}

          {/* User profile */}
          <div className="flex items-center gap-3 px-3 py-2.5 mt-2 pt-2 border-t border-[var(--gw-line)]">
            <div className="w-8 h-8 rounded-full bg-[var(--gw-avatar)] text-[var(--gw-ink)] flex items-center justify-center font-bold text-xs shadow-sm border border-[var(--gw-line)]">
              DR
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-[var(--gw-ink)] truncate">
                Demo Reviewer
              </p>
              <p className="text-[10px] text-[var(--gw-muted)] truncate">Analyst</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
