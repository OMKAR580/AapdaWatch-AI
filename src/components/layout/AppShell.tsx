"use client";

import React, { useState } from "react";
import { usePathname } from "next/navigation";
import Topbar from "@/components/layout/Topbar";
import LeftRailDock from "@/components/layout/LeftRailDock";
import BottomPillDock from "@/components/layout/BottomPillDock";
import GlassAdjustModal from "@/components/layout/GlassAdjustModal";
import Sidebar from "@/components/layout/Sidebar";
import { useGlass } from "@/context/GlassContext";

const routeMeta: Record<string, { title: string; subtitle: string }> = {
  "/": {
    title: "Overview",
    subtitle: "Real-time disaster intelligence & live operational posture",
  },
  "/map": {
    title: "Live Incident Map",
    subtitle: "Geospatial coordinate mapping and regional cluster analysis",
  },
  "/analyze": {
    title: "Analyze Information",
    subtitle: "Real-time message & batch CSV classification with DistilBERT Transformer",
  },
  "/incidents": {
    title: "Incident Folders",
    subtitle: "Unified situational dossiers correlating multiple reports",
  },
  "/verification": {
    title: "Verification Center",
    subtitle: "Human-in-the-loop review and factuality verification",
  },
  "/analytics": {
    title: "Analytics & Model",
    subtitle: "Benchmark metrics, category distributions, and latency",
  },
  "/reports": {
    title: "Reports & Exports",
    subtitle: "Download audit dossiers and raw report spreadsheets",
  },
  "/settings": {
    title: "Settings",
    subtitle: "System configuration, thresholds, and endpoints",
  },
  "/help": {
    title: "Help & Docs",
    subtitle: "User guides and taxonomy references",
  },
};

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { backgroundImage } = useGlass();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [bgFailed, setBgFailed] = useState(false);

  let currentMeta = routeMeta[pathname];
  if (!currentMeta) {
    if (pathname.startsWith("/incidents/")) {
      currentMeta = {
        title: "Incident Dossier",
        subtitle: "Correlated disaster telemetry & verified situation report",
      };
    } else {
      currentMeta = {
        title: "AapdaWatch AI",
        subtitle: "Disaster Intelligence Platform",
      };
    }
  }

  const currentDateStr = new Date().toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="relative min-h-screen text-[var(--gw-ink)] overflow-x-hidden selection:bg-[var(--gw-accent)] selection:text-white">
      {/* Background Room Lighting Image */}
      {!bgFailed && (
        <img
          src={backgroundImage}
          alt=""
          onError={() => setBgFailed(true)}
          className="gw-room-backdrop"
        />
      )}

      {/* Warm Ambient Diffuse Gradient Shade */}
      <div className="gw-room-gradient" aria-hidden="true" />

      {/* Mobile Drawer Navigation */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Workspace Layout */}
      <div className="relative z-10 max-w-[1440px] mx-auto px-3 sm:px-6 pt-4 pb-28 md:pb-16 flex flex-col min-h-screen">
        {/* Floating Topbar */}
        <Topbar onMobileMenuToggle={() => setSidebarOpen(true)} />

        {/* Stage Container: Left Rail Dock + Main Glass Window */}
        <div className="flex gap-4 sm:gap-6 items-start flex-1 w-full min-w-0">
          {/* Left Vertical Capsule Dock */}
          <LeftRailDock />

          {/* Main Frosted Glass Window */}
          <main className="gw-main gw-glass flex-1 min-w-0 rounded-[28px] p-4 sm:p-7 md:p-9 shadow-2xl transition-all">
            {/* View Heading */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-6 mb-6 border-b border-[var(--gw-line)]">
              <div>
                <p className="text-[12px] font-medium text-[var(--gw-muted)] mb-1">
                  Disaster Intelligence Command
                </p>
                <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[var(--gw-ink)] leading-tight">
                  {currentMeta.title}
                </h1>
                <p className="text-xs text-[var(--gw-muted)] mt-0.5">
                  {currentMeta.subtitle}
                </p>
              </div>

              <div
                suppressHydrationWarning
                className="text-xs font-medium text-[var(--gw-muted)] shrink-0 self-start sm:self-center bg-black/5 dark:bg-white/5 px-3 py-1.5 rounded-full border border-[var(--gw-line)]"
              >
                {currentDateStr}
              </div>
            </div>

            {/* View Body */}
            <div className="min-w-0">{children}</div>
          </main>
        </div>
      </div>

      {/* Floating Bottom Pill Dock */}
      <BottomPillDock />

      {/* Live "Adjust Glass" Drawer Modal */}
      <GlassAdjustModal />
    </div>
  );
}
