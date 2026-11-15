"use client";

import React from "react";
import { Settings2, X, RotateCcw, Sparkles } from "lucide-react";
import { useGlass, GLASS_PRESETS } from "@/context/GlassContext";

export default function GlassAdjustModal() {
  const {
    settings,
    updateSettings,
    applyPreset,
    resetSettings,
    isAdjustOpen,
    setIsAdjustOpen,
  } = useGlass();

  if (!isAdjustOpen) return null;

  return (
    <div
      className="gw-material gw-glass"
      style={{
        position: "fixed",
        top: 80,
        right: 24,
        zIndex: 50,
        width: 320,
        maxHeight: "calc(100vh - 110px)",
        overflowY: "auto",
        borderRadius: 24,
        padding: "22px",
      }}
      role="dialog"
      aria-label="Adjust Glass Appearance"
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-black/10 dark:border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-black/5 dark:bg-white/10 flex items-center justify-center">
            <Settings2 className="w-4 h-4 text-[var(--gw-ink)]" />
          </div>
          <h2 className="text-sm font-semibold tracking-tight text-[var(--gw-ink)]">
            Adjust Glass
          </h2>
        </div>
        <button
          type="button"
          suppressHydrationWarning
          onClick={() => setIsAdjustOpen(false)}
          className="p-1.5 rounded-lg text-[var(--gw-muted)] hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <p className="text-[11px] text-[var(--gw-muted)] my-3 leading-relaxed">
        Tune the live frosted glass blur, opacity, saturation, and ambient edge lighting across the entire dashboard.
      </p>

      {/* Live Sample Preview */}
      <div
        className="h-20 rounded-xl mb-4 flex items-center justify-center gap-2 border border-white/20 shadow-inner overflow-hidden relative"
        style={{
          background: `color-mix(in srgb, ${settings.tint} ${Math.round(settings.opacity * 100)}%, transparent)`,
          backdropFilter: `blur(${settings.blur}px) saturate(${settings.saturation})`,
          WebkitBackdropFilter: `blur(${settings.blur}px) saturate(${settings.saturation})`,
          boxShadow: `inset 0 1px 0 rgba(255,255,255,${settings.edge}), 0 8px 24px -10px rgba(0,0,0,0.15)`,
        }}
      >
        <Sparkles className="w-4 h-4 text-[var(--gw-ink)] opacity-70" />
        <span className="text-xs font-semibold text-[var(--gw-ink)]">
          Live Glass Preview
        </span>
      </div>

      {/* Quick Presets */}
      <div className="mb-4">
        <label className="text-[10px] font-semibold uppercase tracking-wider text-[var(--gw-muted)] block mb-2">
          Glass Presets
        </label>
        <div className="grid grid-cols-3 gap-1.5">
          {Object.keys(GLASS_PRESETS).map((presetName) => {
            const isSelected =
              GLASS_PRESETS[presetName].blur === settings.blur &&
              GLASS_PRESETS[presetName].opacity === settings.opacity;
            return (
              <button
                key={presetName}
                type="button"
                suppressHydrationWarning
                onClick={() => applyPreset(presetName)}
                className={`text-[11px] py-1.5 px-2 rounded-lg border transition-all text-center font-medium ${
                  isSelected
                    ? "bg-[var(--gw-accent)] text-white dark:text-black border-transparent shadow-sm"
                    : "border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/10 text-[var(--gw-ink)]"
                }`}
              >
                {presetName}
              </button>
            );
          })}
        </div>
      </div>

      {/* Sliders */}
      <div className="space-y-3.5">
        {/* Blur Slider */}
        <div>
          <div className="flex justify-between text-[11px] font-medium text-[var(--gw-ink)] mb-1">
            <span>Blur Radius</span>
            <span className="text-[var(--gw-muted)]">{settings.blur}px</span>
          </div>
          <input
            type="range"
            suppressHydrationWarning
            min="0"
            max="40"
            step="1"
            value={settings.blur}
            onChange={(e) => updateSettings({ blur: Number(e.target.value) })}
            className="w-full h-1.5 bg-black/10 dark:bg-white/10 rounded-lg appearance-none cursor-pointer accent-[var(--gw-accent)]"
          />
        </div>

        {/* Opacity Slider */}
        <div>
          <div className="flex justify-between text-[11px] font-medium text-[var(--gw-ink)] mb-1">
            <span>Surface Opacity</span>
            <span className="text-[var(--gw-muted)]">{Math.round(settings.opacity * 100)}%</span>
          </div>
          <input
            type="range"
            suppressHydrationWarning
            min="0.08"
            max="0.85"
            step="0.01"
            value={settings.opacity}
            onChange={(e) => updateSettings({ opacity: Number(e.target.value) })}
            className="w-full h-1.5 bg-black/10 dark:bg-white/10 rounded-lg appearance-none cursor-pointer accent-[var(--gw-accent)]"
          />
        </div>

        {/* Saturation Slider */}
        <div>
          <div className="flex justify-between text-[11px] font-medium text-[var(--gw-ink)] mb-1">
            <span>Color Saturation</span>
            <span className="text-[var(--gw-muted)]">{Math.round(settings.saturation * 100)}%</span>
          </div>
          <input
            type="range"
            suppressHydrationWarning
            min="0.5"
            max="2.0"
            step="0.05"
            value={settings.saturation}
            onChange={(e) => updateSettings({ saturation: Number(e.target.value) })}
            className="w-full h-1.5 bg-black/10 dark:bg-white/10 rounded-lg appearance-none cursor-pointer accent-[var(--gw-accent)]"
          />
        </div>

        {/* Edge Highlight Slider */}
        <div>
          <div className="flex justify-between text-[11px] font-medium text-[var(--gw-ink)] mb-1">
            <span>Edge Highlight</span>
            <span className="text-[var(--gw-muted)]">{Math.round(settings.edge * 100)}%</span>
          </div>
          <input
            type="range"
            suppressHydrationWarning
            min="0"
            max="1.0"
            step="0.05"
            value={settings.edge}
            onChange={(e) => updateSettings({ edge: Number(e.target.value) })}
            className="w-full h-1.5 bg-black/10 dark:bg-white/10 rounded-lg appearance-none cursor-pointer accent-[var(--gw-accent)]"
          />
        </div>

        {/* Tint Color */}
        <div className="flex items-center justify-between pt-2 border-t border-black/10 dark:border-white/10">
          <span className="text-[11px] font-medium text-[var(--gw-ink)]">Glass Ambient Tint</span>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-[var(--gw-muted)] font-mono">{settings.tint}</span>
            <input
              type="color"
              suppressHydrationWarning
              value={settings.tint}
              onChange={(e) => updateSettings({ tint: e.target.value })}
              className="w-7 h-7 rounded border border-black/10 dark:border-white/10 cursor-pointer bg-transparent"
            />
          </div>
        </div>
      </div>

      {/* Reset button */}
      <button
        type="button"
        suppressHydrationWarning
        onClick={resetSettings}
        className="w-full mt-4 py-2 px-3 rounded-xl border border-black/10 dark:border-white/10 text-[11px] font-medium text-[var(--gw-muted)] hover:text-[var(--gw-ink)] hover:bg-black/5 dark:hover:bg-white/5 transition-colors flex items-center justify-center gap-1.5"
      >
        <RotateCcw className="w-3.5 h-3.5" />
        Reset to Default Glass
      </button>
    </div>
  );
}
