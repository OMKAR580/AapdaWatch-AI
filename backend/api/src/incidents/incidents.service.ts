import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";
import { CreateIncidentDto } from "./dto/create-incident.dto";
import { UpdateIncidentDto } from "./dto/update-incident.dto";
import { QueryIncidentsDto } from "./dto/query-incidents.dto";
import {
  Prisma,
  OperationalStatus,
  RelationshipType,
  AuditAction,
} from "@prisma/client";
import { serializeToCsv } from "../common/utils/csv.util";

@Injectable()
export class IncidentsService {
  private readonly logger = new Logger(IncidentsService.name);

  constructor(private readonly prisma: PrismaService) {}

  private validateCoordinates(lat?: number, lon?: number) {
    const hasLat = lat !== undefined && lat !== null;
    const hasLon = lon !== undefined && lon !== null;
    if ((hasLat && !hasLon) || (!hasLat && hasLon)) {
      throw new BadRequestException(
        "Invalid coordinates: latitude and longitude must both be provided, or both omitted.",
      );
    }
  }

  private mapIncidentStatus(status: OperationalStatus): string {
    switch (status) {
      case OperationalStatus.RESOLVED:
      case OperationalStatus.CLOSED:
        return "resolved";
      case OperationalStatus.CONTAINED:
      case OperationalStatus.MONITORING:
        return "verified";
      case OperationalStatus.OPEN:
      default:
        return "under-review";
    }
  }

  async create(dto: CreateIncidentDto) {
    this.validateCoordinates(dto.latitude, dto.longitude);

    const year = new Date().getFullYear();
    const count = await this.prisma.incident.count();
    const incidentCode =
      dto.incidentCode ||
      `INC-${year}-${String(count + 1).padStart(3, "0")}`;

    const incident = await this.prisma.incident.create({
      data: {
        incidentCode,
        title: dto.title,
        description: dto.description,
        category: dto.category,
        severity: dto.severity,
        operationalStatus: dto.operationalStatus || OperationalStatus.OPEN,
        locationName: dto.locationName,
        latitude: dto.latitude,
        longitude: dto.longitude,
        startedAt: dto.startedAt ? new Date(dto.startedAt) : new Date(),
      },
    });

    try {
      await this.prisma.auditLog.create({
        data: {
          action: AuditAction.INCIDENT_CREATED,
          entityType: "Incident",
          entityId: incident.id,
          metadata: {
            incidentCode: incident.incidentCode,
            severity: incident.severity,
            category: incident.category,
          },
        },
      });
    } catch (auditErr) {
      this.logger.warn(`Failed to write audit log for incident ${incident.id}: ${auditErr}`);
    }

    return this.findOne(incident.id);
  }

