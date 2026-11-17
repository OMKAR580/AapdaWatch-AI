"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from "react";
import type {
  Incident,
  DisasterReport,
  NotificationItem,
  CorrelationSuggestion,
  VerificationStatus,
  IncidentStatus,
} from "@/types";
import { apiClient } from "@/services/api.client";
import { liveFeedSocket } from "@/services/websocket.service";

interface AppState {
  incidents: Incident[];
  reports: DisasterReport[];
  notifications: NotificationItem[];
  correlationSuggestions: CorrelationSuggestion[];
  isDarkMode: boolean;
  searchQuery: string;
  isLoading: boolean;
  error: string | null;
}

export interface AppContextValue extends AppState {
  toggleDarkMode: () => void;
  setSearchQuery: (q: string) => void;
  updateReportVerification: (
    reportId: string,
    status: VerificationStatus,
    notes?: string,
  ) => Promise<void>;
  updateIncidentStatus: (
    incidentId: string,
    status: IncidentStatus,
  ) => Promise<void>;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  acceptCorrelation: (reportId: string) => Promise<void>;
  rejectCorrelation: (reportId: string) => Promise<void>;
  addReport: (report: DisasterReport) => void;
  addReportsBatch: (reports: DisasterReport[]) => void;
  createIncident: (data: {
    title: string;
    description: string;
    category: string;
    severity: string;
    locationName: string;
    latitude?: number;
    longitude?: number;
  }) => Promise<Incident>;
  refreshData: () => Promise<void>;
  clearAllData: () => void;
  unreadNotificationCount: number;
  isLiveConnected: boolean;
}

const defaultContextValue: AppContextValue = {
  incidents: [],
  reports: [],
  notifications: [],
  correlationSuggestions: [],
  isDarkMode: false,
  searchQuery: "",
  isLoading: false,
  error: null,
  isLiveConnected: false,
  toggleDarkMode: () => {},
  setSearchQuery: () => {},
  updateReportVerification: async () => {},
  updateIncidentStatus: async () => {},
  markNotificationRead: () => {},
  markAllNotificationsRead: () => {},
  acceptCorrelation: async () => {},
  rejectCorrelation: async () => {},
  addReport: () => {},
  addReportsBatch: () => {},
  createIncident: async () => ({} as Incident),
  refreshData: async () => {},
  clearAllData: () => {},
  unreadNotificationCount: 0,
};

