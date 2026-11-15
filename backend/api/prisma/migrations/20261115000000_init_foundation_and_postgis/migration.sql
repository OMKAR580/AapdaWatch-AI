-- AapdaWatch AI Initial Database Migration
-- Phase 2.0: Core Foundation, Enums, Entities, Relations, PostGIS and Spatial Triggers

-- 1. Enable PostGIS Extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- 2. Create Enums
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'ANALYST', 'REVIEWER', 'VIEWER');
CREATE TYPE "AccountStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'INACTIVE');
CREATE TYPE "ReportSourceType" AS ENUM ('SOCIAL_MEDIA', 'FIELD_DISPATCH', 'CITIZEN_REPORT', 'NEWS_FEED', 'EMERGENCY_RADIO', 'OTHER');
CREATE TYPE "DisasterCategory" AS ENUM ('FLOOD', 'EARTHQUAKE', 'FIRE', 'CYCLONE', 'LANDSLIDE', 'OTHER');
CREATE TYPE "IncidentSeverity" AS ENUM ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW');
CREATE TYPE "OperationalStatus" AS ENUM ('OPEN', 'MONITORING', 'CONTAINED', 'RESOLVED', 'CLOSED');
CREATE TYPE "PredictedLabel" AS ENUM ('DISASTER_RELATED', 'NOT_DISASTER_RELATED', 'INCONCLUSIVE');
CREATE TYPE "InferenceStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED');
CREATE TYPE "RelationshipType" AS ENUM ('PRIMARY_SIGNAL', 'CORROBORATING_EVIDENCE', 'UPDATED_STATUS', 'CASUALTY_REPORT');
CREATE TYPE "ReviewDecision" AS ENUM ('UNDER_REVIEW', 'VERIFIED_DISASTER', 'FALSE_POSITIVE', 'DUPLICATE');
CREATE TYPE "CorrelationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'EXPIRED');
CREATE TYPE "AuditAction" AS ENUM (
  'REPORT_CREATED',
  'REPORT_UPDATED',
  'ANALYSIS_RECORDED',
  'REVIEW_SUBMITTED',
  'INCIDENT_CREATED',
  'INCIDENT_UPDATED',
  'CORRELATION_ACCEPTED',
  'CORRELATION_REJECTED',
  'BATCH_JOB_SUBMITTED',
  'SYSTEM_CONFIG_CHANGED'
);
CREATE TYPE "BatchJobType" AS ENUM ('CSV_REPORT_INGESTION', 'BULK_ANALYSIS', 'HISTORICAL_IMPORT');
CREATE TYPE "BatchJobStatus" AS ENUM ('QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- 3. Create Tables

CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'ANALYST',
    "accountStatus" "AccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DisasterReport" (
    "id" UUID NOT NULL,
    "externalId" TEXT,
    "originalText" TEXT NOT NULL,
    "normalizedText" TEXT,
    "sourceType" "ReportSourceType" NOT NULL DEFAULT 'SOCIAL_MEDIA',
    "sourceName" TEXT,
    "sourceUrl" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL,
    "ingestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "locationName" TEXT,
    "language" TEXT DEFAULT 'en',
    "locationGeom" geometry(Point, 4326),
    "createdById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DisasterReport_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Analysis" (
    "id" UUID NOT NULL,
    "reportId" UUID NOT NULL,
    "predictedLabel" "PredictedLabel" NOT NULL,
    "probability" DOUBLE PRECISION NOT NULL,
    "decisionThreshold" DOUBLE PRECISION NOT NULL DEFAULT 0.35,
    "suggestedCategory" "DisasterCategory",
    "modelName" TEXT NOT NULL DEFAULT 'AapdaWatch-BiLSTM',
    "modelVersion" TEXT NOT NULL DEFAULT '1.0.0',
    "preprocessingVersion" TEXT NOT NULL DEFAULT '1.0.0',
    "inferenceStatus" "InferenceStatus" NOT NULL DEFAULT 'COMPLETED',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Analysis_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Incident" (
    "id" UUID NOT NULL,
    "incidentCode" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" "DisasterCategory" NOT NULL,
    "severity" "IncidentSeverity" NOT NULL,
    "operationalStatus" "OperationalStatus" NOT NULL DEFAULT 'OPEN',
    "locationName" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "locationGeom" geometry(Point, 4326),
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "createdById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Incident_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "IncidentReport" (
    "id" UUID NOT NULL,
    "incidentId" UUID NOT NULL,
    "reportId" UUID NOT NULL,
    "linkedById" UUID,
    "linkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "relationshipType" "RelationshipType" NOT NULL DEFAULT 'CORROBORATING_EVIDENCE',

    CONSTRAINT "IncidentReport_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "IncidentReview" (
    "id" UUID NOT NULL,
    "reportId" UUID NOT NULL,
    "incidentId" UUID,
    "reviewerId" UUID NOT NULL,
    "decision" "ReviewDecision" NOT NULL,
    "notes" TEXT,
    "reviewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IncidentReview_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CorrelationCandidate" (
    "id" UUID NOT NULL,
    "reportId" UUID NOT NULL,
    "targetIncidentId" UUID NOT NULL,
    "correlationScore" DOUBLE PRECISION NOT NULL,
    "reasoning" JSONB,
    "status" "CorrelationStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedById" UUID,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CorrelationCandidate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AuditLog" (
    "id" UUID NOT NULL,
    "actorId" UUID,
    "action" "AuditAction" NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BatchJob" (
    "id" UUID NOT NULL,
    "submittedById" UUID,
    "jobType" "BatchJobType" NOT NULL,
    "status" "BatchJobStatus" NOT NULL DEFAULT 'QUEUED',
    "totalRecords" INTEGER NOT NULL DEFAULT 0,
    "processedRecords" INTEGER NOT NULL DEFAULT 0,
    "failedRecords" INTEGER NOT NULL DEFAULT 0,
    "errorSummary" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "BatchJob_pkey" PRIMARY KEY ("id")
);

-- 4. Unique Constraints & Indexes

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE INDEX "User_email_idx" ON "User"("email");
CREATE INDEX "User_role_idx" ON "User"("role");

CREATE UNIQUE INDEX "DisasterReport_externalId_key" ON "DisasterReport"("externalId");
CREATE INDEX "DisasterReport_ingestedAt_idx" ON "DisasterReport"("ingestedAt");
CREATE INDEX "DisasterReport_sourceType_idx" ON "DisasterReport"("sourceType");
CREATE INDEX "DisasterReport_submittedAt_idx" ON "DisasterReport"("submittedAt");
CREATE INDEX "DisasterReport_latitude_longitude_idx" ON "DisasterReport"("latitude", "longitude");
CREATE INDEX "DisasterReport_locationName_idx" ON "DisasterReport"("locationName");

CREATE INDEX "Analysis_reportId_idx" ON "Analysis"("reportId");
CREATE INDEX "Analysis_predictedLabel_idx" ON "Analysis"("predictedLabel");
CREATE INDEX "Analysis_createdAt_idx" ON "Analysis"("createdAt");
CREATE INDEX "Analysis_modelName_modelVersion_idx" ON "Analysis"("modelName", "modelVersion");

CREATE UNIQUE INDEX "Incident_incidentCode_key" ON "Incident"("incidentCode");
CREATE INDEX "Incident_category_idx" ON "Incident"("category");
CREATE INDEX "Incident_severity_idx" ON "Incident"("severity");
CREATE INDEX "Incident_operationalStatus_idx" ON "Incident"("operationalStatus");
CREATE INDEX "Incident_startedAt_idx" ON "Incident"("startedAt");
CREATE INDEX "Incident_locationName_idx" ON "Incident"("locationName");
CREATE INDEX "Incident_latitude_longitude_idx" ON "Incident"("latitude", "longitude");

CREATE UNIQUE INDEX "IncidentReport_incidentId_reportId_key" ON "IncidentReport"("incidentId", "reportId");
CREATE INDEX "IncidentReport_incidentId_idx" ON "IncidentReport"("incidentId");
CREATE INDEX "IncidentReport_reportId_idx" ON "IncidentReport"("reportId");
CREATE INDEX "IncidentReport_linkedAt_idx" ON "IncidentReport"("linkedAt");

CREATE INDEX "IncidentReview_reportId_idx" ON "IncidentReview"("reportId");
CREATE INDEX "IncidentReview_incidentId_idx" ON "IncidentReview"("incidentId");
CREATE INDEX "IncidentReview_reviewerId_idx" ON "IncidentReview"("reviewerId");
CREATE INDEX "IncidentReview_decision_idx" ON "IncidentReview"("decision");
CREATE INDEX "IncidentReview_reviewedAt_idx" ON "IncidentReview"("reviewedAt");

CREATE INDEX "CorrelationCandidate_reportId_idx" ON "CorrelationCandidate"("reportId");
CREATE INDEX "CorrelationCandidate_targetIncidentId_idx" ON "CorrelationCandidate"("targetIncidentId");
CREATE INDEX "CorrelationCandidate_status_idx" ON "CorrelationCandidate"("status");
CREATE INDEX "CorrelationCandidate_correlationScore_idx" ON "CorrelationCandidate"("correlationScore");

-- Partial Unique Index: ensures at most ONE active PENDING suggestion exists per (report, target incident) pair
CREATE UNIQUE INDEX "unique_pending_correlation_candidate" ON "CorrelationCandidate"("reportId", "targetIncidentId") WHERE "status" = 'PENDING';

CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");
CREATE INDEX "AuditLog_actorId_idx" ON "AuditLog"("actorId");
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

CREATE INDEX "BatchJob_status_idx" ON "BatchJob"("status");
CREATE INDEX "BatchJob_jobType_idx" ON "BatchJob"("jobType");
CREATE INDEX "BatchJob_submittedById_idx" ON "BatchJob"("submittedById");
CREATE INDEX "BatchJob_createdAt_idx" ON "BatchJob"("createdAt");

-- 5. Foreign Key Constraints

ALTER TABLE "DisasterReport" ADD CONSTRAINT "DisasterReport_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Analysis" ADD CONSTRAINT "Analysis_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "DisasterReport"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "IncidentReport" ADD CONSTRAINT "IncidentReport_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "Incident"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "IncidentReport" ADD CONSTRAINT "IncidentReport_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "DisasterReport"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "IncidentReport" ADD CONSTRAINT "IncidentReport_linkedById_fkey" FOREIGN KEY ("linkedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "IncidentReview" ADD CONSTRAINT "IncidentReview_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "DisasterReport"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "IncidentReview" ADD CONSTRAINT "IncidentReview_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "Incident"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "IncidentReview" ADD CONSTRAINT "IncidentReview_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CorrelationCandidate" ADD CONSTRAINT "CorrelationCandidate_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "DisasterReport"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CorrelationCandidate" ADD CONSTRAINT "CorrelationCandidate_targetIncidentId_fkey" FOREIGN KEY ("targetIncidentId") REFERENCES "Incident"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CorrelationCandidate" ADD CONSTRAINT "CorrelationCandidate_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BatchJob" ADD CONSTRAINT "BatchJob_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 6. Spatial GiST Indexes
-- Standard Geometry GiST
CREATE INDEX IF NOT EXISTS "idx_disaster_report_location_geom" ON "DisasterReport" USING GIST ("locationGeom");
CREATE INDEX IF NOT EXISTS "idx_incident_location_geom" ON "Incident" USING GIST ("locationGeom");

-- Functional Geodesic Geography GiST (Enables meter-based ST_DWithin / ST_Distance acceleration)
CREATE INDEX IF NOT EXISTS "idx_disaster_report_geography" ON "DisasterReport" USING GIST ((("locationGeom")::geography));
CREATE INDEX IF NOT EXISTS "idx_incident_geography" ON "Incident" USING GIST ((("locationGeom")::geography));

-- 7. PostGIS Automated Coordinate Synchronization Trigger Function
-- Ensures ST_MakePoint receives longitude (X) first and latitude (Y) second
CREATE OR REPLACE FUNCTION sync_location_geom()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
    NEW."locationGeom" := ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326);
  ELSE
    NEW."locationGeom" := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_disaster_report_geom ON "DisasterReport";
CREATE TRIGGER trg_sync_disaster_report_geom
BEFORE INSERT OR UPDATE OF latitude, longitude ON "DisasterReport"
FOR EACH ROW EXECUTE FUNCTION sync_location_geom();

DROP TRIGGER IF EXISTS trg_sync_incident_geom ON "Incident";
CREATE TRIGGER trg_sync_incident_geom
BEFORE INSERT OR UPDATE OF latitude, longitude ON "Incident"
FOR EACH ROW EXECUTE FUNCTION sync_location_geom();

-- 8. Business & Geographic Range Check Constraints
ALTER TABLE "Analysis" 
  ADD CONSTRAINT "chk_analysis_probability" 
  CHECK ("probability" >= 0.0 AND "probability" <= 1.0);

ALTER TABLE "Analysis" 
  ADD CONSTRAINT "chk_analysis_decision_threshold" 
  CHECK ("decisionThreshold" >= 0.0 AND "decisionThreshold" <= 1.0);

-- Disallows partial coordinates and enforces legitimate WGS84 geographic boundaries
ALTER TABLE "DisasterReport" 
  ADD CONSTRAINT "chk_disaster_report_coordinates" 
  CHECK (
    ("latitude" IS NULL AND "longitude" IS NULL) OR
    ("latitude" IS NOT NULL AND "longitude" IS NOT NULL AND 
     "latitude" >= -90.0 AND "latitude" <= 90.0 AND 
     "longitude" >= -180.0 AND "longitude" <= 180.0)
  );

ALTER TABLE "Incident" 
  ADD CONSTRAINT "chk_incident_coordinates" 
  CHECK (
    ("latitude" IS NULL AND "longitude" IS NULL) OR
    ("latitude" IS NOT NULL AND "longitude" IS NOT NULL AND 
     "latitude" >= -90.0 AND "latitude" <= 90.0 AND 
     "longitude" >= -180.0 AND "longitude" <= 180.0)
  );

-- 9. Immutability Protections for Audit & Review History
CREATE OR REPLACE FUNCTION prevent_modification_or_deletion()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Immutable record violation: % records cannot be updated or deleted.', TG_TABLE_NAME;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_protect_audit_log ON "AuditLog";
CREATE TRIGGER trg_protect_audit_log
BEFORE UPDATE OR DELETE ON "AuditLog"
FOR EACH ROW EXECUTE FUNCTION prevent_modification_or_deletion();

DROP TRIGGER IF EXISTS trg_protect_incident_review ON "IncidentReview";
CREATE TRIGGER trg_protect_incident_review
BEFORE UPDATE OR DELETE ON "IncidentReview"
FOR EACH ROW EXECUTE FUNCTION prevent_modification_or_deletion();
