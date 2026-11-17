"use client";

import React, { useState, useMemo } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import { useApp } from "@/context/AppContext";
import { MOCK_BASELINE_MODEL_INFO } from "@/data/mock-data";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  CartesianGrid,
} from "recharts";
import {
  BarChart3,
  Cpu,
  Info,
  Sparkles,
  AlertCircle,
} from "lucide-react";

export default function AnalyticsPage() {
  const { incidents, reports } = useApp();
  const [timeRange, setTimeRange] = useState<"7d" | "30d">("7d");

  // Dynamic timeline directly from live predictions
  const trendData = useMemo(() => {
    const days = timeRange === "30d" ? 30 : 7;
    const result: { date: string; reports: number; incidents: number }[] = [];
    const now = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });

      const dayReports = reports.filter((r) => {
        const rDate = (r.timestamp || "").split("T")[0];
        return rDate === dateStr;
      }).length;

      const dayIncidents = incidents.filter((inc) => {
        const incDate = (inc.createdAt || "").split("T")[0];
        return incDate === dateStr;
      }).length;

      result.push({
        date: label,
        reports: dayReports,
        incidents: dayIncidents,
      });
    }

    return result;
  }, [reports, incidents, timeRange]);

  // Dynamic Category Distribution from live application incidents
  const categoryDistribution = useMemo(() => {
    const counts: Record<string, number> = {
      flood: 0,
      earthquake: 0,
      fire: 0,
      cyclone: 0,
      landslide: 0,
      other: 0,
    };
    incidents.forEach((inc) => {
      if (counts[inc.category] !== undefined) counts[inc.category]++;
      else counts.other++;
    });

    const config: Record<string, { name: string; color: string }> = {
      flood: { name: "Flood", color: "#66869B" },
      earthquake: { name: "Earthquake", color: "#B88636" },
      fire: { name: "Fire", color: "#C94B43" },
      cyclone: { name: "Cyclone", color: "#7B6BA8" },
      landslide: { name: "Landslide", color: "#6B9B7A" },
      other: { name: "Other", color: "#737A70" },
    };

    return Object.entries(counts).map(([key, val]) => ({
      name: config[key]?.name || key,
      value: val,
      color: config[key]?.color || "#737A70",
    }));
  }, [incidents]);

  // Dynamic Severity Distribution from live application incidents
  const severityDistribution = useMemo(() => {
    const counts = { critical: 0, high: 0, medium: 0, low: 0 };
    incidents.forEach((inc) => {
      if (counts[inc.severity] !== undefined) counts[inc.severity]++;
    });

    return [
      { name: "Critical", value: counts.critical, color: "#C94B43" },
      { name: "High", value: counts.high, color: "#B88636" },
      { name: "Medium", value: counts.medium, color: "#66869B" },
      { name: "Low", value: counts.low, color: "#326B54" },
    ];
  }, [incidents]);

  // Dynamic Human Verification Status Distribution from live application reports
  const verificationDistribution = useMemo(() => {
    const counts = {
      verified: 0,
      "under-review": 0,
      unreviewed: 0,
      "false-positive": 0,
      duplicate: 0,
    };
    reports.forEach((r) => {
      if (counts[r.verificationStatus] !== undefined) counts[r.verificationStatus]++;
      else counts.unreviewed++;
    });

    return [
      { name: "Verified", value: counts.verified, color: "#326B54" },
      { name: "Under Review", value: counts["under-review"], color: "#B88636" },
      { name: "Unreviewed", value: counts.unreviewed, color: "#737A70" },
      { name: "False Positive", value: counts["false-positive"], color: "#C94B43" },
      { name: "Duplicate", value: counts.duplicate, color: "#66869B" },
    ];
  }, [reports]);

  return (
    <div className="space-y-8">
      {/* ============================================================== */}
      {/* SECTION 1: DISASTER INCIDENT ANALYTICS */}
      {/* ============================================================== */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-[#242B27] dark:text-[#E8EDE9] flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-[#326B54]" />
              <span>Operational Disaster Intelligence</span>
            </h2>
            <p className="text-xs text-[#737A70]">Trends and distributions across reported incident domains</p>
          </div>

          {/* Time Filter */}
          <div
            suppressHydrationWarning
            className="flex items-center gap-1 p-1 rounded-xl bg-black/5 dark:bg-white/5 text-xs"
          >
            <button
              type="button"
              suppressHydrationWarning
              onClick={() => setTimeRange("7d")}
              className={`px-3 py-1 rounded-lg transition-colors font-medium ${timeRange === "7d"
                  ? "bg-white dark:bg-[#1A2420] text-[#326B54] dark:text-[#DCE9DA] shadow-sm font-bold"
                  : "text-[#737A70]"
                }`}
            >
              Last 7 Days
            </button>
            <button
              type="button"
              suppressHydrationWarning
              onClick={() => setTimeRange("30d")}
              className={`px-3 py-1 rounded-lg transition-colors font-medium ${timeRange === "30d"
                  ? "bg-white dark:bg-[#1A2420] text-[#326B54] dark:text-[#DCE9DA] shadow-sm font-bold"
                  : "text-[#737A70]"
                }`}
            >
              Last 30 Days
            </button>
          </div>
        </div>

        {/* Top: Reports Over Time Area Chart */}
        <GlassCard className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#242B27] dark:text-[#E8EDE9]">
              Report Ingestion & Incident Correlation Cadence
            </span>
            <span className="text-[10px] text-amber-600 font-bold bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
              DEMO DATA
            </span>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="reportsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#326B54" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#326B54" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(255, 255, 255, 0.9)",
                    borderRadius: "12px",
                    border: "1px solid rgba(0,0,0,0.1)",
                    fontSize: "12px",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="reports"
                  stroke="#326B54"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#reportsGrad)"
                  name="Reports Received"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        {/* Three distribution charts */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* 1. Category Bar Chart */}
          <GlassCard className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#242B27] dark:text-[#E8EDE9]">
                Incident Category Volume
              </span>
              <span className="text-[9px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-full px-1.5 py-0.5 leading-none">
                LIVE RECORDS
              </span>
            </div>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryDistribution} layout="vertical">
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={70} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#326B54" radius={[0, 6, 6, 0]} name="Incidents" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </GlassCard>

          {/* 2. Severity Distribution Donut */}
          <GlassCard className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#242B27] dark:text-[#E8EDE9]">
                Severity Distribution
              </span>
              <span className="text-[9px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-full px-1.5 py-0.5 leading-none">
                LIVE RECORDS
              </span>
            </div>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={severityDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={65}
                    dataKey="value"
                  >
                    {severityDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-3 text-[10px] text-[#737A70]">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#C94B43]"></span>Critical</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#B88636]"></span>High</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#66869B]"></span>Medium</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#326B54]"></span>Low</span>
            </div>
          </GlassCard>

          {/* 3. Human Verification Status Distribution */}
          <GlassCard className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#242B27] dark:text-[#E8EDE9]">
                Human Review Status
              </span>
              <span className="text-[9px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-full px-1.5 py-0.5 leading-none">
                LIVE RECORDS
              </span>
            </div>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={verificationDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={65}
                    dataKey="value"
                  >
                    {verificationDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-3 text-[10px] text-[#737A70]">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#326B54]"></span>Verified</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#B88636]"></span>Review</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#737A70]"></span>Unreviewed</span>
            </div>
          </GlassCard>
        </div>
      </div>

      {/* ============================================================== */}
      {/* SECTION 2: MODEL PERFORMANCE & BENCHMARKING */}
      {/* ============================================================== */}
      <div className="space-y-5 pt-4 border-t border-[var(--gw-line)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-[var(--gw-ink)] flex items-center gap-2">
              <Cpu className="w-5 h-5 text-emerald-500" />
              <span>NLP Model Evaluation & Performance</span>
            </h2>
            <p className="text-xs text-[var(--gw-muted)]">
              Offline validation benchmarks, test matrix, and architecture specifications
            </p>
          </div>
          <span className="text-[10px] font-mono font-bold px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 self-start sm:self-auto">
            LIVE PRODUCTION: DistilBERT v1.0
          </span>
        </div>

        {/* 4 Performance KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <GlassCard className="p-4 space-y-1 border-t-2 border-t-emerald-500">
            <span className="text-[11px] font-medium text-[var(--gw-muted)]">Test Accuracy</span>
            <div className="text-2xl font-bold text-[var(--gw-ink)]">85.10%</div>
            <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">+5.70% vs Baseline</p>
          </GlassCard>

          <GlassCard className="p-4 space-y-1 border-t-2 border-t-blue-500">
            <span className="text-[11px] font-medium text-[var(--gw-muted)]">F1-Score</span>
            <div className="text-2xl font-bold text-[var(--gw-ink)]">81.24%</div>
            <p className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold">Harmonic Precision/Recall</p>
          </GlassCard>

          <GlassCard className="p-4 space-y-1 border-t-2 border-t-purple-500">
            <span className="text-[11px] font-medium text-[var(--gw-muted)]">ROC-AUC</span>
            <div className="text-2xl font-bold text-[var(--gw-ink)]">0.8990</div>
            <p className="text-[10px] text-purple-600 dark:text-purple-400 font-semibold">Area Under ROC Curve</p>
          </GlassCard>

          <GlassCard className="p-4 space-y-1 border-t-2 border-t-amber-500">
            <span className="text-[11px] font-medium text-[var(--gw-muted)]">Decision Threshold (&tau;)</span>
            <div className="text-2xl font-bold text-[var(--gw-ink)]">0.43</div>
            <p className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">Calibrated High Recall</p>
          </GlassCard>
        </div>

        {/* Model Meta Cards: DistilBERT vs Baseline */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Target Model Card: DistilBERT v1.0 */}
          <GlassCard className="p-5 space-y-3 border-l-4 border-l-emerald-500">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold uppercase text-emerald-600 dark:text-emerald-400">
                Active Production Engine
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/20">
                Port 8001 (Render Microservice)
              </span>
            </div>

            <h3 className="text-sm font-bold text-[var(--gw-ink)]">
              AapdaWatch_NLP_v1.0 (Fine-Tuned DistilBERT)
            </h3>

            <div className="space-y-1.5 text-xs text-[var(--gw-muted)]">
              <div className="flex justify-between">
                <span>Runtime Engine:</span>
                <strong className="text-[var(--gw-ink)]">Transformers 4.45+ (PyTorch CPU / Safetensors)</strong>
              </div>
              <div className="flex justify-between">
                <span>Model Architecture:</span>
                <strong className="text-[var(--gw-ink)]">6-Layer Transformer &bull; 768d &bull; 12 Attention Heads</strong>
              </div>
              <div className="flex justify-between">
                <span>Total Parameters:</span>
                <strong className="text-[var(--gw-ink)]">66,955,010 parameters</strong>
              </div>
              <div className="flex justify-between">
                <span>Inference Latency:</span>
                <strong className="text-[var(--gw-ink)]">~26 ms / prediction</strong>
              </div>
              <div className="flex justify-between">
                <span>Precision / Recall:</span>
                <strong className="text-[var(--gw-ink)]">87.66% Precision / 75.71% Recall</strong>
              </div>
            </div>
          </GlassCard>

          {/* Baseline Model Card: Logistic Regression */}
          <GlassCard className="p-5 space-y-3 border-l-4 border-l-slate-400">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold uppercase text-[var(--gw-muted)]">
                Baseline Reference Benchmark
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/10 text-[var(--gw-muted)] font-bold">
                TF-IDF Baseline
              </span>
            </div>

            <h3 className="text-sm font-bold text-[var(--gw-ink)]">
              {MOCK_BASELINE_MODEL_INFO.name}
            </h3>

            <div className="space-y-1.5 text-xs text-[var(--gw-muted)]">
              <div className="flex justify-between">
                <span>Model Version:</span>
                <strong className="text-[var(--gw-ink)]">{MOCK_BASELINE_MODEL_INFO.version}</strong>
              </div>
              <div className="flex justify-between">
                <span>Baseline Accuracy:</span>
                <strong className="text-[var(--gw-ink)]">79.40% (F1: 73.10%)</strong>
              </div>
              <div className="flex justify-between">
                <span>Feature Pipeline:</span>
                <strong className="text-[var(--gw-ink)]">TF-IDF N-grams (1,2) &rarr; Logistic Regression</strong>
              </div>
              <div className="flex justify-between">
                <span>Contextual Comprehension:</span>
                <strong className="text-amber-600 dark:text-amber-400">Limited (No Self-Attention)</strong>
              </div>
              <div className="flex justify-between">
                <span>Disaster Specificity:</span>
                <strong className="text-[var(--gw-ink)]">Frequent false positives on metaphorical text</strong>
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Confusion Matrix & Architectural Insights */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Confusion Matrix Card */}
          <GlassCard className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[var(--gw-ink)]">
                Validation Confusion Matrix (1,497 Samples)
              </span>
              <span className="text-[10px] text-[var(--gw-muted)]">Test Split (20%)</span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 block">
                  TRUE NEGATIVE (TN)
                </span>
                <div className="text-xl font-bold text-[var(--gw-ink)] my-0.5">791</div>
                <span className="text-[9px] text-[var(--gw-muted)]">Non-disasters correctly rejected</span>
              </div>

              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-300 block">
                  FALSE POSITIVE (FP)
                </span>
                <div className="text-xl font-bold text-[var(--gw-ink)] my-0.5">68</div>
                <span className="text-[9px] text-[var(--gw-muted)]">Non-disasters misflagged</span>
              </div>

              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20">
                <span className="text-[10px] font-semibold text-rose-700 dark:text-rose-300 block">
                  FALSE NEGATIVE (FN)
                </span>
                <div className="text-xl font-bold text-[var(--gw-ink)] my-0.5">155</div>
                <span className="text-[9px] text-[var(--gw-muted)]">Disaster signals missed</span>
              </div>

              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 block">
                  TRUE POSITIVE (TP)
                </span>
                <div className="text-xl font-bold text-[var(--gw-ink)] my-0.5">483</div>
                <span className="text-[9px] text-[var(--gw-muted)]">Disasters correctly alerted</span>
              </div>
            </div>

            <p className="text-[11px] text-[var(--gw-muted)] leading-relaxed">
              At decision boundary <strong>&tau; = 0.43</strong>, the False Positive Rate is constrained to only <strong>7.9%</strong> while capturing <strong>75.7%</strong> of critical life-safety disaster emergencies.
            </p>
          </GlassCard>

          {/* Architecture Insights Card */}
          <GlassCard className="p-5 space-y-3">
            <span className="text-xs font-bold text-[var(--gw-ink)]">
              Model Lineage & Cross-Validation Strategy
            </span>
            <div className="space-y-2.5 text-xs text-[var(--gw-muted)]">
              <div className="p-2.5 rounded-xl bg-black/5 dark:bg-white/5 border border-[var(--gw-line)]">
                <strong className="text-[var(--gw-ink)] block">1. Pre-trained DistilBERT Base:</strong>
                <span>Trained on Toronto BooksCorpus and English Wikipedia with 40% parameter reduction from BERT-base while retaining 97% of language comprehension.</span>
              </div>
              <div className="p-2.5 rounded-xl bg-black/5 dark:bg-white/5 border border-[var(--gw-line)]">
                <strong className="text-[var(--gw-ink)] block">2. Disaster Intent Domain Fine-Tuning:</strong>
                <span>Fine-tuned across real disaster tweet streams with AdamW optimizer, linear warmup, and Cross-Entropy loss with Class Weight regularization.</span>
              </div>
              <div className="p-2.5 rounded-xl bg-black/5 dark:bg-white/5 border border-[var(--gw-line)]">
                <strong className="text-[var(--gw-ink)] block">3. Fallback Multilingual Inference:</strong>
                <span>When non-Latin unicode characters (Hindi, Marathi, Bengali) are detected, input is seamlessly routed to the Indic lexicon analyzer.</span>
              </div>
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
