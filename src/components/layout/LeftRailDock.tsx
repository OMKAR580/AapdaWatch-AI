"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Map,
  ScanText,
  FolderOpen,
  ShieldCheck,
  BarChart3,
  FileDown,
  Settings,
  CircleHelp,
} from "lucide-react";
import { cn } from "@/lib/utils";

const primaryNav = [
  { href: "/", icon: LayoutDashboard, label: "Overview" },
  { href: "/map", icon: Map, label: "Live Incident Map" },
  { href: "/analyze", icon: ScanText, label: "Analyze Information" },
  { href: "/incidents", icon: FolderOpen, label: "Incident Folders" },
  { href: "/verification", icon: ShieldCheck, label: "Verification Center" },
  { href: "/analytics", icon: BarChart3, label: "Analytics & Model" },
  { href: "/reports", icon: FileDown, label: "Reports & Exports" },
];

const secondaryNav = [
  { href: "/settings", icon: Settings, label: "Settings" },
  { href: "/help", icon: CircleHelp, label: "Help & Docs" },
];

export default function LeftRailDock() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <aside
      className="hidden md:flex flex-col items-center gap-2 p-2 rounded-[26px] gw-glass shrink-0 self-start mt-6 sticky top-28 z-20"
      aria-label="Sidebar Dock"
    >
      {primaryNav.map((item) => {
        const Icon = item.icon;
        const active = isActive(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            title={item.label}
            suppressHydrationWarning
            className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 group relative",
              active
                ? "bg-[var(--gw-rail-active)] text-[var(--gw-ink)] shadow-md"
                : "text-[var(--gw-muted)] hover:text-[var(--gw-ink)] hover:bg-black/5 dark:hover:bg-white/10"
            )}
          >
            <Icon className="w-4 h-4 transition-transform group-hover:scale-110" />
            <span className="sr-only">{item.label}</span>
          </Link>
        );
      })}

      <div className="w-5 h-[1px] bg-[var(--gw-line)] my-1" />

      {secondaryNav.map((item) => {
        const Icon = item.icon;
        const active = isActive(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            title={item.label}
            suppressHydrationWarning
            className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 group",
              active
                ? "bg-[var(--gw-rail-active)] text-[var(--gw-ink)] shadow-md"
                : "text-[var(--gw-muted)] hover:text-[var(--gw-ink)] hover:bg-black/5 dark:hover:bg-white/10"
            )}
          >
            <Icon className="w-4 h-4 transition-transform group-hover:scale-110" />
            <span className="sr-only">{item.label}</span>
          </Link>
        );
      })}
    </aside>
  );
}
