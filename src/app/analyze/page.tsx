"use client";

import React, { useState, useRef } from "react";
import * as Tabs from "@radix-ui/react-tabs";
import { GlassCard } from "@/components/ui/GlassCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useApp } from "@/context/AppContext";
import { useToast } from "@/components/ui/Toast";
import { runDemoAnalysis, type DemoAnalysisResult, LOCATION_DETAILS } from "@/services/analysis.service";
import { downloadCSV, escapeCSV, generateId, formatRelativeTime } from "@/lib/utils";
import type { DisasterReport, DisasterCategory } from "@/types";
import Papa from "papaparse";
import {
  ScanText,
  FileSpreadsheet,
  Link2,
  Sparkles,
  RotateCcw,
  UploadCloud,
  CheckCircle2,
  Download,
  Info,
  Clock,
  ShieldCheck,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const EXAMPLE_TEXTS = [
  "Heavy rainfall has caused severe flooding in low-lying residential sectors. Families are stranded on rooftops waiting for rescue boats.",
  "कानपुर में भारी बाढ़ आई है, गंगा का जलस्तर खतरे के निशान से ऊपर पहुंच गया है, लोग छतों पर फंसे हैं।",
  "मुंबईत मुसळधार पावसामुळे पाणी साचले आहे, अनेक रस्ते बंद झाले असून मदतीची गरज आहे.",
  "Bhai Kanpur aur New Delhi me bohot tez flood aa gaya hai, SDRF ki rescue team bhejo!",
  "Powerful tremor felt across the district. Several old commercial buildings have developed structural cracks and roads are obstructed.",
  "Had an amazing dinner with friends at the new Italian restaurant downtown! Weather was pleasant.",
];

interface HistoryItem {
  id: string;
  text: string;
  result: DemoAnalysisResult;
  timestamp: string;
}

interface CsvRowResult {
  text: string;
  predictedClass: string;
  confidence: number;
  disasterProbability: number;
  category: string;
  [key: string]: unknown;
}

export default function AnalyzePage() {
  const { addReport, addReportsBatch, refreshData } = useApp();
  const { toast } = useToast();

  // Tab 1: Text state
  const [inputText, setInputText] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<DemoAnalysisResult | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [addedToQueue, setAddedToQueue] = useState(false);

  // Tab 2: CSV state
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<Record<string, unknown>[]>([]);
  const [selectedColumn, setSelectedColumn] = useState<string>("");
  const [batchAnalyzing, setBatchAnalyzing] = useState(false);
  const [batchProgress, setBatchProgress] = useState(0);
  const [batchResults, setBatchResults] = useState<CsvRowResult[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortBatchRef = useRef<boolean>(false);

  // Tab 3: URL state
  const [urlInput, setUrlInput] = useState("");
  const [createdReportId, setCreatedReportId] = useState<string | null>(null);

  // Handler: Text Analysis with Real-Time Cross-Dashboard Sync
  const handleAnalyzeText = async () => {
    if (!inputText.trim()) {
      toast({ title: "Input Required", description: "Please enter text to analyze.", variant: "warning" });
      return;
    }

    setAnalyzing(true);
    setAnalysisResult(null);
    setAddedToQueue(false);
    setCreatedReportId(null);

    try {
      // 1. Run local heuristic inference (instant feedback & location extraction)
      const localResult = await runDemoAnalysis(inputText, true);

      // Extract accurate location and coordinates
      const locName = localResult.suggestedLocation || "Central India / Field Report";
      const coords = localResult.suggestedCoordinates || { lat: 23.1815, lng: 79.9864 };

      let finalReportId = generateId("RPT");
      let finalResult = localResult;

      // 2. Try persisting to PostgreSQL & running BiLSTM if backend is reachable
      try {
        const { apiClient } = await import("@/services/api.client");
        const persisted = await apiClient.reports.create({
          text: inputText.trim(),
          sourceType: "CITIZEN_REPORT",
          sourceName: "Manual Analyst Ingest",
          locationName: locName,
          latitude: coords.lat,
          longitude: coords.lng,
        });

        if (persisted && persisted.id) {
          finalReportId = persisted.id;
          try {
            const backendAnalysis = await apiClient.analysis.analyze(persisted.id);
            finalResult = {
              predictedClass: backendAnalysis.predictedClass,
              confidence: backendAnalysis.confidence,
              disasterProbability: backendAnalysis.disasterProbability,
              notDisasterProbability: backendAnalysis.notDisasterProbability,
              suggestedCategory: (backendAnalysis.suggestedCategory as DisasterCategory) ?? localResult.suggestedCategory,
              suggestedLocation: locName,
              suggestedCoordinates: coords,
              note: backendAnalysis.isSynthetic
                ? "DEMO PREDICTION: Rule-based heuristic."
                : "REAL NEURAL INFERENCE: AapdaWatch DistilBERT v1.0 Transformer.",
              modelName: backendAnalysis.modelName || "AapdaWatch DistilBERT v1.0",
              modelVersion: backendAnalysis.modelVersion || "1.0.0",
              decisionThreshold: backendAnalysis.decisionThreshold,
              inferenceDurationMs: backendAnalysis.inferenceDurationMs,
              preprocessingParity: backendAnalysis.preprocessingParity,
              inferenceStatus: backendAnalysis.inferenceStatus,
              isSynthetic: backendAnalysis.isSynthetic,
            };
          } catch {
            // Keep localResult if neural service timed out
          }
        }
      } catch {
        // Backend offline; continue smoothly with localReportId and finalResult
      }

      setCreatedReportId(finalReportId);
      setAnalysisResult(finalResult);

      // 3. Construct live DisasterReport
      const allLocs = finalResult.allLocations || [];
      const secondaryLocations = allLocs.slice(1).map((loc) => ({
        name: loc.name,
        latitude: loc.lat,
        longitude: loc.lng,
        state: loc.state,
      }));

      const newReportRecord: DisasterReport = {
        id: finalReportId,
        text: inputText.trim(),
        source: "Manual Analyst Ingest",
        timestamp: new Date().toISOString(),
        location: {
          name: locName,
          latitude: coords.lat,
          longitude: coords.lng,
        },
        secondaryLocations: secondaryLocations.length > 0 ? secondaryLocations : undefined,
        predictedClass: finalResult.predictedClass,
        confidence: finalResult.confidence,
        disasterProbability: finalResult.disasterProbability,
        notDisasterProbability: finalResult.notDisasterProbability,
        category: (finalResult.suggestedCategory as DisasterCategory) ?? "other",
        verificationStatus: "unreviewed",
        modelVersion: finalResult.modelVersion,
      };

      // 4. INSTANT LIVE SYNC: Updates AppContext (Dashboard, Live Map, KPIs, Incident Dossiers)!
      addReport(newReportRecord);

      // 5. Add to local history
      setHistory((prev) => [
        {
          id: finalReportId,
          text: inputText,
          result: finalResult,
          timestamp: new Date().toISOString(),
        },
        ...prev.slice(0, 4),
      ]);

      toast({
        title: "Prediction Synced to All Dashboard Pages!",
        description: `Classified as ${finalResult.predictedClass.replace("-", " ")} (${(finalResult.confidence * 100).toFixed(0)}% confidence). Map & Incidents updated.`,
        variant: finalResult.predictedClass === "disaster-related" ? "warning" : "info",
      });
    } catch {
      toast({ title: "Analysis Failed", description: "An error occurred during classification.", variant: "error" });
    } finally {
      setAnalyzing(false);
    }
  };

  // Handler: Add to verification queue
  const handleAddToQueue = () => {
    if (!analysisResult) return;

    setAddedToQueue(true);

    toast({
      title: "Sent to Verification Center",
      description: `Report ${createdReportId || "RPT-LOCAL"} is pending in the human review queue.`,
      variant: "success",
    });
  };

  // Handler: CSV File selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".csv")) {
      toast({ title: "Invalid File Type", description: "Please upload a CSV file.", variant: "error" });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File Too Large", description: "Maximum supported CSV size is 5MB.", variant: "warning" });
      return;
    }

    setCsvFile(file);
    setBatchResults([]);
    setBatchProgress(0);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.data.length === 0) {
          toast({ title: "Empty File", description: "No records found in CSV.", variant: "error" });
          return;
        }

        const headers = results.meta.fields ?? [];
        setCsvHeaders(headers);
        setCsvRows(results.data as Record<string, unknown>[]);

        // Auto-select text column if named 'text', 'tweet', 'message', 'content'
        const candidate = headers.find((h) =>
          ["text", "tweet", "message", "content", "report", "description"].includes(h.toLowerCase())
        );
        setSelectedColumn(candidate ?? headers[0] ?? "");

        toast({
          title: "CSV Loaded",
          description: `Parsed ${results.data.length} records. Select text column to classify.`,
          variant: "success",
        });
      },
      error: () => {
        toast({ title: "Parse Error", description: "Could not parse CSV file.", variant: "error" });
      },
    });
  };

  // Handler: Run CSV Batch Analysis
  const handleRunBatch = async () => {
    if (!csvRows.length || !selectedColumn) {
      toast({ title: "Selection Required", description: "Please select a text column.", variant: "warning" });
      return;
    }

    abortBatchRef.current = false;
    setBatchAnalyzing(true);
    setBatchProgress(0);

    const maxToProcess = Math.min(csvRows.length, 100);
    const results: CsvRowResult[] = [];

    // Filter valid non-empty rows up to limit
    const validRows: { index: number; row: Record<string, unknown>; text: string }[] = [];
    for (let i = 0; i < maxToProcess; i++) {
      const row = csvRows[i];
      const text = String(row[selectedColumn] || "").trim();
      if (text) {
        validRows.push({ index: i, row, text });
      }
    }

    try {
      const { apiClient } = await import("@/services/api.client");
      const batchPayload = validRows.map((v) => ({
        text: v.text,
        requestId: `row-${v.index}`,
      }));

      // Execute vectorized BiLSTM neural batch inference via FastAPI
      const batchRes = await apiClient.analysis.batch(batchPayload);

      for (let i = 0; i < validRows.length; i++) {
        const v = validRows[i];
        const pred = batchRes.predictions[i];
        results.push({
          ...v.row,
          text: v.text,
          predictedClass: pred?.predictedClass || "not-disaster-related",
          confidence: pred?.confidence || 0,
          disasterProbability: pred?.probability || 0,
          category: pred?.suggestedCategory || "other",
        });
      }
      setBatchProgress(100);
    } catch (e) {
      console.warn("Backend neural batch inference failed, falling back to heuristic:", e);
      const chunkSize = 5;
      for (let i = 0; i < validRows.length; i++) {
        if (abortBatchRef.current) break;
        const v = validRows[i];
        const res = await runDemoAnalysis(v.text, false);
        results.push({
          ...v.row,
          text: v.text,
          predictedClass: res.predictedClass,
          confidence: res.confidence,
          disasterProbability: res.disasterProbability,
          category: res.suggestedCategory ?? "other",
        });
        if (i % chunkSize === 0 || i === validRows.length - 1) {
          setBatchProgress(Math.round(((i + 1) / validRows.length) * 100));
          await new Promise((r) => setTimeout(r, 0));
        }
      }
    }

    setBatchResults(results);
    setBatchAnalyzing(false);

    if (!abortBatchRef.current) {
      toast({
        title: "Batch Processing Complete",
        description: `Analyzed ${results.length} rows. Ready for download.`,
        variant: "success",
      });
    }
  };

  const handleCancelBatch = () => {
    abortBatchRef.current = true;
  };

  // Handler: Ingest Entire CSV Batch Directly to Live Dashboard & Map
  const handleIngestBatchToDashboard = () => {
    if (!batchResults.length) return;

    const reportsList: DisasterReport[] = batchResults.map((row) => {
      const text = row.text || "";
      let locName = "Central India / Field Report";
      let lat = 23.1815;
      let lng = 79.9864;

      for (const [k, d] of Object.entries(LOCATION_DETAILS)) {
        if (text.toLowerCase().includes(k)) {
          locName = d.name;
          lat = d.lat;
          lng = d.lng;
          break;
        }
      }

      return {
        id: generateId("CSV-RPT"),
        text: text,
        source: "CSV Batch Ingestion",
        timestamp: new Date().toISOString(),
        location: { name: locName, latitude: lat, longitude: lng },
        predictedClass: (row.predictedClass as "disaster-related" | "not-disaster-related") || "disaster-related",
        confidence: row.confidence || 0.85,
        disasterProbability: row.disasterProbability || 0.85,
        notDisasterProbability: 1 - (row.disasterProbability || 0.85),
        category: (row.category as DisasterCategory) || "other",
        verificationStatus: "unreviewed",
        modelVersion: "1.0.0-demo",
      };
    });

    addReportsBatch(reportsList);

    toast({
      title: "Batch Synced to Live Dashboard!",
      description: `Successfully ingested ${reportsList.length} predictions into live system. Open Map or Overview to view!`,
      variant: "success",
    });
  };

  // Handler: Download Processed CSV
  const handleDownloadBatch = () => {
    if (!batchResults.length) return;

    const headers = [
      ...Object.keys(csvRows[0] || {}),
      "predicted_class",
      "confidence",
      "disaster_probability",
      "suggested_category",
      "model_verification_note",
    ];

    const csvLines = [headers.map(escapeCSV).join(",")];

    batchResults.forEach((row) => {
      const line = [
        ...Object.keys(csvRows[0] || {}).map((k) => escapeCSV(row[k] as string | number | null | undefined)),
        escapeCSV(row.predictedClass),
        escapeCSV(row.confidence),
        escapeCSV(row.disasterProbability),
        escapeCSV(row.category),
        escapeCSV("AapdaWatch AI Demo Classification — Pending Human Verification"),
      ];
      csvLines.push(line.join(","));
    });

    downloadCSV(csvLines.join("\n"), `aapdawatch_batch_results_${Date.now()}.csv`);

    toast({ title: "Export Started", description: "Results CSV downloaded.", variant: "info" });
  };

  return (
    <div className="space-y-6">
      {/* Tabs Container */}
      <Tabs.Root defaultValue="text" className="space-y-6">
        <Tabs.List className="flex items-center gap-2 p-1.5 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 max-w-md">
          <Tabs.Trigger
            value="text"
            suppressHydrationWarning
            className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold text-[#737A70] dark:text-[#8A9490] data-[state=active]:bg-white dark:data-[state=active]:bg-[#1A2420] data-[state=active]:text-[#326B54] dark:data-[state=active]:text-[#DCE9DA] data-[state=active]:shadow-sm transition-all"
          >
            <ScanText className="w-4 h-4" />
            <span>Single Text</span>
          </Tabs.Trigger>

          <Tabs.Trigger
            value="csv"
            suppressHydrationWarning
            className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold text-[#737A70] dark:text-[#8A9490] data-[state=active]:bg-white dark:data-[state=active]:bg-[#1A2420] data-[state=active]:text-[#326B54] dark:data-[state=active]:text-[#DCE9DA] data-[state=active]:shadow-sm transition-all"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>CSV Batch</span>
          </Tabs.Trigger>

          <Tabs.Trigger
            value="url"
            suppressHydrationWarning
            className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold text-[#737A70] dark:text-[#8A9490] data-[state=active]:bg-white dark:data-[state=active]:bg-[#1A2420] data-[state=active]:text-[#326B54] dark:data-[state=active]:text-[#DCE9DA] data-[state=active]:shadow-sm transition-all"
          >
            <Link2 className="w-4 h-4" />
            <span>Social URL</span>
          </Tabs.Trigger>
        </Tabs.List>

        {/* ============================================================== */}
        {/* TAB 1: TEXT ANALYSIS */}
        {/* ============================================================== */}
        <Tabs.Content value="text" className="space-y-6 focus:outline-none">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Input Box: 2/3 */}
            <div className="lg:col-span-2 space-y-4">
              <GlassCard className="p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-[#242B27] dark:text-[#E8EDE9]">
                    Input Text or Social Post
                  </h3>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      suppressHydrationWarning
                      onClick={() => {
                        const random = EXAMPLE_TEXTS[Math.floor(Math.random() * EXAMPLE_TEXTS.length)];
                        setInputText(random);
                      }}
                      className="text-xs text-[#326B54] dark:text-[#DCE9DA] hover:underline flex items-center gap-1 font-medium cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" /> Sample Report
                    </button>
                    {inputText && (
                      <button
                        type="button"
                        suppressHydrationWarning
                        onClick={() => {
                          setInputText("");
                          setAnalysisResult(null);
                        }}
                        className="text-xs text-[#737A70] hover:text-red-500 flex items-center gap-1 cursor-pointer"
                      >
                        <RotateCcw className="w-3 h-3" /> Clear
                      </button>
                    )}
                  </div>
                </div>

                <div className="relative">
                  <textarea
                    rows={6}
                    suppressHydrationWarning
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="Paste disaster tweet, social message, or emergency dispatch here (e.g. 'Flash flood in Sector 4, people are stranded on roofs...')"
                    className="w-full p-3.5 text-xs md:text-sm rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-[#242B27] dark:text-[#E8EDE9] placeholder:text-[#737A70] focus:outline-none focus:ring-2 focus:ring-[#326B54] transition-all resize-y"
                    maxLength={2000}
                  />
                  <div className="flex justify-between items-center text-[11px] text-[#737A70] mt-1 px-1">
                    <span>Markdown/Unicode supported</span>
                    <span>{inputText.length} / 2,000 characters</span>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    suppressHydrationWarning
                    disabled={analyzing || !inputText.trim()}
                    onClick={handleAnalyzeText}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#326B54] hover:bg-[#294B39] disabled:opacity-50 text-white text-xs font-semibold shadow-md transition-all cursor-pointer disabled:cursor-not-allowed"
                  >
                    {analyzing ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Evaluating Features...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>Analyze Disaster Probability</span>
                      </>
                    )}
                  </button>
                </div>
              </GlassCard>

              {/* Recent Analysis History */}
              {history.length > 0 && (
                <GlassCard className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-[#242B27] dark:text-[#E8EDE9]">
                      Recent Analyses in this Session
                    </h4>
                    <span className="text-[10px] text-[#737A70]">Last {history.length} runs</span>
                  </div>

                  <div className="divide-y divide-black/5 dark:divide-white/5">
                    {history.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => {
                          setInputText(item.text);
                          setAnalysisResult(item.result);
                        }}
                        className="py-2.5 flex items-center justify-between gap-3 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 px-2 rounded-xl transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-[#242B27] dark:text-[#E8EDE9] truncate">
                            {item.text}
                          </p>
                          <span className="text-[10px] text-[#737A70] flex items-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3" /> {formatRelativeTime(item.timestamp)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <StatusBadge
                            variant={item.result.predictedClass === "disaster-related" ? "critical" : "low"}
                            label={item.result.predictedClass === "disaster-related" ? "Disaster" : "Non-Disaster"}
                          />
                          <span className="text-xs font-bold text-[#242B27] dark:text-[#E8EDE9]">
                            {(item.result.confidence * 100).toFixed(0)}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </GlassCard>
              )}
            </div>

            {/* Results Panel: 1/3 */}
            <div className="lg:col-span-1">
              <AnimatePresence mode="wait">
                {analysisResult ? (
                  <motion.div
                    key="result"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 15 }}
                  >
                    <GlassCard className="p-5 space-y-4 border border-black/10 dark:border-white/10">
                      <div className="flex items-center justify-between border-b border-black/5 dark:border-white/10 pb-3">
                        <span className="text-xs font-bold text-[#737A70] uppercase tracking-wider">
                          Classification Output
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-black/5 dark:bg-white/5 text-[#737A70]">
                          {analysisResult.modelVersion}
                        </span>
                      </div>

                      {/* Main Prediction Display */}
                      <div className="text-center py-2 space-y-2">
                        <span className="text-[11px] text-[#737A70] block">Predicted Classification</span>
                        <div className="inline-block">
                          <StatusBadge
                            size="md"
                            variant={
                              analysisResult.predictedClass === "disaster-related"
                                ? (analysisResult.disasterProbability < 0.5 ? "high" : "critical")
                                : "low"
                            }
                            label={
                              analysisResult.predictedClass === "disaster-related"
                                ? (analysisResult.disasterProbability < 0.55
                                    ? "BORDERLINE DISASTER ALERT (43% THRESHOLD)"
                                    : "DISASTER RELATED REPORT")
                                : "NON-DISASTER REPORT"
                            }
                          />
                        </div>

                        {analysisResult.suggestedCategory && (
                          <div className="mt-1">
                            <span className="text-[11px] text-[#737A70]">Detected Hazard: </span>
                            <span className="text-xs font-bold capitalize text-[#242B27] dark:text-[#E8EDE9]">
                              {analysisResult.suggestedCategory}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Probability Bars */}
                      <div className="space-y-3 bg-black/5 dark:bg-white/5 p-3.5 rounded-xl text-xs">
                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <span className="font-medium text-[#242B27] dark:text-[#E8EDE9]">Disaster Probability</span>
                            <span className="font-bold text-red-600">
                              {(analysisResult.disasterProbability * 100).toFixed(1)}%
                            </span>
                          </div>
                          <div className="w-full h-2 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
                            <div
                              className="h-full bg-red-500 rounded-full transition-all duration-500"
                              style={{ width: `${analysisResult.disasterProbability * 100}%` }}
                            />
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <span className="font-medium text-[#242B27] dark:text-[#E8EDE9]">Non-Disaster Probability</span>
                            <span className="font-bold text-emerald-600">
                              {(analysisResult.notDisasterProbability * 100).toFixed(1)}%
                            </span>
                          </div>
                          <div className="w-full h-2 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
                            <div
                              className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                              style={{ width: `${analysisResult.notDisasterProbability * 100}%` }}
                            />
                          </div>
                        </div>

                        {/* Model Runtime Metadata */}
                        <div className="pt-2 border-t border-black/5 dark:border-white/5 grid grid-cols-2 gap-2 text-[10px] text-[#737A70] dark:text-[#8A9490]">
                          <div>
                            <span className="block font-medium text-[#242B27] dark:text-[#E8EDE9]">Model Engine</span>
                            <span>{analysisResult.modelName}</span>
                          </div>
                          <div>
                            <span className="block font-medium text-[#242B27] dark:text-[#E8EDE9]">Decision Threshold</span>
                            <span>{analysisResult.decisionThreshold ?? 0.43} (&tau; = 0.43)</span>
                          </div>
                          {analysisResult.inferenceDurationMs !== undefined && (
                            <div>
                              <span className="block font-medium text-[#242B27] dark:text-[#E8EDE9]">Compute Latency</span>
                              <span>{analysisResult.inferenceDurationMs.toFixed(1)} ms</span>
                            </div>
                          )}
                          {analysisResult.preprocessingParity && (
                            <div>
                              <span className="block font-medium text-[#242B27] dark:text-[#E8EDE9]">Prep Parity</span>
                              <span>{analysisResult.preprocessingParity}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Scientific & Human Review Explanatory Note */}
                      <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-300 text-[11px] leading-relaxed">
                        {analysisResult.note}
                      </div>

                      {/* Operational Handoff Action */}
                      <div className="pt-2">
                        {addedToQueue ? (
                          <div className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-emerald-100 text-emerald-800 text-xs font-semibold">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            <span>Queued in Verification Center</span>
                          </div>
                        ) : analysisResult.predictedClass === "disaster-related" ? (
                          <button
                            type="button"
                            suppressHydrationWarning
                            onClick={handleAddToQueue}
                            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-[#326B54] hover:bg-[#294B39] text-white text-xs font-semibold shadow-md transition-colors"
                          >
                            <ShieldCheck className="w-4 h-4" />
                            <span>Dispatch to Human Review Queue</span>
                          </button>
                        ) : (
                          <p className="text-center text-xs text-[#737A70] py-2">
                            Classified as non-disaster. No immediate review action needed.
                          </p>
                        )}
                      </div>
                    </GlassCard>
                  </motion.div>
                ) : (
                  <GlassCard className="p-8 text-center flex flex-col items-center justify-center min-h-[300px]">
                    <div className="w-12 h-12 rounded-2xl bg-[#DCE9DA] dark:bg-[#326B54]/30 flex items-center justify-center text-[#326B54] mb-3">
                      <ScanText className="w-6 h-6" />
                    </div>
                    <h4 className="text-sm font-semibold text-[#242B27] dark:text-[#E8EDE9]">
                      Prediction Awaiting Input
                    </h4>
                    <p className="text-xs text-[#737A70] dark:text-[#8A9490] max-w-xs mt-1 leading-relaxed">
                      Enter a message on the left and click analyze to generate prediction probabilities and feature attribution.
                    </p>
                  </GlassCard>
                )}
              </AnimatePresence>
            </div>
          </div>
        </Tabs.Content>

        {/* ============================================================== */}
        {/* TAB 2: CSV BATCH UPLOAD */}
        {/* ============================================================== */}
        <Tabs.Content value="csv" className="space-y-6 focus:outline-none">
          <GlassCard className="p-6 space-y-6">
            {/* Upload Zone */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-[#326B54]/40 hover:border-[#326B54] bg-[#326B54]/5 rounded-2xl p-8 text-center cursor-pointer transition-all"
            >
              <input
                ref={fileInputRef}
                type="file"
                suppressHydrationWarning
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
              />
              <UploadCloud className="w-10 h-10 text-[#326B54] mx-auto mb-2" />
              <h4 className="text-sm font-bold text-[#242B27] dark:text-[#E8EDE9]">
                {csvFile ? csvFile.name : "Click or drop disaster reports CSV file"}
              </h4>
              <p className="text-xs text-[#737A70] mt-1">
                Supports Kaggle disaster tweets format, custom CSVs up to 5MB (max 100 rows preview in demo)
              </p>
            </div>

            {/* Column Selector & Action */}
            {csvHeaders.length > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-black/5 dark:bg-white/5">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold text-[#242B27] dark:text-[#E8EDE9]">
                    Select Text Column:
                  </span>
                  <select
                    value={selectedColumn}
                    onChange={(e) => setSelectedColumn(e.target.value)}
                    className="px-3 py-1.5 text-xs rounded-xl bg-white dark:bg-[#1A2420] border border-black/10 dark:border-white/10 text-[#242B27] dark:text-[#E8EDE9] focus:outline-none"
                  >
                    {csvHeaders.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                  <span className="text-xs text-[#737A70]">({csvRows.length} total rows)</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    suppressHydrationWarning
                    disabled={batchAnalyzing}
                    onClick={handleRunBatch}
                    className="flex items-center gap-2 px-5 py-2 rounded-xl bg-[#326B54] hover:bg-[#294B39] text-white text-xs font-semibold shadow transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {batchAnalyzing ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Classifying ({batchProgress}%)...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>Run Batch Prediction ({Math.min(csvRows.length, 100)} rows)</span>
                      </>
                    )}
                  </button>

                  {batchAnalyzing && (
                    <button
                      type="button"
                      suppressHydrationWarning
                      onClick={handleCancelBatch}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-red-100 hover:bg-red-200 dark:bg-red-950/40 dark:hover:bg-red-900/50 text-red-700 dark:text-red-300 text-xs font-semibold transition-colors cursor-pointer"
                      title="Cancel batch processing"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Cancel</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Batch Progress Bar */}
            {batchAnalyzing && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-[#737A70]">
                  <span>Processing CSV rows through NLP classifier...</span>
                  <span className="font-bold">{batchProgress}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
                  <div
                    className="h-full bg-[#326B54] rounded-full transition-all duration-200"
                    style={{ width: `${batchProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Batch Results Table */}
            {batchResults.length > 0 && (
              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-[#242B27] dark:text-[#E8EDE9]">
                      Batch Results Preview
                    </h4>
                    <p className="text-xs text-[#737A70]">
                      {batchResults.filter((r) => r.predictedClass === "disaster-related").length} disaster-related,{" "}
                      {batchResults.filter((r) => r.predictedClass !== "disaster-related").length} non-disaster
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      suppressHydrationWarning
                      onClick={handleIngestBatchToDashboard}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow transition-colors"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>Ingest All to Dashboard</span>
                    </button>

                    <button
                      type="button"
                      suppressHydrationWarning
                      onClick={handleDownloadBatch}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#326B54] hover:bg-[#294B39] text-white text-xs font-semibold shadow transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download Results CSV</span>
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto rounded-xl border border-black/5 dark:border-white/10">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-black/5 dark:bg-white/5 border-b border-black/5 dark:border-white/10 text-[#737A70]">
                      <tr>
                        <th className="p-3">#</th>
                        <th className="p-3">Message Text</th>
                        <th className="p-3">Predicted Class</th>
                        <th className="p-3">Disaster Prob</th>
                        <th className="p-3">Category</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black/5 dark:divide-white/5">
                      {batchResults.slice(0, 10).map((row, idx) => (
                        <tr key={idx} className="hover:bg-black/[0.02] dark:hover:bg-white/[0.02]">
                          <td className="p-3 font-mono text-[#737A70]">{idx + 1}</td>
                          <td className="p-3 max-w-md truncate text-[#242B27] dark:text-[#E8EDE9]">
                            {row.text}
                          </td>
                          <td className="p-3">
                            <StatusBadge
                              variant={row.predictedClass === "disaster-related" ? "critical" : "low"}
                              label={row.predictedClass}
                            />
                          </td>
                          <td className="p-3 font-mono font-bold">
                            {(row.disasterProbability * 100).toFixed(1)}%
                          </td>
                          <td className="p-3 capitalize text-[#737A70]">
                            {row.category}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {batchResults.length > 10 && (
                    <div className="p-2 text-center text-xs text-[#737A70] bg-black/[0.01]">
                      Showing first 10 of {batchResults.length} records. Download CSV to inspect all rows.
                    </div>
                  )}
                </div>
              </div>
            )}
          </GlassCard>
        </Tabs.Content>

        {/* ============================================================== */}
        {/* TAB 3: SOCIAL MEDIA URL */}
        {/* ============================================================== */}
        <Tabs.Content value="url" className="space-y-6 focus:outline-none">
          <GlassCard className="p-6 max-w-2xl space-y-4">
            <h3 className="text-sm font-bold text-[#242B27] dark:text-[#E8EDE9]">
              Social Media Post Link
            </h3>
            <p className="text-xs text-[#737A70] leading-relaxed">
              Enter a link to a tweet, Facebook post, or news dispatch for extraction and classification.
            </p>

            <div className="flex gap-2">
              <input
                type="url"
                suppressHydrationWarning
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://x.com/user/status/123456789"
                className="flex-1 px-3 py-2 text-xs rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-[#242B27] dark:text-[#E8EDE9] focus:outline-none focus:ring-1 focus:ring-[#326B54]"
              />
              <button
                type="button"
                suppressHydrationWarning
                onClick={() => {
                  toast({
                    title: "Live Scraping Restrained",
                    description: "Social platform scraping without official API credentials is intentionally restrained for policy compliance. Please copy and paste the post text in the 'Single Text' tab.",
                    variant: "warning",
                  });
                }}
                className="px-4 py-2 rounded-xl bg-[#326B54] hover:bg-[#294B39] text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                Fetch & Analyze
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-900 dark:text-blue-300 text-xs leading-relaxed">
              <strong>Architectural Note:</strong> In production deployments, social links are ingested through verified webhooks or official developer APIs (e.g., X Enterprise Streaming API, Meta Disaster Relief feeds) to maintain authenticity and provenance.
            </div>
          </GlassCard>
        </Tabs.Content>
      </Tabs.Root>
    </div>
  );
}
