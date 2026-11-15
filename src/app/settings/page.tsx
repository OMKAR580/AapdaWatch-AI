"use client";

import React from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import { Settings, Shield, Sliders, Database } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-base font-bold text-[#242B27] dark:text-[#E8EDE9] flex items-center gap-2">
          <Settings className="w-5 h-5 text-[#326B54]" />
          <span>System & Workspace Settings</span>
        </h2>
        <p className="text-xs text-[#737A70]">Configure monitoring thresholds, alert triggers, and model inference targets</p>
      </div>

      <div className="space-y-4">
        <GlassCard className="p-5 space-y-3">
          <div className="flex items-center gap-3">
            <Sliders className="w-5 h-5 text-[#326B54]" />
            <div>
              <h3 className="text-sm font-bold text-[#242B27] dark:text-[#E8EDE9]">
                Disaster Probability Threshold
              </h3>
              <p className="text-xs text-[#737A70]">
                Minimum confidence score required for an incoming report to automatically trigger incident correlation.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 pt-2">
            <input
              type="range"
              min="20"
              max="80"
              defaultValue="35"
              className="flex-1 accent-[#326B54]"
            />
            <span className="text-xs font-mono font-bold bg-[#DCE9DA] text-[#326B54] px-2.5 py-1 rounded-lg">
              0.35 (35% Neural Threshold)
            </span>
          </div>
        </GlassCard>

        <GlassCard className="p-5 space-y-3">
          <div className="flex items-center gap-3">
            <Database className="w-5 h-5 text-[#326B54]" />
            <div>
              <h3 className="text-sm font-bold text-[#242B27] dark:text-[#E8EDE9]">
                Inference Engine Service Endpoint
              </h3>
              <p className="text-xs text-[#737A70]">
                FastAPI microservice endpoint hosting the trained BiLSTM neural model on port 8001.
              </p>
            </div>
          </div>
          <div className="pt-1">
            <input
              type="text"
              readOnly
              value="http://localhost:8001/predict (FastAPI BiLSTM Active)"
              className="w-full px-3 py-2 text-xs rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 font-mono text-[#737A70]"
            />
          </div>
        </GlassCard>

        <GlassCard className="p-5 space-y-3">
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-[#326B54]" />
            <div>
              <h3 className="text-sm font-bold text-[#242B27] dark:text-[#E8EDE9]">
                Operator Jurisdiction & Access Mode
              </h3>
              <p className="text-xs text-[#737A70]">
                Active role configuration for human-in-the-loop disaster verification.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 pt-1 text-xs">
            <span className="px-3 py-1 rounded-full bg-[#DCE9DA] text-[#326B54] font-bold">
              OPERATIONAL ANALYST MODE (Unauthenticated Development)
            </span>
            <span className="text-[#737A70]">Full administrative verification privileges enabled.</span>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
