"use client";

import React, { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import {
  ShieldAlert,
  Search,
  Settings2,
  Bell,
  Sun,
  Moon,
  Menu,
} from "lucide-react";
import * as Popover from "@radix-ui/react-popover";
import { useApp } from "@/context/AppContext";
import { useGlass } from "@/context/GlassContext";
import { formatRelativeTime } from "@/lib/utils";

const emptySubscribe = () => () => {};

function useIsMounted(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
}

interface TopbarProps {
  onMobileMenuToggle?: () => void;
}

export default function Topbar({ onMobileMenuToggle }: TopbarProps) {
  const {
    searchQuery,
    setSearchQuery,
    isDarkMode,
    toggleDarkMode,
    notifications,
    unreadNotificationCount,
    markNotificationRead,
    markAllNotificationsRead,
  } = useApp();

  const { toggleAdjust } = useGlass();
  const [notificationOpen, setNotificationOpen] = useState(false);
  const mounted = useIsMounted();

  return (
    <header className="gw-topbar gw-glass w-full mb-4 px-4 sm:px-6 h-[62px] rounded-[22px] flex items-center justify-between gap-3 select-none">
      {/* Left: Brand Icon + Title + Divider + Subtitle */}
      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
        {onMobileMenuToggle && (
          <button
            type="button"
            suppressHydrationWarning
            onClick={onMobileMenuToggle}
            className="md:hidden p-1.5 rounded-lg text-[var(--gw-muted)] hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            aria-label="Open navigation menu"
          >
            <Menu className="w-4 h-4" />
          </button>
        )}

        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-xl bg-[#294B39] dark:bg-[#3b6851] text-white flex items-center justify-center shrink-0 shadow-sm transition-transform group-hover:scale-105">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <div className="flex items-center gap-2.5">
            <span className="font-semibold text-sm sm:text-base tracking-tight text-[var(--gw-ink)] leading-none">
              AapdaWatch AI
            </span>
            <div className="hidden sm:block h-3.5 w-[1px] bg-[var(--gw-line)]" />
            <span className="hidden sm:inline text-xs text-[var(--gw-muted)] leading-none font-normal">
              Disaster Intelligence Platform
            </span>
          </div>
        </Link>
      </div>

      {/* Right: Search, Adjust Glass, Notifications, Dark/Light, User Avatar */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Search Input */}
        <div className="relative hidden lg:flex items-center">
          <Search className="absolute left-3 w-3.5 h-3.5 text-[var(--gw-muted)] pointer-events-none" />
          <input
            type="text"
            suppressHydrationWarning
            autoComplete="off"
            placeholder="Search disaster records..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-44 xl:w-56 pl-8 pr-3 py-1.5 rounded-xl text-xs bg-black/5 dark:bg-white/5 border border-[var(--gw-line)] text-[var(--gw-ink)] placeholder-[var(--gw-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--gw-accent)] transition-all"
          />
        </div>

        {/* Live Stream Indicator Pill */}
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 select-none">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>Live Stream</span>
        </div>

        {/* Adjust Glass Button */}
        <button
          type="button"
          suppressHydrationWarning
          onClick={toggleAdjust}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-[var(--gw-ink)] hover:bg-black/5 dark:hover:bg-white/10 transition-all border border-transparent hover:border-[var(--gw-line)]"
          title="Customize glass blur, opacity, and saturation"
        >
          <Settings2 className="w-3.5 h-3.5 text-[var(--gw-muted)]" />
          <span className="hidden xs:inline">Adjust glass</span>
        </button>

        {/* Notification Bell */}
        <Popover.Root open={notificationOpen} onOpenChange={setNotificationOpen}>
          <Popover.Trigger asChild>
            <button
              type="button"
              suppressHydrationWarning
              className="relative p-2 rounded-xl text-[var(--gw-muted)] hover:text-[var(--gw-ink)] hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
              aria-label="View notifications"
            >
              <Bell className="w-4 h-4" />
              {mounted && unreadNotificationCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              )}
            </button>
          </Popover.Trigger>

          <Popover.Portal>
            <Popover.Content
              className="z-50 w-80 sm:w-96 rounded-2xl p-4 shadow-2xl gw-glass text-[var(--gw-ink)] border border-[var(--gw-line)]"
              sideOffset={8}
              align="end"
            >
              <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-[var(--gw-line)]">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-[var(--gw-accent)]" />
                  <span className="text-xs font-semibold">Incident Notifications</span>
                </div>
                {mounted && unreadNotificationCount > 0 && (
                  <button
                    type="button"
                    suppressHydrationWarning
                    onClick={markAllNotificationsRead}
                    className="text-[11px] text-[var(--gw-muted)] hover:text-[var(--gw-ink)] underline"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
                {!mounted || notifications.length === 0 ? (
                  <div className="py-8 text-center text-xs text-[var(--gw-muted)]">
                    No active notifications
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => markNotificationRead(n.id)}
                      className={`p-2.5 rounded-xl text-xs transition-colors cursor-pointer border ${
                        !n.read
                          ? "bg-[var(--gw-rail-active)] border-[var(--gw-line)]"
                          : "border-transparent hover:bg-black/5 dark:hover:bg-white/5 opacity-75"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <span className="font-semibold text-[var(--gw-ink)] truncate">
                          {n.title}
                        </span>
                        <span className="text-[10px] text-[var(--gw-muted)] shrink-0">
                          {formatRelativeTime(n.timestamp)}
                        </span>
                      </div>
                      <p className="text-[11px] text-[var(--gw-muted)] line-clamp-2 leading-relaxed">
                        {n.message}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>

        {/* Theme Toggle Button */}
        <button
          type="button"
          suppressHydrationWarning
          onClick={toggleDarkMode}
          className="p-2 rounded-xl text-[var(--gw-muted)] hover:text-[var(--gw-ink)] hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          aria-label={mounted && isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
        >
          {mounted && isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* User Profile Avatar */}
        <div
          className="w-8 h-8 rounded-full bg-[var(--gw-avatar)] text-[var(--gw-ink)] flex items-center justify-center font-bold text-xs shadow-sm border border-[var(--gw-line)]"
          title="Demo Reviewer (Analyst)"
        >
          DR
        </div>
      </div>
    </header>
  );
}
