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
  FileDown,
} from "lucide-react";
import { cn } from "@/lib/utils";

const dockItems = [
  { href: "/", icon: LayoutDashboard, label: "Overview" },
  { href: "/map", icon: Map, label: "Live Map" },
  { href: "/analyze", icon: ScanText, label: "Analyze" },
  { href: "/incidents", icon: FolderOpen, label: "Incidents" },
  { href: "/verification", icon: ShieldCheck, label: "Verify" },
  { href: "/reports", icon: FileDown, label: "Reports" },
];

export default function BottomPillDock() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <nav
      className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 gw-dock"
      aria-label="Bottom Navigation Pill"
    >
      {dockItems.map((item) => {
        const Icon = item.icon;
        const active = isActive(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            suppressHydrationWarning
            aria-current={active ? "page" : undefined}
            className={cn("gw-dock-item", active && "active")}
          >
            <Icon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
