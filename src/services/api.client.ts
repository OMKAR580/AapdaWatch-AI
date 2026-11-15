/**
 * AapdaWatch AI — Centralized REST API Client
 * Connects frontend dashboard with NestJS backend services.
 */

import type {
  Incident,
  DisasterReport,
  CorrelationSuggestion,
  DisasterCategory,
} from "@/types";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001/api/v1";

interface ApiResponse<T> {
  success: boolean;
  data: T;
  timestamp?: string;
  statusCode?: number;
  message?: string;
  error?: string;
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;

  const defaultHeaders: HeadersInit = {
    "Content-Type": "application/json",
  };

  const response = await fetch(url, {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  });

  if (!response.ok) {
    let errorMessage = `HTTP error ${response.status}: ${response.statusText}`;
    try {
      const errJson = await response.json();
      errorMessage = errJson.message || errJson.error || errorMessage;
    } catch {
      // Body is not JSON
    }
    throw new Error(errorMessage);
  }

  // Handle empty or plain text responses (e.g. CSV downloads)
  const contentType = response.headers.get("content-type");
  if (contentType && contentType.includes("text/csv")) {
    return (await response.text()) as unknown as T;
  }

  const json: ApiResponse<T> = await response.json();
  return json.data !== undefined ? json.data : (json as unknown as T);
}

