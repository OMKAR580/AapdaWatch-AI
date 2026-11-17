// Core domain types for AapdaWatch AI

export type DisasterCategory =
  | "flood"
  | "earthquake"
  | "fire"
  | "cyclone"
  | "landslide"
  | "other";

export type Severity = "low" | "medium" | "high" | "critical";

export type IncidentStatus =
  | "unreviewed"
  | "under-review"
  | "verified"
  | "resolved";

export type VerificationStatus =
  | "unreviewed"
  | "under-review"
  | "verified"
  | "false-positive"
  | "duplicate";

export type PredictedClass = "disaster-related" | "not-disaster-related";

export type InputType = "text" | "csv" | "url";

export type AnalysisStatus = "pending" | "processing" | "completed" | "failed";

export interface Location {
  name: string;
  latitude: number;
  longitude: number;
  region?: string;
  state?: string;
}

export interface Incident {
  id: string;
  incidentCode: string;
  title: string;
  category: DisasterCategory;
  severity: Severity;
  location: Location;
  secondaryLocations?: Location[];
  reportCount: number;
  status: IncidentStatus;
  description: string;
  createdAt: string;
  updatedAt: string;
  verificationStatus: VerificationStatus;
  tags?: string[];
}

export interface DisasterReport {
  id: string;
  text: string;
  source: string;
  sourceUrl?: string;
  timestamp: string;
  predictedClass: PredictedClass;
  confidence?: number;
  disasterProbability?: number;
  notDisasterProbability?: number;
  category?: DisasterCategory;
  verificationStatus: VerificationStatus;
  incidentId?: string;
  reviewerNotes?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  location?: Partial<Location>;
  secondaryLocations?: Location[];
  analysisId?: string;
  modelVersion?: string;
}

export interface AnalysisResult {
  id: string;
  inputType: InputType;
  status: AnalysisStatus;
  inputPreview: string;
  predictedClass?: PredictedClass;
  confidence?: number;
  disasterProbability?: number;
  notDisasterProbability?: number;
  suggestedCategory?: DisasterCategory;
  createdAt: string;
  completedAt?: string;
  totalRecords?: number;
  completedRecords?: number;
  failedRecords?: number;
  reportIds?: string[];
  note: string; // Always label demo vs real
}

export interface IncidentReview {
  id: string;
  incidentId: string;
  reviewerId: string;
  reviewerName: string;
  status: VerificationStatus;
  notes: string;
  reviewedAt: string;
}

export interface ActivityItem {
  id: string;
  type:
    | "report_added"
    | "incident_created"
    | "incident_verified"
    | "status_changed"
    | "report_reviewed"
    | "batch_completed";
  title: string;
  description: string;
  timestamp: string;
  incidentId?: string;
  reportId?: string;
  severity?: Severity;
}

export interface ModelInfo {
  name: string;
  version: string;
  type: string;
  dataset: string;
  evaluationStatus: "connected" | "not-connected";
  lastEvaluated?: string;
  metrics?: {
    accuracy?: number;
    precision?: number;
    recall?: number;
    f1Score?: number;
    auc?: number;
  };
}

export interface CorrelationSuggestion {
  reportId: string;
  suggestedIncidentId: string;
  matchScore: number;
  reasons: string[];
  status: "pending" | "accepted" | "rejected";
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: "info" | "warning" | "critical" | "success";
  timestamp: string;
  read: boolean;
  incidentId?: string;
}

export interface ExportOptions {
  type: "incidents" | "reports" | "verification" | "analytics";
  dateRange?: { start: string; end: string };
  category?: DisasterCategory;
  severity?: Severity;
  verificationStatus?: VerificationStatus;
}

