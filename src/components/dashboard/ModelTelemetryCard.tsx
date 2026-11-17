"use client";

import React from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import { Cpu, Zap, Activity, ShieldCheck, Gauge, CheckCircle2 } from "lucide-react";
import Link from "next/link";

export function ModelTelemetryCard() {
  return (
    <GlassCard padding="md" className="relative overflow-hidden border border-emerald-500/20">
      {/* Background cyber grid gradient */}
      <div className="absolute top-0 right-0 w-64 h-full bg-gradient-to-l from-emerald-500/5 via-cyan-500/5 to-transparent pointer-events-none" />

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 relative z-10">
        {/* Left: Model Identity & Health */}
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
              ONLINE &bull; MICROSERVICE ACTIVE
            </span>
            <span className="text-[10px] font-mono text-[var(--gw-muted)] bg-black/5 dark:bg-white/5 px-2 py-0.5 rounded-md">
              FastAPI :8001 / Render
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-[var(--gw-ink)] tracking-tight">
                AapdaWatch DistilBERT v1.0 Transformer
              </h3>
              <p className="text-[11px] text-[var(--gw-muted)]">
                Bidirectional Self-Attention Sequence Classifier &bull; 6 Layers &bull; 12 Heads
              </p>
            </div>
          </div>
        </div>

        {/* Center: Live Performance Metrics Matrix */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4 text-xs">
          <div className="p-2.5 rounded-xl bg-black/5 dark:bg-white/5 border border-[var(--gw-line)]">
            <span className="text-[10px] text-[var(--gw-muted)] flex items-center gap-1">
              <Zap className="w-3 h-3 text-emerald-500" /> Latency
            </span>
            <div className="font-mono font-bold text-sm text-[var(--gw-ink)] mt-0.5">
              ~26 ms
            </div>
            <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-semibold">
              CPU PyTorch
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-black/5 dark:bg-white/5 border border-[var(--gw-line)]">
            <span className="text-[10px] text-[var(--gw-muted)] flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-blue-500" /> Accuracy
            </span>
            <div className="font-mono font-bold text-sm text-[var(--gw-ink)] mt-0.5">
              85.10%
            </div>
            <span className="text-[9px] text-blue-600 dark:text-blue-400 font-semibold">
              0.899 AUC
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-black/5 dark:bg-white/5 border border-[var(--gw-line)]">
            <span className="text-[10px] text-[var(--gw-muted)] flex items-center gap-1">
              <Gauge className="w-3 h-3 text-amber-500" /> Threshold (&tau;)
            </span>
            <div className="font-mono font-bold text-sm text-[var(--gw-ink)] mt-0.5">
              0.43
            </div>
            <span className="text-[9px] text-amber-600 dark:text-amber-400 font-semibold">
              High Recall
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-black/5 dark:bg-white/5 border border-[var(--gw-line)]">
            <span className="text-[10px] text-[var(--gw-muted)] flex items-center gap-1">
              <Activity className="w-3 h-3 text-purple-500" /> Parameters
            </span>
            <div className="font-mono font-bold text-sm text-[var(--gw-ink)] mt-0.5">
              66.95M
            </div>
            <span className="text-[9px] text-purple-600 dark:text-purple-400 font-semibold">
              Safetensors
            </span>
          </div>
        </div>

        {/* Right: Quick Action to Analyze */}
        <div className="flex sm:flex-col justify-end items-end gap-2 shrink-0">
          <Link
            href="/analyze"
            className="w-full sm:w-auto px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-xs transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-1.5 cursor-pointer text-center"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Test Inference</span>
          </Link>
          <Link
            href="/analytics"
            className="text-[11px] text-[var(--gw-muted)] hover:text-[var(--gw-ink)] underline text-center hidden sm:block"
          >
            View Benchmark Matrix &rarr;
          </Link>
        </div>
      </div>
    </GlassCard>
  );
}

