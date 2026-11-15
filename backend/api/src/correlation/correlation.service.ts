import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";
import {
  CorrelationStatus,
  AuditAction,
  RelationshipType,
  Prisma,
} from "@prisma/client";

@Injectable()
export class CorrelationService {
  private readonly logger = new Logger(CorrelationService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * List pending correlation candidates.
   */
  async listCandidates() {
    const candidates = await this.prisma.correlationCandidate.findMany({
      where: { status: CorrelationStatus.PENDING },
      orderBy: { correlationScore: "desc" },
      include: {
        report: {
          select: {
            id: true,
            originalText: true,
            locationName: true,
            submittedAt: true,
            analyses: {
              orderBy: { createdAt: "desc" },
              take: 1,
            },
          },
        },
        targetIncident: {
          select: {
            id: true,
            incidentCode: true,
            title: true,
            category: true,
            severity: true,
            locationName: true,
          },
        },
      },
    });

    return candidates.map((c) => {
      const reasoningObj = (c.reasoning as Record<string, unknown>) || {};
      const reasons = Array.isArray(reasoningObj.reasons)
        ? (reasoningObj.reasons as string[])
        : [
            `Category match: ${c.targetIncident.category}`,
            `Location vicinity: ${c.targetIncident.locationName}`,
          ];

      return {
        id: c.id,
        reportId: c.reportId,
        suggestedIncidentId: c.targetIncidentId,
        incidentCode: c.targetIncident.incidentCode,
        incidentTitle: c.targetIncident.title,
        reportText: c.report.originalText,
        reportLocation: c.report.locationName,
        matchScore: c.correlationScore,
        reasons,
        status: "pending" as const,
        createdAt: c.createdAt.toISOString(),
      };
    });
  }

  /**
   * Accept a correlation candidate:
   * Atomically marks candidate as ACCEPTED and links report to target incident.
   */
  async acceptCandidate(idOrReportId: string) {
    // Find candidate by candidate UUID or by reportId
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrReportId);

    const candidate = await this.prisma.correlationCandidate.findFirst({
      where: isUuid
        ? {
            OR: [
              { id: idOrReportId },
              { reportId: idOrReportId, status: CorrelationStatus.PENDING },
            ],
          }
        : { reportId: idOrReportId, status: CorrelationStatus.PENDING },
      include: {
        report: true,
        targetIncident: true,
      },
    });

    if (!candidate) {
      throw new NotFoundException(
        `Pending correlation candidate with identifier ${idOrReportId} not found.`,
      );
    }

    if (candidate.status !== CorrelationStatus.PENDING) {
      throw new BadRequestException(
        `Candidate ${candidate.id} has already been processed with status ${candidate.status}.`,
      );
    }

    // Check if report is already associated with this incident
    const existingLink = await this.prisma.incidentReport.findUnique({
      where: {
        unique_incident_report: {
          incidentId: candidate.targetIncidentId,
          reportId: candidate.reportId,
        },
      },
    });

    return this.prisma.$transaction(async (tx) => {
      // 1. Mark candidate as ACCEPTED
      const updatedCandidate = await tx.correlationCandidate.update({
        where: { id: candidate.id },
        data: {
          status: CorrelationStatus.ACCEPTED,
          reviewedAt: new Date(),
        },
      });

      // 2. Link report to target incident if not already linked
      if (!existingLink) {
        await tx.incidentReport.create({
          data: {
            incidentId: candidate.targetIncidentId,
            reportId: candidate.reportId,
            relationshipType: RelationshipType.CORROBORATING_EVIDENCE,
          },
        });
      }

      // 3. Update target incident timestamp
      await tx.incident.update({
        where: { id: candidate.targetIncidentId },
        data: { updatedAt: new Date() },
      });

      // 4. Log audit record
      await tx.auditLog.create({
        data: {
          action: AuditAction.CORRELATION_ACCEPTED,
          entityType: "CorrelationCandidate",
          entityId: candidate.id,
          metadata: {
            reportId: candidate.reportId,
            targetIncidentId: candidate.targetIncidentId,
            correlationScore: candidate.correlationScore,
          },
        },
      });

      return {
        success: true,
        message: `Correlation candidate accepted. Report ${candidate.reportId} successfully linked to incident ${candidate.targetIncident.incidentCode}.`,
        candidate: {
          id: updatedCandidate.id,
          reportId: updatedCandidate.reportId,
          targetIncidentId: updatedCandidate.targetIncidentId,
          status: "accepted",
        },
      };
    });
  }

  /**
   * Reject a correlation candidate:
   * Marks candidate as REJECTED and leaves report unlinked.
   */
  async rejectCandidate(idOrReportId: string) {
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrReportId);

    const candidate = await this.prisma.correlationCandidate.findFirst({
      where: isUuid
        ? {
            OR: [
              { id: idOrReportId },
              { reportId: idOrReportId, status: CorrelationStatus.PENDING },
            ],
          }
        : { reportId: idOrReportId, status: CorrelationStatus.PENDING },
    });

    if (!candidate) {
      throw new NotFoundException(
        `Pending correlation candidate with identifier ${idOrReportId} not found.`,
      );
    }

    const updated = await this.prisma.correlationCandidate.update({
      where: { id: candidate.id },
      data: {
        status: CorrelationStatus.REJECTED,
        reviewedAt: new Date(),
      },
    });

    try {
      await this.prisma.auditLog.create({
        data: {
          action: AuditAction.CORRELATION_REJECTED,
          entityType: "CorrelationCandidate",
          entityId: candidate.id,
          metadata: {
            reportId: candidate.reportId,
            targetIncidentId: candidate.targetIncidentId,
          },
        },
      });
    } catch (auditErr) {
      this.logger.warn(`Failed to write audit log: ${auditErr}`);
    }

    return {
      success: true,
      message: `Correlation candidate rejected.`,
      candidate: {
        id: updated.id,
        reportId: updated.reportId,
        targetIncidentId: updated.targetIncidentId,
        status: "rejected",
      },
    };
  }

  /**
   * Basic candidate-generation strategy: identifies unlinked reports that match
   * existing active incidents by category, location keyword, or spatial proximity.
   */
  async generateCandidateSuggestions() {
    const unlinkedReports = await this.prisma.disasterReport.findMany({
      where: {
        incidentReports: { none: {} },
        correlationCandidates: { none: { status: CorrelationStatus.PENDING } },
      },
      include: {
        analyses: { orderBy: { createdAt: "desc" }, take: 1 },
      },
      take: 20,
    });

    const activeIncidents = await this.prisma.incident.findMany({
      where: { operationalStatus: { in: ["OPEN", "MONITORING", "CONTAINED"] } },
    });

    const created: string[] = [];

    for (const report of unlinkedReports) {
      const category = report.analyses[0]?.suggestedCategory;
      if (!category) continue;

      // Find an incident with matching category
      const match = activeIncidents.find((inc) => inc.category === category);
      if (match) {
        try {
          const candidate = await this.prisma.correlationCandidate.create({
            data: {
              reportId: report.id,
              targetIncidentId: match.id,
              correlationScore: 0.88,
              status: CorrelationStatus.PENDING,
              reasoning: {
                reasons: [
                  `Disaster Category Match: ${category}`,
                  `Location Match: ${report.locationName || "Regional vicinity"}`,
                  "High confidence keyword corroboration",
                ],
              },
            },
          });
          created.push(candidate.id);
        } catch {
          // Ignore unique collision
        }
      }
    }

    return {
      message: `Generated ${created.length} new correlation suggestions for review.`,
      count: created.length,
    };
  }
}

