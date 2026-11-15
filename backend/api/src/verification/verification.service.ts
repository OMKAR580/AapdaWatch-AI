import {
  Injectable,
  NotFoundException,
  Logger,
} from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";
import { SubmitReviewDto } from "./dto/submit-review.dto";
import { ReviewDecision, AuditAction, UserRole } from "@prisma/client";

@Injectable()
export class VerificationService {
  private readonly logger = new Logger(VerificationService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Resolve an authorized reviewer user identity from the database.
   */
  private async getReviewerId(providedId?: string): Promise<string> {
    if (providedId) {
      const user = await this.prisma.user.findUnique({ where: { id: providedId } });
      if (user) return user.id;
    }

    const defaultReviewer = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: "reviewer@dev.aapdawatch.local" },
          { role: UserRole.REVIEWER },
          { role: UserRole.ADMIN },
        ],
      },
    });

    if (defaultReviewer) {
      return defaultReviewer.id;
    }

    // Fallback: pick any user or create system reviewer
    const anyUser = await this.prisma.user.findFirst();
    if (anyUser) return anyUser.id;

    const created = await this.prisma.user.create({
      data: {
        name: "Human Reviewer",
        email: "reviewer@dev.aapdawatch.local",
        role: UserRole.REVIEWER,
      },
    });
    return created.id;
  }

  private mapDecisionToStatus(decision: ReviewDecision): string {
    switch (decision) {
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

  /**
   * List reports awaiting verification or with specific decision status.
   */
  async listReportsForVerification(filterStatus?: string) {
    const reports = await this.prisma.disasterReport.findMany({
      orderBy: { submittedAt: "desc" },
      include: {
        analyses: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
        reviews: {
          orderBy: { reviewedAt: "desc" },
          include: {
            reviewer: {
              select: { id: true, name: true, email: true },
            },
          },
        },
        incidentReports: {
          include: {
            incident: true,
          },
        },
      },
    });

    const items = reports.map((r) => {
      const analysis = r.analyses[0];
      const latestReview = r.reviews[0];
      const currentStatus = latestReview
        ? this.mapDecisionToStatus(latestReview.decision)
        : "unreviewed";

      return {
        id: r.id,
        text: r.originalText,
        source: r.sourceName || r.sourceType,
        sourceType: r.sourceType,
        sourceUrl: r.sourceUrl,
        timestamp: r.submittedAt.toISOString(),
        location: {
          name: r.locationName || "Unknown",
          latitude: r.latitude || 0,
          longitude: r.longitude || 0,
        },
        predictedClass:
          analysis?.predictedLabel === "DISASTER_RELATED"
            ? "disaster-related"
            : analysis?.predictedLabel === "NOT_DISASTER_RELATED"
              ? "not-disaster-related"
              : "unclassified",
        confidence: analysis?.probability,
        disasterProbability: analysis?.probability,
        category: analysis?.suggestedCategory?.toLowerCase() || "other",
        verificationStatus: currentStatus,
        reviewerNotes: latestReview?.notes,
        reviewedBy: latestReview?.reviewer?.name,
        reviewedAt: latestReview?.reviewedAt.toISOString(),
        reviewCount: r.reviews.length,
        incidentId: r.incidentReports[0]?.incidentId,
        incidentTitle: r.incidentReports[0]?.incident?.title,
      };
    });

    if (filterStatus && filterStatus !== "all") {
      return items.filter((i) => i.verificationStatus === filterStatus);
    }

    return items;
  }

  async getReviewDetails(reportId: string) {
    const report = await this.prisma.disasterReport.findUnique({
      where: { id: reportId },
      include: {
        analyses: {
          orderBy: { createdAt: "desc" },
        },
        reviews: {
          orderBy: { reviewedAt: "desc" },
          include: {
            reviewer: {
              select: { id: true, name: true, email: true, role: true },
            },
            incident: {
              select: { id: true, incidentCode: true, title: true },
            },
          },
        },
        incidentReports: {
          include: {
            incident: true,
          },
        },
      },
    });

    if (!report) {
      throw new NotFoundException(`Disaster report with ID ${reportId} not found.`);
    }

    const latestAnalysis = report.analyses[0];
    const latestReview = report.reviews[0];

    return {
      reportId: report.id,
      text: report.originalText,
      source: report.sourceName || report.sourceType,
      location: {
        name: report.locationName || "Unknown",
        latitude: report.latitude || 0,
        longitude: report.longitude || 0,
      },
      submittedAt: report.submittedAt.toISOString(),
      currentStatus: latestReview ? this.mapDecisionToStatus(latestReview.decision) : "unreviewed",
      latestAnalysis: latestAnalysis
        ? {
            id: latestAnalysis.id,
            predictedClass:
              latestAnalysis.predictedLabel === "DISASTER_RELATED"
                ? "disaster-related"
                : "not-disaster-related",
            probability: latestAnalysis.probability,
            suggestedCategory: latestAnalysis.suggestedCategory?.toLowerCase(),
            modelName: latestAnalysis.modelName,
            metadata: latestAnalysis.metadata,
          }
        : null,
      reviews: report.reviews.map((rev) => ({
        id: rev.id,
        decision: rev.decision,
        status: this.mapDecisionToStatus(rev.decision),
        notes: rev.notes,
        reviewerId: rev.reviewerId,
        reviewerName: rev.reviewer.name,
        reviewerEmail: rev.reviewer.email,
        reviewedAt: rev.reviewedAt.toISOString(),
        incidentId: rev.incidentId,
        incidentTitle: rev.incident?.title,
      })),
      linkedIncident: report.incidentReports[0]?.incident,
    };
  }

  async submitReview(reportId: string, dto: SubmitReviewDto) {
    const report = await this.prisma.disasterReport.findUnique({
      where: { id: reportId },
    });
    if (!report) {
      throw new NotFoundException(`Disaster report with ID ${reportId} not found.`);
    }

    const reviewerId = await this.getReviewerId(dto.reviewerId);

    // Save review record & audit log atomically
    const review = await this.prisma.$transaction(async (tx) => {
      const createdReview = await tx.incidentReview.create({
        data: {
          reportId,
          reviewerId,
          decision: dto.decision,
          notes: dto.notes,
          incidentId: dto.incidentId,
        },
        include: {
          reviewer: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: reviewerId,
          action: AuditAction.REVIEW_SUBMITTED,
          entityType: "IncidentReview",
          entityId: createdReview.id,
          metadata: {
            reportId,
            decision: dto.decision,
            notes: dto.notes,
          },
        },
      });

      return createdReview;
    });

    return {
      success: true,
      review: {
        id: review.id,
        reportId: review.reportId,
        decision: review.decision,
        status: this.mapDecisionToStatus(review.decision),
        notes: review.notes,
        reviewerName: review.reviewer.name,
        reviewedAt: review.reviewedAt.toISOString(),
      },
    };
  }

  async getReviewHistory(reportId: string) {
    const details = await this.getReviewDetails(reportId);
    return details.reviews;
  }
}