  async findAll(query: QueryIncidentsDto) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.IncidentWhereInput = {};

    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: "insensitive" } },
        { incidentCode: { contains: query.search, mode: "insensitive" } },
        { locationName: { contains: query.search, mode: "insensitive" } },
      ];
    }

    if (query.category) {
      where.category = query.category;
    }

    if (query.severity) {
      where.severity = query.severity;
    }

    if (query.operationalStatus) {
      where.operationalStatus = query.operationalStatus;
    } else if (query.status === "active") {
      where.operationalStatus = {
        in: [OperationalStatus.OPEN, OperationalStatus.MONITORING, OperationalStatus.CONTAINED],
      };
    } else if (query.status === "resolved") {
      where.operationalStatus = {
        in: [OperationalStatus.RESOLVED, OperationalStatus.CLOSED],
      };
    }

    const [total, items] = await Promise.all([
      this.prisma.incident.count({ where }),
      this.prisma.incident.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          _count: {
            select: { incidentReports: true },
          },
          incidentReports: {
            take: 3,
            include: {
              report: {
                select: {
                  id: true,
                  originalText: true,
                  submittedAt: true,
                  sourceName: true,
                },
              },
            },
          },
        },
      }),
    ]);

    const formatted = items.map((inc) => ({
      id: inc.id,
      incidentCode: inc.incidentCode,
      title: inc.title,
      description: inc.description,
      category: inc.category.toLowerCase(),
      severity: inc.severity.toLowerCase(),
      operationalStatus: inc.operationalStatus,
      status: this.mapIncidentStatus(inc.operationalStatus),
      verificationStatus: this.mapIncidentStatus(inc.operationalStatus),
      location: {
        name: inc.locationName,
        latitude: inc.latitude || 0,
        longitude: inc.longitude || 0,
      },
      reportCount: inc._count.incidentReports,
      createdAt: inc.createdAt.toISOString(),
      updatedAt: inc.updatedAt.toISOString(),
      recentReports: inc.incidentReports.map((ir) => ({
        id: ir.report.id,
        text: ir.report.originalText,
        submittedAt: ir.report.submittedAt.toISOString(),
      })),
    }));

    return {
      items: formatted,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(idOrCode: string) {
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrCode);

    const inc = await this.prisma.incident.findFirst({
      where: isUuid ? { id: idOrCode } : { incidentCode: idOrCode },
      include: {
        incidentReports: {
          include: {
            report: {
              include: {
                analyses: {
                  orderBy: { createdAt: "desc" },
                  take: 1,
                },
                reviews: {
                  orderBy: { reviewedAt: "desc" },
                  take: 1,
                },
              },
            },
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
      },
    });

    if (!inc) {
      throw new NotFoundException(`Incident with identifier ${idOrCode} not found.`);
    }

    const reports = inc.incidentReports.map((ir) => {
      const r = ir.report;
      const analysis = r.analyses[0];
      const review = r.reviews[0];

      return {
        id: r.id,
        text: r.originalText,
        source: r.sourceName || r.sourceType,
        sourceType: r.sourceType,
        timestamp: r.submittedAt.toISOString(),
        location: {
          name: r.locationName || inc.locationName,
          latitude: r.latitude || inc.latitude || 0,
          longitude: r.longitude || inc.longitude || 0,
        },
        predictedClass:
          analysis?.predictedLabel === "DISASTER_RELATED"
            ? "disaster-related"
            : "not-disaster-related",
        confidence: analysis?.probability,
        disasterProbability: analysis?.probability,
        category: analysis?.suggestedCategory?.toLowerCase() || inc.category.toLowerCase(),
        verificationStatus: review
          ? review.decision === "VERIFIED_DISASTER"
            ? "verified"
            : review.decision === "FALSE_POSITIVE"
              ? "false-positive"
              : "under-review"
          : "unreviewed",
        relationshipType: ir.relationshipType,
        linkedAt: ir.linkedAt.toISOString(),
      };
    });

    return {
      id: inc.id,
      incidentCode: inc.incidentCode,
      title: inc.title,
      description: inc.description,
      category: inc.category.toLowerCase(),
      severity: inc.severity.toLowerCase(),
      operationalStatus: inc.operationalStatus,
      status: this.mapIncidentStatus(inc.operationalStatus),
      verificationStatus: this.mapIncidentStatus(inc.operationalStatus),
      location: {
        name: inc.locationName,
        latitude: inc.latitude || 0,
        longitude: inc.longitude || 0,
      },
      reportCount: reports.length,
      createdAt: inc.createdAt.toISOString(),
      updatedAt: inc.updatedAt.toISOString(),
      startedAt: inc.startedAt?.toISOString(),
      reports,
      reviews: inc.reviews,
    };
  }

  async update(id: string, dto: UpdateIncidentDto) {
    const existing = await this.prisma.incident.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Incident with ID ${id} not found.`);
    }

    this.validateCoordinates(
      dto.latitude !== undefined ? dto.latitude : (existing.latitude ?? undefined),
      dto.longitude !== undefined ? dto.longitude : (existing.longitude ?? undefined),
    );

    const updated = await this.prisma.incident.update({
      where: { id },
      data: {
        title: dto.title !== undefined ? dto.title : existing.title,
        description: dto.description !== undefined ? dto.description : existing.description,
        category: dto.category !== undefined ? dto.category : existing.category,
        severity: dto.severity !== undefined ? dto.severity : existing.severity,
        operationalStatus:
          dto.operationalStatus !== undefined ? dto.operationalStatus : existing.operationalStatus,
        locationName:
          dto.locationName !== undefined ? dto.locationName : existing.locationName,
        latitude: dto.latitude !== undefined ? dto.latitude : existing.latitude,
        longitude: dto.longitude !== undefined ? dto.longitude : existing.longitude,
      },
    });

    try {
      await this.prisma.auditLog.create({
        data: {
          action: AuditAction.INCIDENT_UPDATED,
          entityType: "Incident",
          entityId: id,
          metadata: { updatedFields: Object.keys(dto) },
        },
      });
    } catch (auditErr) {
      this.logger.warn(`Failed to write audit log: ${auditErr}`);
    }

    return this.findOne(updated.id);
  }

  async updateStatus(id: string, status: OperationalStatus) {
    const existing = await this.prisma.incident.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Incident with ID ${id} not found.`);
    }

    const updated = await this.prisma.incident.update({
      where: { id },
      data: { operationalStatus: status },
    });

    try {
      await this.prisma.auditLog.create({
        data: {
          action: AuditAction.INCIDENT_UPDATED,
          entityType: "Incident",
          entityId: id,
          metadata: {
            previousStatus: existing.operationalStatus,
            newStatus: status,
          },
        },
      });
    } catch (auditErr) {
      this.logger.warn(`Failed to write audit log: ${auditErr}`);
    }

    return this.findOne(updated.id);
  }

  async addReport(
    incidentId: string,
    reportId: string,
    relationshipType: RelationshipType = RelationshipType.CORROBORATING_EVIDENCE,
  ) {
    const [incident, report] = await Promise.all([
      this.prisma.incident.findUnique({ where: { id: incidentId } }),
      this.prisma.disasterReport.findUnique({ where: { id: reportId } }),
    ]);

    if (!incident) {
      throw new NotFoundException(`Incident with ID ${incidentId} not found.`);
    }
    if (!report) {
      throw new NotFoundException(`Report with ID ${reportId} not found.`);
    }

    // Check for duplicate association
    const existing = await this.prisma.incidentReport.findUnique({
      where: {
        unique_incident_report: {
          incidentId,
          reportId,
        },
      },
    });

    if (existing) {
      throw new ConflictException(
        `Report ${reportId} is already associated with incident ${incidentId}.`,
      );
    }

    // Atomically link report in transaction and touch incident updatedAt
    await this.prisma.$transaction(async (tx) => {
      await tx.incidentReport.create({
        data: {
          incidentId,
          reportId,
          relationshipType,
        },
      });

      await tx.incident.update({
        where: { id: incidentId },
        data: { updatedAt: new Date() },
      });

      await tx.auditLog.create({
        data: {
          action: AuditAction.INCIDENT_UPDATED,
          entityType: "IncidentReport",
          entityId: `${incidentId}:${reportId}`,
          metadata: { event: "Report linked to incident", incidentId, reportId },
        },
      });
    });

    return this.findOne(incidentId);
  }

  async removeReport(incidentId: string, reportId: string) {
    const link = await this.prisma.incidentReport.findUnique({
      where: {
        unique_incident_report: {
          incidentId,
          reportId,
        },
      },
    });

    if (!link) {
      throw new NotFoundException(
        `Report ${reportId} is not associated with incident ${incidentId}.`,
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.incidentReport.delete({
        where: { id: link.id },
      });

      await tx.incident.update({
        where: { id: incidentId },
        data: { updatedAt: new Date() },
      });

      await tx.auditLog.create({
        data: {
          action: AuditAction.INCIDENT_UPDATED,
          entityType: "IncidentReport",
          entityId: link.id,
          metadata: { event: "Report unlinked from incident", incidentId, reportId },
        },
      });
    });

    return { success: true, message: `Report ${reportId} unlinked from incident ${incidentId}.` };
  }

  async exportCsv(query: QueryIncidentsDto): Promise<string> {
    const incidents = await this.findAll({ ...query, limit: 1000 });

    const headers = [
      { key: "id", label: "incident_id" },
      { key: "incidentCode", label: "incident_code" },
      { key: "title", label: "title" },
      { key: "category", label: "category" },
      { key: "severity", label: "severity" },
      { key: "operationalStatus", label: "operational_status" },
      { key: "status", label: "status" },
      { key: "locationName", label: "location_name" },
      { key: "latitude", label: "latitude" },
      { key: "longitude", label: "longitude" },
      { key: "reportCount", label: "report_count" },
      { key: "description", label: "description" },
      { key: "createdAt", label: "created_at" },
      { key: "updatedAt", label: "updated_at" },
    ];

    const data = incidents.items.map((inc) => ({
      id: inc.id,
      incidentCode: inc.incidentCode,
      title: inc.title,
      category: inc.category,
      severity: inc.severity,
      operationalStatus: inc.operationalStatus,
      status: inc.status,
      locationName: inc.location.name,
      latitude: inc.location.latitude,
      longitude: inc.location.longitude,
      reportCount: inc.reportCount,
      description: inc.description,
      createdAt: inc.createdAt,
      updatedAt: inc.updatedAt,
    }));

    return serializeToCsv(headers, data);
  }
}

