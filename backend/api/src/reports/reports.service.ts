import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";
import { CreateReportDto } from "./dto/create-report.dto";
import { UpdateReportDto } from "./dto/update-report.dto";
import { QueryReportsDto } from "./dto/query-reports.dto";
import { Prisma, AuditAction, ReviewDecision } from "@prisma/client";
import { serializeToCsv } from "../common/utils/csv.util";

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Validate coordinate pairs: must both be present or both null.
   */
  private validateCoordinates(lat?: number, lon?: number) {
    const hasLat = lat !== undefined && lat !== null;
    const hasLon = lon !== undefined && lon !== null;
    if ((hasLat && !hasLon) || (!hasLat && hasLon)) {
      throw new BadRequestException(
        "Invalid coordinates: latitude and longitude must both be provided, or both omitted.",
      );
    }
  }

  /**
   * Helper to compute latest verification status from IncidentReview records.
   */
  mapVerificationStatus(reviews: { decision: ReviewDecision; notes?: string | null; reviewedAt: Date }[]): string {
    if (!reviews || reviews.length === 0) {
      return "unreviewed";
    }
    const latest = reviews[0]; // assuming ordered desc by reviewedAt
    switch (latest.decision) {
      case ReviewDecision.VERIFIED_DISASTER:
        return "verified";
      case ReviewDecision.FALSE_POSITIVE:
        return "false-positive";
      case ReviewDecision.DUPLICATE:
        return "duplicate";
      case ReviewDecision.UNDER_REVIEW:
      default:
        return "under-review";
    }
  }

  async create(dto: CreateReportDto) {
    if (!dto.text || !dto.text.trim()) {
      throw new BadRequestException("Report text must not be empty or whitespace-only.");
    }

    this.validateCoordinates(dto.latitude, dto.longitude);

    const submittedAt = dto.submittedAt ? new Date(dto.submittedAt) : new Date();

    const report = await this.prisma.disasterReport.create({
      data: {
        originalText: dto.text,
        normalizedText: dto.text.trim().toLowerCase(),
        sourceType: dto.sourceType,
        sourceName: dto.sourceName,
        sourceUrl: dto.sourceUrl,
        locationName: dto.locationName,
        latitude: dto.latitude,
        longitude: dto.longitude,
        submittedAt,
        language: dto.language ?? "en",
        externalId: dto.externalId,
      },
    });

    // Create AuditLog record
    try {
      await this.prisma.auditLog.create({
        data: {
          action: AuditAction.REPORT_CREATED,
          entityType: "DisasterReport",
          entityId: report.id,
          metadata: {
            sourceType: report.sourceType,
            hasCoordinates: !!(report.latitude && report.longitude),
          },
        },
      });
    } catch (auditErr) {
      this.logger.warn(`Failed to write audit log for report ${report.id}: ${auditErr}`);
    }

    return this.findOne(report.id);
  }

  async findAll(query: QueryReportsDto) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.DisasterReportWhereInput = {};

    if (query.search) {
      where.OR = [
        { originalText: { contains: query.search, mode: "insensitive" } },
        { locationName: { contains: query.search, mode: "insensitive" } },
      ];
    }

    if (query.sourceType) {
      where.sourceType = query.sourceType;
    }

    if (query.category) {
      where.analyses = {
        some: { suggestedCategory: query.category },
      };
    }

    if (query.reviewStatus) {
      where.reviews = {
        some: { decision: query.reviewStatus },
      };
    } else if (query.status === "unreviewed") {
      where.reviews = { none: {} };
    }

    const [total, items] = await Promise.all([
      this.prisma.disasterReport.count({ where }),
      this.prisma.disasterReport.findMany({
        where,
        skip,
        take: limit,
        orderBy: { submittedAt: "desc" },
        include: {
          analyses: {
            orderBy: { createdAt: "desc" },
            take: 1,
          },
          incidentReports: {
            include: {
              incident: {
                select: {
                  id: true,
                  incidentCode: true,
                  title: true,
                  severity: true,
                  operationalStatus: true,
                },
              },
            },
          },
          reviews: {
            orderBy: { reviewedAt: "desc" },
            take: 1,
          },
        },
      }),
    ]);

    const formatted = items.map((item) => {
      const latestAnalysis = item.analyses[0];
      const latestReview = item.reviews[0];
      const linkedIncident = item.incidentReports[0]?.incident;

      return {
        id: item.id,
        text: item.originalText,
        source: item.sourceName || item.sourceType,
        sourceType: item.sourceType,
        sourceUrl: item.sourceUrl,
        timestamp: item.submittedAt.toISOString(),
        location: {
          name: item.locationName || "Unknown",
          latitude: item.latitude,
          longitude: item.longitude,
        },
        predictedClass:
          latestAnalysis?.predictedLabel === "DISASTER_RELATED"
            ? "disaster-related"
            : latestAnalysis?.predictedLabel === "NOT_DISASTER_RELATED"
              ? "not-disaster-related"
              : "unclassified",
        confidence: latestAnalysis?.probability,
        disasterProbability: latestAnalysis?.probability,
        notDisasterProbability:
          latestAnalysis?.probability !== undefined
            ? 1 - latestAnalysis.probability
            : undefined,
        category: latestAnalysis?.suggestedCategory?.toLowerCase(),
        verificationStatus: this.mapVerificationStatus(item.reviews),
        incidentId: linkedIncident?.id,
        incidentCode: linkedIncident?.incidentCode,
        incidentTitle: linkedIncident?.title,
        reviewedBy: latestReview ? "Human Reviewer" : undefined,
        reviewerNotes: latestReview?.notes,
        reviewedAt: latestReview?.reviewedAt.toISOString(),
        analysisId: latestAnalysis?.id,
      };
    });

    return {
      items: formatted,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string) {
    const item = await this.prisma.disasterReport.findUnique({
      where: { id },
      include: {
        analyses: {
          orderBy: { createdAt: "desc" },
        },
        incidentReports: {
          include: {
            incident: true,
          },
        },
        reviews: {
          orderBy: { reviewedAt: "desc" },
          include: {
            reviewer: {
              select: { id: true, name: true, email: true },
            },
          },
        },
        correlationCandidates: {
          where: { status: "PENDING" },
          include: {
            targetIncident: true,
          },
        },
      },
    });

    if (!item) {
      throw new NotFoundException(`Disaster report with ID ${id} not found.`);
    }

    const latestAnalysis = item.analyses[0];
    const latestReview = item.reviews[0];
    const linkedIncident = item.incidentReports[0]?.incident;

    return {
      id: item.id,
      text: item.originalText,
      source: item.sourceName || item.sourceType,
      sourceType: item.sourceType,
      sourceUrl: item.sourceUrl,
      timestamp: item.submittedAt.toISOString(),
      location: {
        name: item.locationName || "Unknown",
        latitude: item.latitude,
        longitude: item.longitude,
      },
      predictedClass:
        latestAnalysis?.predictedLabel === "DISASTER_RELATED"
          ? "disaster-related"
          : latestAnalysis?.predictedLabel === "NOT_DISASTER_RELATED"
            ? "not-disaster-related"
            : "unclassified",
      confidence: latestAnalysis?.probability,
      disasterProbability: latestAnalysis?.probability,
      notDisasterProbability:
        latestAnalysis?.probability !== undefined
          ? 1 - latestAnalysis.probability
          : undefined,
      category: latestAnalysis?.suggestedCategory?.toLowerCase(),
      verificationStatus: this.mapVerificationStatus(item.reviews),
      incidentId: linkedIncident?.id,
      incidentCode: linkedIncident?.incidentCode,
      incidentTitle: linkedIncident?.title,
      incident: linkedIncident,
      analyses: item.analyses,
      reviews: item.reviews,
      reviewerNotes: latestReview?.notes,
      reviewedBy: latestReview?.reviewer?.name,
      reviewedAt: latestReview?.reviewedAt.toISOString(),
    };
  }

  async update(id: string, dto: UpdateReportDto) {
    const existing = await this.prisma.disasterReport.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Disaster report with ID ${id} not found.`);
    }

    this.validateCoordinates(
      dto.latitude !== undefined ? dto.latitude : (existing.latitude ?? undefined),
      dto.longitude !== undefined ? dto.longitude : (existing.longitude ?? undefined),
    );

    const updated = await this.prisma.disasterReport.update({
      where: { id },
      data: {
        locationName: dto.locationName !== undefined ? dto.locationName : existing.locationName,
        latitude: dto.latitude !== undefined ? dto.latitude : existing.latitude,
        longitude: dto.longitude !== undefined ? dto.longitude : existing.longitude,
        sourceType: dto.sourceType !== undefined ? dto.sourceType : existing.sourceType,
        sourceName: dto.sourceName !== undefined ? dto.sourceName : existing.sourceName,
        sourceUrl: dto.sourceUrl !== undefined ? dto.sourceUrl : existing.sourceUrl,
        language: dto.language !== undefined ? dto.language : existing.language,
      },
    });

    try {
      await this.prisma.auditLog.create({
        data: {
          action: AuditAction.REPORT_UPDATED,
          entityType: "DisasterReport",
          entityId: id,
          metadata: { updatedFields: Object.keys(dto) },
        },
      });
    } catch (auditErr) {
      this.logger.warn(`Failed to write audit log: ${auditErr}`);
    }

    return this.findOne(updated.id);
  }

  async searchReports(text: string) {
    if (!text || text.trim() === "") {
      return this.findAll({ limit: 10 });
    }
    return this.findAll({ search: text, limit: 20 });
  }

  async exportCsv(query: QueryReportsDto): Promise<string> {
    const reports = await this.findAll({ ...query, limit: 1000 });

    const headers = [
      { key: "id", label: "report_id" },
      { key: "text", label: "text" },
      { key: "source", label: "source" },
      { key: "locationName", label: "location" },
      { key: "latitude", label: "latitude" },
      { key: "longitude", label: "longitude" },
      { key: "predictedClass", label: "predicted_class" },
      { key: "confidence", label: "confidence" },
      { key: "category", label: "category" },
      { key: "verificationStatus", label: "verification_status" },
      { key: "incidentId", label: "incident_id" },
      { key: "timestamp", label: "submitted_at" },
    ];

    const data = reports.items.map((r) => ({
      id: r.id,
      text: r.text,
      source: r.source,
      locationName: r.location?.name || "",
      latitude: r.location?.latitude ?? "",
      longitude: r.location?.longitude ?? "",
      predictedClass: r.predictedClass,
      confidence: r.confidence ?? "",
      category: r.category ?? "",
      verificationStatus: r.verificationStatus,
      incidentId: r.incidentId ?? "",
      timestamp: r.timestamp,
    }));

    return serializeToCsv(headers, data);
  }
}

