/**
 * AapdaWatch AI — Development Database Seeder
 * 
 * Safe, idempotent seed script for local development.
 * Uses deterministic data and upsert semantics to prevent duplicate records on repeated runs.
 * 
 * NEVER execute against production databases.
 */

import {
  PrismaClient,
  UserRole,
  AccountStatus,
  ReportSourceType,
  DisasterCategory,
  IncidentSeverity,
  OperationalStatus,
  PredictedLabel,
  InferenceStatus,
  RelationshipType,
  ReviewDecision,
  CorrelationStatus,
  AuditAction,
} from "@prisma/client";

const prisma = new PrismaClient();

// Placeholder bcrypt hash for development password "DevAdmin@2026!"
// Generated via bcrypt.hashSync("DevAdmin@2026!", 10)
// For local testing ONLY. Never used in staging/production.
const DEV_ADMIN_PASSWORD_HASH = "$2b$10$wE9V8vEaGqfFhRj7O/B57u8cO3Z2b3F3fO8X5m3v9cE7vD1wK9l1m";

async function main() {
  console.log("🌱 Starting AapdaWatch AI development database seed...");

  // 1. Seed System Users with explicitly local, non-governmental domains
  console.log("  → Seeding development operator accounts...");
  const adminUser = await prisma.user.upsert({
    where: { email: "dev-admin@aapdawatch.local" },
    update: {},
    create: {
      name: "Dev Emergency Operations Director (Local Mock)",
      email: "dev-admin@aapdawatch.local",
      passwordHash: DEV_ADMIN_PASSWORD_HASH,
      role: UserRole.ADMIN,
      accountStatus: AccountStatus.ACTIVE,
    },
  });

  const reviewerUser = await prisma.user.upsert({
    where: { email: "dev-reviewer@aapdawatch.local" },
    update: {},
    create: {
      name: "Dev Field Verification Officer (Local Mock)",
      email: "dev-reviewer@aapdawatch.local",
      passwordHash: DEV_ADMIN_PASSWORD_HASH,
      role: UserRole.REVIEWER,
      accountStatus: AccountStatus.ACTIVE,
    },
  });

  const analystUser = await prisma.user.upsert({
    where: { email: "dev-analyst@aapdawatch.local" },
    update: {},
    create: {
      name: "Dev Disaster Data Analyst (Local Mock)",
      email: "dev-analyst@aapdawatch.local",
      passwordHash: DEV_ADMIN_PASSWORD_HASH,
      role: UserRole.ANALYST,
      accountStatus: AccountStatus.ACTIVE,
    },
  });

  // 2. Seed Incidents
  console.log("  → Seeding incident folders...");
  const inc001 = await prisma.incident.upsert({
    where: { incidentCode: "INC-001" },
    update: {},
    create: {
      incidentCode: "INC-001",
      title: "Severe Urban Flooding — Coastal Mumbai (Demo)",
      description: "DEMO INCIDENT: Simulated urban inundation of low-lying suburban wards following 250mm rainfall.",
      category: DisasterCategory.FLOOD,
      severity: IncidentSeverity.CRITICAL,
      operationalStatus: OperationalStatus.OPEN,
      locationName: "Mumbai, Maharashtra",
      latitude: 19.076,
      longitude: 72.8777,
      startedAt: new Date("2026-11-14T14:30:00Z"),
      createdById: adminUser.id,
    },
  });

  const inc002 = await prisma.incident.upsert({
    where: { incidentCode: "INC-002" },
    update: {},
    create: {
      incidentCode: "INC-002",
      title: "Earthquake Swarm — Kutch Fault Zone (Demo)",
      description: "DEMO INCIDENT: Simulated magnitude 5.4 seismic tremor with multiple aftershocks.",
      category: DisasterCategory.EARTHQUAKE,
      severity: IncidentSeverity.HIGH,
      operationalStatus: OperationalStatus.MONITORING,
      locationName: "Bhuj, Kutch, Gujarat",
      latitude: 23.242,
      longitude: 69.6669,
      startedAt: new Date("2026-11-14T03:15:00Z"),
      createdById: adminUser.id,
    },
  });

  const inc004 = await prisma.incident.upsert({
    where: { incidentCode: "INC-004" },
    update: {},
    create: {
      incidentCode: "INC-004",
      title: "Deep Depression Cyclone Alert — Bay of Bengal (Demo)",
      description: "DEMO INCIDENT: Simulated severe tropical cyclonic storm approaching Andhra coast.",
      category: DisasterCategory.CYCLONE,
      severity: IncidentSeverity.CRITICAL,
      operationalStatus: OperationalStatus.OPEN,
      locationName: "Visakhapatnam, Andhra Pradesh",
      latitude: 17.6868,
      longitude: 83.2185,
      startedAt: new Date("2026-11-14T21:00:00Z"),
      createdById: adminUser.id,
    },
  });

  // 3. Seed Reports
  console.log("  → Seeding disaster reports...");
  const report1 = await prisma.disasterReport.upsert({
    where: { externalId: "EXT-RPT-001" },
    update: {},
    create: {
      externalId: "EXT-RPT-001",
      originalText: "Water levels crossing 4 feet near Dadar station circle. Multiple BEST buses stalled and local train services halted.",
      normalizedText: "water levels crossing 4 feet near dadar station circle best buses stalled local train services halted",
      sourceType: ReportSourceType.SOCIAL_MEDIA,
      sourceName: "Simulated Citizen Dispatch @Twitter",
      submittedAt: new Date("2026-11-14T15:00:00Z"),
      latitude: 19.0178,
      longitude: 72.8478,
      locationName: "Dadar, Mumbai",
      createdById: analystUser.id,
    },
  });

  const report2 = await prisma.disasterReport.upsert({
    where: { externalId: "EXT-RPT-002" },
    update: {},
    create: {
      externalId: "EXT-RPT-002",
      originalText: "Earthquake tremor felt strongly in Anjar and Gandhidham. People ran out into open grounds.",
      normalizedText: "earthquake tremor felt strongly in anjar and gandhidham people ran out into open grounds",
      sourceType: ReportSourceType.FIELD_DISPATCH,
      sourceName: "Simulated District Feed",
      submittedAt: new Date("2026-11-14T03:25:00Z"),
      latitude: 23.114,
      longitude: 70.027,
      locationName: "Gandhidham, Kutch",
      createdById: analystUser.id,
    },
  });

  const report3 = await prisma.disasterReport.upsert({
    where: { externalId: "EXT-RPT-003" },
    update: {},
    create: {
      externalId: "EXT-RPT-003",
      originalText: "Attending a great wedding anniversary party in Bandra tonight! Great music and food.",
      normalizedText: "attending a great wedding anniversary party in bandra tonight great music and food",
      sourceType: ReportSourceType.SOCIAL_MEDIA,
      sourceName: "Simulated Instagram Feed",
      submittedAt: new Date("2026-11-14T16:00:00Z"),
      latitude: 19.0596,
      longitude: 72.8295,
      locationName: "Bandra, Mumbai",
      createdById: analystUser.id,
    },
  });

  // 4. Seed Analyses (Explicitly marked as Synthetic/Demo Predictions)
  console.log("  → Seeding synthetic model analyses...");
  const existingAnalysis1 = await prisma.analysis.findFirst({
    where: { reportId: report1.id },
  });
  if (!existingAnalysis1) {
    await prisma.analysis.create({
      data: {
        reportId: report1.id,
        predictedLabel: PredictedLabel.DISASTER_RELATED,
        probability: 0.942,
        decisionThreshold: 0.35,
        suggestedCategory: DisasterCategory.FLOOD,
        modelName: "AapdaWatch-BiLSTM",
        modelVersion: "1.0.0-demo",
        preprocessingVersion: "1.0.0-demo",
        inferenceStatus: InferenceStatus.COMPLETED,
        metadata: {
          isSynthetic: true,
          demoNotice: "Simulated inference benchmark. Real model connects in Phase 3.",
          topFeatures: ["water levels", "flooding", "stalled", "halted"],
        },
      },
    });
  }

  const existingAnalysis2 = await prisma.analysis.findFirst({
    where: { reportId: report2.id },
  });
  if (!existingAnalysis2) {
    await prisma.analysis.create({
      data: {
        reportId: report2.id,
        predictedLabel: PredictedLabel.DISASTER_RELATED,
        probability: 0.915,
        decisionThreshold: 0.35,
        suggestedCategory: DisasterCategory.EARTHQUAKE,
        modelName: "AapdaWatch-BiLSTM",
        modelVersion: "1.0.0-demo",
        preprocessingVersion: "1.0.0-demo",
        inferenceStatus: InferenceStatus.COMPLETED,
        metadata: {
          isSynthetic: true,
          demoNotice: "Simulated inference benchmark. Real model connects in Phase 3.",
          topFeatures: ["earthquake", "tremor", "ground"],
        },
      },
    });
  }

  const existingAnalysis3 = await prisma.analysis.findFirst({
    where: { reportId: report3.id },
  });
  if (!existingAnalysis3) {
    await prisma.analysis.create({
      data: {
        reportId: report3.id,
        predictedLabel: PredictedLabel.NOT_DISASTER_RELATED,
        probability: 0.048,
        decisionThreshold: 0.35,
        suggestedCategory: null,
        modelName: "AapdaWatch-BiLSTM",
        modelVersion: "1.0.0-demo",
        preprocessingVersion: "1.0.0-demo",
        inferenceStatus: InferenceStatus.COMPLETED,
        metadata: {
          isSynthetic: true,
          demoNotice: "Simulated inference benchmark. Real model connects in Phase 3.",
          topFeatures: ["party", "wedding", "music"],
        },
      },
    });
  }

  // 5. Seed Incident-Report Associations
  console.log("  → Linking incident reports...");
  await prisma.incidentReport.upsert({
    where: {
      unique_incident_report: {
        incidentId: inc001.id,
        reportId: report1.id,
      },
    },
    update: {},
    create: {
      incidentId: inc001.id,
      reportId: report1.id,
      linkedById: adminUser.id,
      relationshipType: RelationshipType.PRIMARY_SIGNAL,
    },
  });

  await prisma.incidentReport.upsert({
    where: {
      unique_incident_report: {
        incidentId: inc002.id,
        reportId: report2.id,
      },
    },
    update: {},
    create: {
      incidentId: inc002.id,
      reportId: report2.id,
      linkedById: adminUser.id,
      relationshipType: RelationshipType.PRIMARY_SIGNAL,
    },
  });

  // 6. Seed Human Verification Reviews (Guaranteed Idempotent)
  console.log("  → Seeding human review decisions...");
  const existingReview1 = await prisma.incidentReview.findFirst({
    where: { reportId: report1.id, reviewerId: reviewerUser.id },
  });
  if (!existingReview1) {
    await prisma.incidentReview.create({
      data: {
        reportId: report1.id,
        incidentId: inc001.id,
        reviewerId: reviewerUser.id,
        decision: ReviewDecision.VERIFIED_DISASTER,
        notes: "Field report corroborated with Mumbai Traffic Police official CCTV feeds. Confirmed urban inundation.",
      },
    });
  }

  const existingReview2 = await prisma.incidentReview.findFirst({
    where: { reportId: report3.id, reviewerId: reviewerUser.id },
  });
  if (!existingReview2) {
    await prisma.incidentReview.create({
      data: {
        reportId: report3.id,
        reviewerId: reviewerUser.id,
        decision: ReviewDecision.FALSE_POSITIVE,
        notes: "Routine social event dispatch. Verified not disaster-related.",
      },
    });
  }

  // 7. Seed Correlation Candidates
  console.log("  → Seeding correlation candidates...");
  await prisma.correlationCandidate.upsert({
    where: {
      unique_pending_candidate: {
        reportId: report1.id,
        targetIncidentId: inc001.id,
        status: CorrelationStatus.ACCEPTED,
      },
    },
    update: {},
    create: {
      reportId: report1.id,
      targetIncidentId: inc001.id,
      correlationScore: 0.92,
      reasoning: ["Same category: FLOOD", "Geographic proximity: 2.1km", "Time window: 30 minutes"],
      status: CorrelationStatus.ACCEPTED,
      reviewedById: adminUser.id,
      reviewedAt: new Date("2026-11-14T15:30:00Z"),
    },
  });

  // 8. Seed Initial Audit Log (Guaranteed Idempotent)
  console.log("  → Recording audit trail...");
  const existingAudit = await prisma.auditLog.findFirst({
    where: {
      action: AuditAction.SYSTEM_CONFIG_CHANGED,
      entityType: "System",
      entityId: "APP-ROOT",
    },
  });

  if (!existingAudit) {
    await prisma.auditLog.create({
      data: {
        actorId: adminUser.id,
        action: AuditAction.SYSTEM_CONFIG_CHANGED,
        entityType: "System",
        entityId: "APP-ROOT",
        metadata: {
          event: "Phase 2.0 Database Foundation & Seed Initialization Completed",
          environment: "development",
        },
        ipAddress: "127.0.0.1",
        userAgent: "AapdaWatch-Seed/1.0",
      },
    });
  }

  console.log("✅ AapdaWatch AI seed completed successfully with 100% idempotency.");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed with error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
