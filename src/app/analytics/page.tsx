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
              className={`px-3 py-1 rounded-lg transition-colors font-medium ${
                timeRange === "7d"
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
              className={`px-3 py-1 rounded-lg transition-colors font-medium ${
                timeRange === "30d"
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
      {/* SECTION 2: MODEL PERFORMANCE & BENCHMARKING (STRICTLY HONEST) */}
      {/* ============================================================== */}
      <div className="space-y-4 pt-4 border-t border-black/5 dark:border-white/10">
        <div>
          <h2 className="text-base font-bold text-[#242B27] dark:text-[#E8EDE9] flex items-center gap-2">
            <Cpu className="w-5 h-5 text-[#326B54]" />
            <span>NLP Model Evaluation & Performance</span>
          </h2>
          <p className="text-xs text-[#737A70]">
            Validation benchmarks, dataset context, and architecture specifications
          </p>
        </div>

        {/* Model Meta Card */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Target Model Card: Bi-LSTM */}
          <GlassCard className="p-5 space-y-3 border-l-4 border-l-[#326B54]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold uppercase text-[#326B54] dark:text-[#DCE9DA]">
                Active Production Model
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 font-bold">
                Active Inference (Port 8001)
              </span>
            </div>

            <h3 className="text-sm font-bold text-[#242B27] dark:text-[#E8EDE9]">
              AapdaWatch_BiLSTM (Bidirectional LSTM)
            </h3>

            <div className="space-y-1.5 text-xs text-[#737A70]">
              <div className="flex justify-between">
                <span>Runtime Framework:</span>
                <strong className="text-[#242B27] dark:text-[#E8EDE9]">Keras 3.15.1 (PyTorch 2.15.0+cpu)</strong>
              </div>
              <div className="flex justify-between">
                <span>Model Architecture:</span>
                <strong className="text-[#242B27] dark:text-[#E8EDE9]">128d Embed → 64u BiLSTM → 32u Dense → Sigmoid</strong>
              </div>
              <div className="flex justify-between">
                <span>Total Parameters:</span>
                <strong className="text-[#242B27] dark:text-[#E8EDE9]">1,890,497 weights</strong>
              </div>
              <div className="flex justify-between">
                <span>Input Shape & Threshold:</span>
                <strong className="text-[#242B27] dark:text-[#E8EDE9]">30 tokens (post-pad) | Threshold: 0.35</strong>
              </div>
              <div className="flex justify-between">
                <span>Vocabulary & Prep Parity:</span>
                <strong className="text-[#242B27] dark:text-[#E8EDE9]">13,965 vocab | Parity: UNVERIFIED</strong>
              </div>
            </div>
          </GlassCard>

          {/* Baseline Model Card: Logistic Regression */}
          <GlassCard className="p-5 space-y-3 border-l-4 border-l-[#66869B]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold uppercase text-[#66869B]">
                Baseline Reference Model
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 font-bold">
                Baseline Spec
              </span>
            </div>

            <h3 className="text-sm font-bold text-[#242B27] dark:text-[#E8EDE9]">
              {MOCK_BASELINE_MODEL_INFO.name}
            </h3>

            <div className="space-y-1.5 text-xs text-[#737A70]">
              <div className="flex justify-between">
                <span>Model Version:</span>
                <strong className="text-[#242B27] dark:text-[#E8EDE9]">{MOCK_BASELINE_MODEL_INFO.version}</strong>
              </div>
              <div className="flex justify-between">
                <span>Training Dataset:</span>
                <strong className="text-[#242B27] dark:text-[#E8EDE9]">{MOCK_BASELINE_MODEL_INFO.dataset}</strong>
              </div>
              <div className="flex justify-between">
                <span>Feature Pipeline:</span>
                <strong className="text-[#242B27] dark:text-[#E8EDE9]">TF-IDF N-grams (1,2) → Logistic Regression</strong>
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Clear and Honest Empty State for Model Metrics */}
        <GlassCard className="p-8 text-center space-y-3 border border-dashed border-black/20 dark:border-white/20">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-600 mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-bold text-[#242B27] dark:text-[#E8EDE9]">
            Evaluation Data Not Connected
          </h4>
          <p className="text-xs text-[#737A70] max-w-md mx-auto leading-relaxed">
            In compliance with AapdaWatch scientific transparency guidelines, synthetic evaluation scores (Accuracy, Precision, Recall, F1, Confusion Matrix) are intentionally omitted. Real metrics will populate automatically when the trained Bi-LSTM model files are loaded into the FastAPI service in Phase 3.
          </p>

          <div className="pt-2">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-mono font-medium text-[#326B54] bg-[#DCE9DA] px-3 py-1 rounded-full">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Awaiting model artifacts: AapdaWatch_BiLSTM.pkl & tokenizer.pkl</span>
            </span>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