export const apiClient = {
  // ----------------------------------------------------
  // Health
  // ----------------------------------------------------
  health: {
    check: () => request<{ status: string; database: { status: string } }>("/health"),
  },

  // ----------------------------------------------------
  // Reports
  // ----------------------------------------------------
  reports: {
    list: (params?: {
      page?: number;
      limit?: number;
      search?: string;
      category?: string;
      status?: string;
    }) => {
      const sp = new URLSearchParams();
      if (params?.page) sp.set("page", String(params.page));
      if (params?.limit) sp.set("limit", String(params.limit));
      if (params?.search) sp.set("search", params.search);
      if (params?.category && params.category !== "all") sp.set("category", params.category.toUpperCase());
      if (params?.status && params.status !== "all") sp.set("status", params.status);
      const query = sp.toString() ? `?${sp.toString()}` : "";
      return request<{ items: DisasterReport[]; total: number; page: number; totalPages: number }>(
        `/reports${query}`,
      );
    },
    get: (id: string) => request<DisasterReport>(`/reports/${id}`),
    create: (data: {
      text: string;
      sourceType?: string;
      sourceName?: string;
      sourceUrl?: string;
      locationName?: string;
      latitude?: number;
      longitude?: number;
    }) =>
      request<DisasterReport>("/reports", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (id: string, data: Partial<DisasterReport>) =>
      request<DisasterReport>(`/reports/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    search: (q: string) =>
      request<{ items: DisasterReport[] }>(`/reports/search?q=${encodeURIComponent(q)}`),
    exportCsvUrl: (params?: Record<string, string>) => {
      const sp = new URLSearchParams(params);
      return `${API_BASE_URL}/reports/export/csv?${sp.toString()}`;
    },
  },

  // ----------------------------------------------------
  // Analysis (AapdaWatch BiLSTM Neural Inference)
  // ----------------------------------------------------
  analysis: {
    analyze: (reportId: string) =>
      request<{
        id: string;
        reportId: string;
        predictedClass: "disaster-related" | "not-disaster-related";
        confidence: number;
        disasterProbability: number;
        notDisasterProbability: number;
        suggestedCategory: DisasterCategory | null;
        decisionThreshold: number;
        modelName: string;
        modelVersion: string;
        preprocessingVersion: string;
        inferenceStatus: string;
        inferenceDurationMs?: number;
        preprocessingParity?: string;
        isSynthetic: boolean;
        createdAt: string;
        metadata?: Record<string, unknown>;
        explanation?: string;
        note?: string;
      }>(`/analysis/${reportId}`, { method: "POST" }),
    batch: (items: { text: string; requestId?: string }[]) =>
      request<{
        totalItems: number;
        batchDurationMs: number;
        modelName: string;
        predictions: Array<{
          requestId?: string;
          predictedClass: "disaster-related" | "not-disaster-related";
          probability: number;
          confidence: number;
          decisionThreshold: number;
          modelName: string;
          modelVersion: string;
          suggestedCategory: DisasterCategory | null;
          isSynthetic: boolean;
        }>;
      }>("/analysis/batch", {
        method: "POST",
        body: JSON.stringify({ items }),
      }),
    get: (reportId: string) => request<unknown>(`/analysis/${reportId}`),
    history: (reportId: string) => request<unknown[]>(`/analysis/${reportId}/history`),
    list: (page = 1, limit = 20) => request<unknown>(`/analysis?page=${page}&limit=${limit}`),
  },

  // ----------------------------------------------------
  // Incidents
  // ----------------------------------------------------
  incidents: {
    list: (params?: {
      page?: number;
      limit?: number;
      search?: string;
      category?: string;
      severity?: string;
      status?: string;
    }) => {
      const sp = new URLSearchParams();
      if (params?.page) sp.set("page", String(params.page));
      if (params?.limit) sp.set("limit", String(params.limit));
      if (params?.search) sp.set("search", params.search);
      if (params?.category && params.category !== "all") sp.set("category", params.category.toUpperCase());
      if (params?.severity && params.severity !== "all") sp.set("severity", params.severity.toUpperCase());
      if (params?.status && params.status !== "all") sp.set("status", params.status);
      const query = sp.toString() ? `?${sp.toString()}` : "";
      return request<{ items: Incident[]; total: number; page: number; totalPages: number }>(
        `/incidents${query}`,
      );
    },
    get: (id: string) => request<Incident & { reports: DisasterReport[] }>(`/incidents/${id}`),
    create: (data: {
      title: string;
      description: string;
      category: string;
      severity: string;
      locationName: string;
      latitude?: number;
      longitude?: number;
      operationalStatus?: string;
    }) =>
      request<Incident>("/incidents", {
        method: "POST",
        body: JSON.stringify({
          ...data,
          category: data.category.toUpperCase(),
          severity: data.severity.toUpperCase(),
          operationalStatus: data.operationalStatus?.toUpperCase() || "OPEN",
        }),
      }),
    update: (id: string, data: Partial<Incident>) =>
      request<Incident>(`/incidents/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    updateStatus: (id: string, status: string) => {
      // Map frontend status to backend enum
      let opStatus = "OPEN";
      if (status === "resolved") opStatus = "RESOLVED";
      else if (status === "verified") opStatus = "MONITORING";
      else if (status === "under-review") opStatus = "OPEN";
      else opStatus = status.toUpperCase();

      return request<Incident>(`/incidents/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: opStatus }),
      });
    },
    addReport: (incidentId: string, reportId: string, relationshipType = "CORROBORATING_EVIDENCE") =>
      request<Incident>(`/incidents/${incidentId}/reports`, {
        method: "POST",
        body: JSON.stringify({ reportId, relationshipType }),
      }),
    removeReport: (incidentId: string, reportId: string) =>
      request<{ success: boolean; message: string }>(`/incidents/${incidentId}/reports/${reportId}`, {
        method: "DELETE",
      }),
    exportCsvUrl: (params?: Record<string, string>) => {
      const sp = new URLSearchParams(params);
      return `${API_BASE_URL}/incidents/export/csv?${sp.toString()}`;
    },
  },

  // ----------------------------------------------------
  // Verification
  // ----------------------------------------------------
  verification: {
    list: (status?: string) => {
      const query = status && status !== "all" ? `?status=${status}` : "";
      return request<DisasterReport[]>(`/verification${query}`);
    },
    get: (reportId: string) => request<unknown>(`/verification/${reportId}`),
    submit: (
      reportId: string,
      data: {
        decision: "UNDER_REVIEW" | "VERIFIED_DISASTER" | "FALSE_POSITIVE" | "DUPLICATE";
        notes?: string;
        incidentId?: string;
      },
    ) =>
      request<{ success: boolean; review: unknown }>(`/verification/${reportId}/review`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    history: (reportId: string) => request<unknown[]>(`/verification/${reportId}/history`),
  },

  // ----------------------------------------------------
  // Correlation
  // ----------------------------------------------------
  correlation: {
    candidates: () => request<CorrelationSuggestion[]>("/correlation/candidates"),
    accept: (idOrReportId: string) =>
      request<{ success: boolean; message: string }>(`/correlation/candidates/${idOrReportId}/accept`, {
        method: "POST",
      }),
    reject: (idOrReportId: string) =>
      request<{ success: boolean; message: string }>(`/correlation/candidates/${idOrReportId}/reject`, {
        method: "POST",
      }),
    generate: () =>
      request<{ message: string; count: number }>("/correlation/generate", {
        method: "POST",
      }),
  },

  // ----------------------------------------------------
  // Analytics
  // ----------------------------------------------------
  analytics: {
    overview: () =>
      request<{
        totalReports: number;
        activeIncidents: number;
        criticalIncidents: number;
        totalIncidents: number;
        pendingVerification: number;
        pendingCorrelations: number;
        timestamp: string;
      }>("/analytics/overview"),
    categories: () =>
      request<{
        data: { category: string; label: string; count: number; color: string }[];
        total: number;
      }>("/analytics/categories"),
    severity: () =>
      request<{
        critical: number;
        high: number;
        medium: number;
        low: number;
        total: number;
      }>("/analytics/severity"),
    timeline: (range: "7d" | "30d" | "90d" = "7d") =>
      request<{ date: string; reports: number; incidents: number }[]>(
        `/analytics/timeline?range=${range}`,
      ),
    status: () => request<Record<string, number>>("/analytics/status"),
  },

  // ----------------------------------------------------
  // Map
  // ----------------------------------------------------
  map: {
    incidents: (filters?: { category?: string; severity?: string; status?: string }) => {
      const sp = new URLSearchParams();
      if (filters?.category && filters.category !== "all") sp.set("category", filters.category.toUpperCase());
      if (filters?.severity && filters.severity !== "all") sp.set("severity", filters.severity.toUpperCase());
      if (filters?.status && filters.status !== "all") sp.set("status", filters.status);
      const query = sp.toString() ? `?${sp.toString()}` : "";
      return request<Incident[]>(`/map/incidents${query}`);
    },
  },
};
