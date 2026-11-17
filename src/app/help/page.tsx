"use client";

import React from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import {
  CircleHelp,
  BookOpen,
  Cpu,
  Layers,
  Sparkles,
  Zap,
  Globe,
  SlidersHorizontal,
} from "lucide-react";

export default function HelpPage() {
  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h2 className="text-base font-bold text-[var(--gw-ink)] flex items-center gap-2">
          <CircleHelp className="w-5 h-5 text-emerald-500" />
          <span>Documentation & Architecture Guide</span>
        </h2>
        <p className="text-xs text-[var(--gw-muted)]">
          Core principles, neural pipeline, and taxonomy specifications of AapdaWatch AI
        </p>
      </div>

      <div className="space-y-5">
        {/* Section 1: The Three Fundamental Distinctions */}
        <GlassCard className="p-6 space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-emerald-600 dark:text-emerald-400">
            <BookOpen className="w-4 h-4" />
            <h3>1. The Three Fundamental Distinctions</h3>
          </div>
          <p className="text-xs text-[var(--gw-muted)] leading-relaxed">
            AapdaWatch AI enforces strict separation of concerns across the crisis response lifecycle:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1 text-xs">
            <div className="p-4 rounded-2xl bg-black/5 dark:bg-white/5 border border-[var(--gw-line)] space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold flex items-center justify-center text-xs">
                  1
                </span>
                <span className="font-bold text-[var(--gw-ink)]">Classification</span>
              </div>
              <p className="text-[var(--gw-muted)] leading-relaxed">
                The <strong>DistilBERT Transformer v1.0</strong> model predicts whether an incoming message contains urgent disaster semantics, outputting an uncalibrated logit transformed via Sigmoid into an exact hazard probability (0.0 to 1.0).
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-black/5 dark:bg-white/5 border border-[var(--gw-line)] space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold flex items-center justify-center text-xs">
                  2
                </span>
                <span className="font-bold text-[var(--gw-ink)]">Correlation</span>
              </div>
              <p className="text-[var(--gw-muted)] leading-relaxed">
                The correlation engine analyzes temporal clustering (sliding 4-hour window), named entity recognition (NER locations), and hazard categories to aggregate disjoint field signals into a single unified <strong>Incident Folder</strong>.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-black/5 dark:bg-white/5 border border-[var(--gw-line)] space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold flex items-center justify-center text-xs">
                  3
                </span>
                <span className="font-bold text-[var(--gw-ink)]">Verification</span>
              </div>
              <p className="text-[var(--gw-muted)] leading-relaxed">
                Human-in-the-loop disaster operators corroborate automated alerts against official agency channels (NDMA, IMD, SDRF), assigning audit ground-truth status: <em>Verified</em>, <em>False Positive</em>, or <em>Duplicate</em>.
              </p>
            </div>
          </div>
        </GlassCard>

        {/* Section 2: Production Model Architecture (DistilBERT v1.0) */}
        <GlassCard className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-bold text-emerald-600 dark:text-emerald-400">
              <Cpu className="w-4 h-4" />
              <h3>2. Production Model Architecture: AapdaWatch DistilBERT v1.0</h3>
            </div>
            <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              FINE-TUNED TRANSFORMER
            </span>
          </div>

          <p className="text-xs text-[var(--gw-muted)] leading-relaxed">
            The platform utilizes an end-to-end fine-tuned <strong>DistilBERT</strong> (<code className="px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/10 font-mono text-[11px]">distilbert-base-uncased</code>) sequence classification model stored under <code className="px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/10 font-mono text-[11px]">new-ml-model/AapdaWatch_NLP_v1.0</code> with Hugging Face Safetensors format.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-1">
            <div className="p-3 rounded-xl bg-black/5 dark:bg-white/5 border border-[var(--gw-line)]">
              <span className="text-[11px] text-[var(--gw-muted)] block">Parameters</span>
              <strong className="text-sm font-bold text-[var(--gw-ink)]">66,955,010</strong>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block mt-0.5">6-layer Transformer</span>
            </div>
            <div className="p-3 rounded-xl bg-black/5 dark:bg-white/5 border border-[var(--gw-line)]">
              <span className="text-[11px] text-[var(--gw-muted)] block">Decision Threshold</span>
              <strong className="text-sm font-bold text-[var(--gw-ink)]">&tau; = 0.43</strong>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block mt-0.5">Calibrated High Recall</span>
            </div>
            <div className="p-3 rounded-xl bg-black/5 dark:bg-white/5 border border-[var(--gw-line)]">
              <span className="text-[11px] text-[var(--gw-muted)] block">Offline Validation</span>
              <strong className="text-sm font-bold text-[var(--gw-ink)]">85.10% Acc / 0.899 AUC</strong>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block mt-0.5">81.24% F1-Score</span>
            </div>
            <div className="p-3 rounded-xl bg-black/5 dark:bg-white/5 border border-[var(--gw-line)]">
              <span className="text-[11px] text-[var(--gw-muted)] block">Inference Latency</span>
              <strong className="text-sm font-bold text-[var(--gw-ink)]">~26 ms</strong>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block mt-0.5">CPU ONNX / PyTorch</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 space-y-2 text-xs">
            <div className="flex items-center gap-1.5 font-bold text-emerald-700 dark:text-emerald-300">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Transformer Attention Advantages Over Bi-LSTM</span>
            </div>
            <p className="text-[var(--gw-muted)] leading-relaxed">
              Unlike recurrent architectures that process tokens sequentially (which suffer from gradient decay across long texts), DistilBERT employs 12 bidirectional self-attention heads that evaluate all token relations simultaneously. This allows the model to distinguish metaphorical language (e.g., &ldquo;<em>my inbox is flooded with emails</em>&rdquo;) from actual natural disasters (e.g., &ldquo;<em>rivers overflowed and flooded houses</em>&rdquo;) with high precision.
            </p>
          </div>
        </GlassCard>

        {/* Section 3: Dual Engine & Multilingual Fallback */}
        <GlassCard className="p-6 space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-emerald-600 dark:text-emerald-400">
            <Globe className="w-4 h-4" />
            <h3>3. Multilingual Indic Language Pipeline</h3>
          </div>
          <p className="text-xs text-[var(--gw-muted)] leading-relaxed">
            In disaster events across the Indian subcontinent, field reports frequently arrive in vernacular languages or code-mixed Hinglish. The FastAPI inference gateway routes requests dynamically:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-2xl bg-black/5 dark:bg-white/5 border border-[var(--gw-line)] space-y-2">
              <div className="flex items-center gap-2 font-bold text-[var(--gw-ink)]">
                <Zap className="w-4 h-4 text-emerald-500" />
                <span>Primary Engine: DistilBERT v1.0</span>
              </div>
              <p className="text-[var(--gw-muted)] leading-relaxed">
                Handles all English and romanized Hinglish emergency texts with contextual embeddings, positional encodings, and optimal 0.43 thresholding.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-black/5 dark:bg-white/5 border border-[var(--gw-line)] space-y-2">
              <div className="flex items-center gap-2 font-bold text-[var(--gw-ink)]">
                <Layers className="w-4 h-4 text-blue-500" />
                <span>Indic Multilingual Gateway</span>
              </div>
              <p className="text-[var(--gw-muted)] leading-relaxed">
                Recognizes Devanagari, Bengali, and Marathi scripts (e.g., <span className="font-semibold text-[var(--gw-ink)]">बाढ़</span>, <span className="font-semibold text-[var(--gw-ink)]">भूकंप</span>, <span className="font-semibold text-[var(--gw-ink)]">मुसळधार पाऊस</span>, <span className="font-semibold text-[var(--gw-ink)]">বন্যা</span>) and matches lexicon vectors with location telemetry.
              </p>
            </div>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
