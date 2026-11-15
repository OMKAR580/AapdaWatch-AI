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
} from "lucide-react";
import { cn } from "@/lib/utils";

const mobileNavItems = [
  { href: "/", icon: LayoutDashboard, label: "Overview" },
  { href: "/map", icon: Map, label: "Map" },
  { href: "/analyze", icon: ScanText, label: "Analyze" },
  { href: "/incidents", icon: FolderOpen, label: "Incidents" },
  { href: "/verification", icon: ShieldCheck, label: "Verify" },
  { href: "/analytics", icon: BarChart3, label: "Analytics" },
];

export default function MobileNav() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 flex md:hidden items-center justify-around px-2 py-2 bg-white/90 dark:bg-[#1A2420]/90 backdrop-blur-2xl border-t border-black/5 dark:border-white/10">
      {mobileNavItems.map((item) => {
        const Icon = item.icon;
        const active = isActive(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all duration-150 text-[10px] font-medium",
              active
                ? "text-[#326B54] dark:text-[#DCE9DA] font-bold"
                : "text-[#737A70] dark:text-[#8A9490] hover:text-[#242B27]"
            )}
          >
            <div
              className={cn(
                "p-1 rounded-lg mb-0.5 transition-colors",
                active && "bg-[#DCE9DA] dark:bg-[#326B54]/40"
              )}
            >
              <Icon className="w-4 h-4" />
            </div>
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