const AppContext = createContext<AppContextValue>(defaultContextValue);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [reports, setReports] = useState<DisasterReport[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [correlationSuggestions, setCorrelationSuggestions] = useState<CorrelationSuggestion[]>([]);

  const [isDarkMode, setIsDarkMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLiveConnected, setIsLiveConnected] = useState(false);

  // Safely hydrate persisted local storage state on client mount (prevents SSR hydration mismatch)
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const savedIncidents = localStorage.getItem("aapdawatch_v2_incidents");
        if (savedIncidents) {
          const parsed = JSON.parse(savedIncidents);
          if (Array.isArray(parsed) && parsed.length > 0) setIncidents(parsed);
        }
        const savedReports = localStorage.getItem("aapdawatch_v2_reports");
        if (savedReports) {
          const parsed = JSON.parse(savedReports);
          if (Array.isArray(parsed) && parsed.length > 0) setReports(parsed);
        }
        const savedNotifs = localStorage.getItem("aapdawatch_v2_notifications");
        if (savedNotifs) {
          const parsed = JSON.parse(savedNotifs);
          if (Array.isArray(parsed) && parsed.length > 0) setNotifications(parsed);
        }
        const savedCorr = localStorage.getItem("aapdawatch_v2_correlations");
        if (savedCorr) {
          const parsed = JSON.parse(savedCorr);
          if (Array.isArray(parsed) && parsed.length > 0) setCorrelationSuggestions(parsed);
        }
      } catch {
        // Local storage read error
      }
    }, 0);

    return () => clearTimeout(timer);
  }, []);

  // Subscribe to live WebSocket feed
  useEffect(() => {
    const unsubscribe = liveFeedSocket.subscribe((event: Record<string, unknown>) => {
      setIsLiveConnected(true);
      const data = event?.data as Record<string, unknown> | undefined;
      if (event?.type === "NEW_PREDICTION" && data) {
        const newNotif: NotificationItem = {
          id: `notif-ws-${Date.now()}`,
          title: `Live ${data.prediction || "Prediction"}`,
          message: `${data.model || "ML Engine"} classified: "${String(data.text || "").slice(0, 45)}..." (${Math.round(Number(data.probability || 0.5) * 100)}%)`,
          type: data.prediction === "DISASTER_RELATED" ? "critical" : "info",
          read: false,
          timestamp: new Date().toISOString(),
        };
        setNotifications((prev) => [newNotif, ...prev]);
      }
    });

    return () => unsubscribe();
  }, []);

  /**
   * Fetch all core state from live PostgreSQL database if running.
   */
  const refreshData = useCallback(async () => {
    try {
      setError(null);

      const [incidentsRes, reportsRes, candidatesRes] = await Promise.all([
        apiClient.incidents.list({ limit: 100 }),
        apiClient.reports.list({ limit: 100 }),
        apiClient.correlation.candidates(),
      ]);

      if (incidentsRes.items && incidentsRes.items.length > 0) {
        setIncidents(incidentsRes.items);
        if (typeof window !== "undefined") {
          localStorage.setItem("aapdawatch_v2_incidents", JSON.stringify(incidentsRes.items));
        }
      }
      if (reportsRes.items && reportsRes.items.length > 0) {
        setReports(reportsRes.items);
        if (typeof window !== "undefined") {
          localStorage.setItem("aapdawatch_v2_reports", JSON.stringify(reportsRes.items));
        }
      }
      if (candidatesRes && candidatesRes.length > 0) {
        setCorrelationSuggestions(candidatesRes);
      }
    } catch {
      // Backend is offline; maintain local dynamic state seamlessly
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial backend sync check on mount
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [incidentsRes, reportsRes, candidatesRes] = await Promise.all([
          apiClient.incidents.list({ limit: 100 }),
          apiClient.reports.list({ limit: 100 }),
          apiClient.correlation.candidates(),
        ]);
        if (mounted) {
          if (incidentsRes.items && incidentsRes.items.length > 0) {
            setIncidents(incidentsRes.items);
          }
          if (reportsRes.items && reportsRes.items.length > 0) {
            setReports(reportsRes.items);
          }
          if (candidatesRes && candidatesRes.length > 0) {
            setCorrelationSuggestions(candidatesRes);
          }
          setIsLoading(false);
        }
      } catch {
        if (mounted) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const toggleDarkMode = useCallback(() => {
    setIsDarkMode((prev) => {
      const next = !prev;
      if (typeof document !== "undefined") {
        if (next) {
          document.documentElement.classList.add("dark");
        } else {
          document.documentElement.classList.remove("dark");
        }
      }
      return next;
    });
  }, []);

  const updateReportVerification = useCallback(
    async (reportId: string, status: VerificationStatus, notes?: string) => {
      // 1. Optimistically update local state immediately
      setReports((prev) => {
        const updated = prev.map((r) =>
          r.id === reportId
            ? {
                ...r,
                verificationStatus: status,
                reviewerNotes: notes ?? r.reviewerNotes,
                reviewedBy: "Human Reviewer",
                reviewedAt: new Date().toISOString(),
              }
            : r,
        );
        if (typeof window !== "undefined") {
          try {
            localStorage.setItem("aapdawatch_v2_reports", JSON.stringify(updated));
          } catch {}
        }
        return updated;
      });

      // 2. Also update associated incident if verified
      if (status === "verified") {
        setIncidents((prev) => {
          const updated = prev.map((inc) => {
            return { ...inc, verificationStatus: "verified" as VerificationStatus };
          });
          if (typeof window !== "undefined") {
            try {
              localStorage.setItem("aapdawatch_v2_incidents", JSON.stringify(updated));
            } catch {}
          }
          return updated;
        });
      }

      // 3. Attempt backend sync in background
      let decision: "UNDER_REVIEW" | "VERIFIED_DISASTER" | "FALSE_POSITIVE" | "DUPLICATE" =
        "UNDER_REVIEW";
      if (status === "verified") decision = "VERIFIED_DISASTER";
      else if (status === "false-positive") decision = "FALSE_POSITIVE";
      else if (status === "duplicate") decision = "DUPLICATE";

      try {
        await apiClient.verification.submit(reportId, { decision, notes });
      } catch {
        // Local state was already updated
      }
    },
    [],
  );

  const updateIncidentStatus = useCallback(
    async (incidentId: string, status: IncidentStatus) => {
      // 1. Optimistic update
      setIncidents((prev) => {
        const updated = prev.map((inc) =>
          inc.id === incidentId
            ? { ...inc, status, updatedAt: new Date().toISOString() }
            : inc,
        );
        if (typeof window !== "undefined") {
          try {
            localStorage.setItem("aapdawatch_v2_incidents", JSON.stringify(updated));
          } catch {}
        }
        return updated;
      });

      // 2. Background backend sync
      try {
        await apiClient.incidents.updateStatus(incidentId, status);
      } catch {
        // Local state already updated
      }
    },
    [],
  );

  const markNotificationRead = useCallback((id: string) => {
    setNotifications((prev) => {
      const updated = prev.map((n) => (n.id === id ? { ...n, read: true } : n));
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("aapdawatch_v2_notifications", JSON.stringify(updated));
        } catch {}
      }
      return updated;
    });
  }, []);

  const markAllNotificationsRead = useCallback(() => {
    setNotifications((prev) => {
      const updated = prev.map((n) => ({ ...n, read: true }));
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("aapdawatch_v2_notifications", JSON.stringify(updated));
        } catch {}
      }
      return updated;
    });
  }, []);

  const acceptCorrelation = useCallback(
    async (reportId: string) => {
      setCorrelationSuggestions((prev) => prev.filter((c) => c.reportId !== reportId));
      try {
        await apiClient.correlation.accept(reportId);
      } catch {}
    },
    [],
  );

  const rejectCorrelation = useCallback(
    async (reportId: string) => {
      setCorrelationSuggestions((prev) => prev.filter((c) => c.reportId !== reportId));
      try {
        await apiClient.correlation.reject(reportId);
      } catch {}
    },
    [],
  );

  /**
   * Adds a single prediction report and immediately triggers cross-page
   * dynamic updates: Incidents, Live Map, KPI counts, Activity Feed, and Notifications!
   */
  const addReport = useCallback((report: DisasterReport) => {
    // 1. Ingest report
    setReports((prevReports) => {
      const nextReports = [report, ...prevReports];
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("aapdawatch_v2_reports", JSON.stringify(nextReports));
        } catch {}
      }
      return nextReports;
    });

    // Broadcast across WebSocket stream
    liveFeedSocket.broadcast({ type: "USER_REPORT_INGESTED", report });

    // 2. If disaster-related, automatically correlate or create Incident
    if (report.predictedClass === "disaster-related") {
      const loc = report.location || {};
      const lat = typeof loc.latitude === "number" ? loc.latitude : 28.6139;
      const lng = typeof loc.longitude === "number" ? loc.longitude : 77.2090;
      const name = loc.name || "Central India / Field Report";
      const state = loc.state;
      const conf = report.confidence ?? 0.85;
      const prob = report.disasterProbability ?? 0.85;

      setIncidents((prevIncidents) => {
        const locName = name.toLowerCase().split(",")[0].trim();
        const existingIdx = prevIncidents.findIndex((inc) => {
          const incLoc = (inc.location?.name || "").toLowerCase().split(",")[0].trim();
          const sameLoc = locName && incLoc && (locName.includes(incLoc) || incLoc.includes(locName));
          const sameCat = inc.category === report.category;
          return (
            sameLoc ||
            (sameCat &&
              Math.abs(inc.location.latitude - lat) < 0.6 &&
              Math.abs(inc.location.longitude - lng) < 0.6)
          );
        });

        let nextIncidents: Incident[];
        if (existingIdx >= 0) {
          // Increment report count on existing correlated incident
          const existing = prevIncidents[existingIdx];
          const updated: Incident = {
            ...existing,
            reportCount: (existing.reportCount || 1) + 1,
            updatedAt: new Date().toISOString(),
          };
          nextIncidents = [
            updated,
            ...prevIncidents.slice(0, existingIdx),
            ...prevIncidents.slice(existingIdx + 1),
          ];

          // Add correlation suggestion
          setCorrelationSuggestions((prev) => [
            {
              reportId: report.id,
              suggestedIncidentId: existing.id,
              matchScore: Math.min(0.98, conf + 0.04),
              reasons: ["Location Proximity Match", "Temporal Clustering", "Category Alignment"],
              status: "pending",
            },
            ...prev,
          ]);
        } else {
          // Create new Incident dossier
          const codeNum = Math.floor(100 + Math.random() * 900);
          const catTitle = report.category
            ? report.category.charAt(0).toUpperCase() + report.category.slice(1)
            : "Disaster";
          const newInc: Incident = {
            id: `INC-${codeNum}`,
            incidentCode: `INC-${codeNum}`,
            title: `${catTitle} Alert — ${name}`,
            category: report.category || "other",
            severity:
              prob > 0.85
                ? "critical"
                : prob > 0.65
                  ? "high"
                  : "medium",
            location: {
              name,
              latitude: lat,
              longitude: lng,
              state,
            },
            secondaryLocations: report.secondaryLocations,
            reportCount: 1,
            status: "under-review",
            verificationStatus: "unreviewed",
            description: report.text,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            tags: [report.category || "disaster", "live-prediction", "field-report"],
          };

          // Generate companion incidents for any correlated intercontinental hubs (e.g. New York, Los Angeles)
          const companionIncidents: Incident[] = [];
          if (report.secondaryLocations && report.secondaryLocations.length > 0) {
            report.secondaryLocations.forEach((secLoc) => {
              const compCode = Math.floor(100 + Math.random() * 900);
              companionIncidents.push({
                id: `INC-${compCode}`,
                incidentCode: `INC-${compCode}`,
                title: `${catTitle} Alert — ${secLoc.name}`,
                category: report.category || "other",
                severity:
                  prob > 0.85
                    ? "critical"
                    : prob > 0.65
                      ? "high"
                      : "medium",
                location: {
                  name: secLoc.name,
                  latitude: secLoc.latitude,
                  longitude: secLoc.longitude,
                  state: secLoc.state,
                },
                secondaryLocations: [{
                  name,
                  latitude: lat,
                  longitude: lng,
                  state,
                }],
                reportCount: 1,
                status: "under-review",
                verificationStatus: "unreviewed",
                description: `Correlated intercontinental event: ${report.text}`,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                tags: [report.category || "disaster", "cross-border-correlation"],
              });
            });
          }

          nextIncidents = [newInc, ...companionIncidents, ...prevIncidents];
        }

        if (typeof window !== "undefined") {
          try {
            localStorage.setItem("aapdawatch_v2_incidents", JSON.stringify(nextIncidents));
          } catch {}
        }
        return nextIncidents;
      });

      // Notification
      setNotifications((prev) => {
        const next: NotificationItem[] = [
          {
            id: `notif-${Date.now()}`,
            type: prob > 0.85 ? "critical" : "warning",
            title: `Disaster Alert: ${name}`,
            message: `Classified as ${report.category || "disaster"} with ${(conf * 100).toFixed(0)}% confidence. Live dossier created.`,
            timestamp: new Date().toISOString(),
            read: false,
          },
          ...prev,
        ];
        if (typeof window !== "undefined") {
          try {
            localStorage.setItem("aapdawatch_v2_notifications", JSON.stringify(next));
          } catch {}
        }
        return next;
      });
    } else {
      // Notification for non-disaster
      const conf = report.confidence ?? 0.95;
      setNotifications((prev) => {
        const next: NotificationItem[] = [
          {
            id: `notif-${Date.now()}`,
            type: "info",
            title: "Signal Ingested (Non-Disaster)",
            message: `Message evaluated non-critical with ${(conf * 100).toFixed(0)}% confidence.`,
            timestamp: new Date().toISOString(),
            read: false,
          },
          ...prev,
        ];
        if (typeof window !== "undefined") {
          try {
            localStorage.setItem("aapdawatch_v2_notifications", JSON.stringify(next));
          } catch {}
        }
        return next;
      });
    }
  }, []);

  /**
   * Batch ingest for CSV / multiple predictions at once
   */
  const addReportsBatch = useCallback((reportsList: DisasterReport[]) => {
    reportsList.forEach((r) => addReport(r));
  }, [addReport]);

  const createIncident = useCallback(
    async (data: {
      title: string;
      description: string;
      category: string;
      severity: string;
      locationName: string;
      latitude?: number;
      longitude?: number;
    }) => {
      const codeNum = Math.floor(100 + Math.random() * 900);
      const newInc: Incident = {
        id: `INC-${codeNum}`,
        incidentCode: `INC-${codeNum}`,
        title: data.title,
        description: data.description,
        category: data.category as Incident["category"],
        severity: data.severity as Incident["severity"],
        location: {
          name: data.locationName,
          latitude: data.latitude ?? 28.6139,
          longitude: data.longitude ?? 77.209,
        },
        reportCount: 0,
        status: "under-review",
        verificationStatus: "unreviewed",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      setIncidents((prev) => {
        const next = [newInc, ...prev];
        if (typeof window !== "undefined") {
          try {
            localStorage.setItem("aapdawatch_v2_incidents", JSON.stringify(next));
          } catch {}
        }
        return next;
      });

      try {
        await apiClient.incidents.create(data);
      } catch {}

      return newInc;
    },
    [],
  );

  /**
   * Resets all user predictions and returns to a pristine zero-data state
   */
  const clearAllData = useCallback(() => {
    setIncidents([]);
    setReports([]);
    setNotifications([]);
    setCorrelationSuggestions([]);
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem("aapdawatch_v2_incidents");
        localStorage.removeItem("aapdawatch_v2_reports");
        localStorage.removeItem("aapdawatch_v2_notifications");
        localStorage.removeItem("aapdawatch_v2_correlations");
      } catch {}
    }
  }, []);

  const unreadNotificationCount = notifications.filter((n) => !n.read).length;

  return (
    <AppContext.Provider
      value={{
        incidents,
        reports,
        notifications,
        correlationSuggestions,
        isDarkMode,
        searchQuery,
        isLoading,
        error,
        toggleDarkMode,
        setSearchQuery,
        updateReportVerification,
        updateIncidentStatus,
        markNotificationRead,
        markAllNotificationsRead,
        acceptCorrelation,
        rejectCorrelation,
        addReport,
        addReportsBatch,
        createIncident,
        refreshData,
        clearAllData,
        unreadNotificationCount,
        isLiveConnected,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppContextValue {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
}
