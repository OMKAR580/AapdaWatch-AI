"use client";

import React from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import { CircleHelp, BookOpen, Cpu } from "lucide-react";

export default function HelpPage() {
  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-base font-bold text-[#242B27] dark:text-[#E8EDE9] flex items-center gap-2">
          <CircleHelp className="w-5 h-5 text-[#326B54]" />
          <span>Documentation & Architecture Guide</span>
        </h2>
        <p className="text-xs text-[#737A70]">Core principles of the AapdaWatch AI disaster intelligence system</p>
      </div>

      <div className="space-y-4">
        <GlassCard className="p-6 space-y-3">
          <div className="flex items-center gap-2 text-sm font-bold text-[#326B54] dark:text-[#DCE9DA]">
            <BookOpen className="w-4 h-4" />
            <h3>1. The Three Fundamental Distinctions</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 text-xs">
            <div className="p-3.5 rounded-xl bg-black/5 dark:bg-white/5 space-y-1">
              <span className="font-bold text-[#242B27] dark:text-[#E8EDE9] block">1. Classification</span>
              <p className="text-[#737A70] leading-relaxed">
                The NLP Bi-LSTM model predicts whether a text string contains emergency hazard semantics. Returns a probability score (0.0 to 1.0).
              </p>
            </div>
            <div className="p-3.5 rounded-xl bg-black/5 dark:bg-white/5 space-y-1">
              <span className="font-bold text-[#242B27] dark:text-[#E8EDE9] block">2. Correlation</span>
              <p className="text-[#737A70] leading-relaxed">
                The incident correlation engine evaluates time windows, named entities, and geographic proximity to suggest uniting reports into an incident folder.
              </p>
            </div>
            <div className="p-3.5 rounded-xl bg-black/5 dark:bg-white/5 space-y-1">
              <span className="font-bold text-[#242B27] dark:text-[#E8EDE9] block">3. Verification</span>
              <p className="text-[#737A70] leading-relaxed">
                A human reviewer corroborates claims against official dispatches, assigning final ground-truth status (Verified, False Positive, Duplicate).
              </p>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-6 space-y-3">
          <div className="flex items-center gap-2 text-sm font-bold text-[#326B54] dark:text-[#DCE9DA]">
            <Cpu className="w-4 h-4" />
            <h3>2. Model Pipeline Roadmap</h3>
          </div>
          <p className="text-xs text-[#737A70] leading-relaxed">
            The trained model artifacts (<code className="bg-black/5 px-1 py-0.5 rounded">tokenizer.pkl</code>, <code className="bg-black/5 px-1 py-0.5 rounded">AapdaWatch_BiLSTM.pkl</code>, and <code className="bg-black/5 px-1 py-0.5 rounded">preprocessing.py</code>) will be hosted in a standalone Python FastAPI service in Phase 3. The frontend communicates with it via REST APIs.
          </p>
        </GlassCard>
      </div>
    </div>
  );
}
