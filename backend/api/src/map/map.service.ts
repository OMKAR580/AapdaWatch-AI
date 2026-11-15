import { Injectable } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";
import { DisasterCategory, IncidentSeverity, Prisma } from "@prisma/client";

@Injectable()
export class MapService {
  constructor(private readonly prisma: PrismaService) {}

  async getMapIncidents(filters?: {
    category?: DisasterCategory;
    severity?: IncidentSeverity;
    status?: string;
  }) {
    const where: Prisma.IncidentWhereInput = {
      latitude: { not: null },
      longitude: { not: null },
    };

    if (filters?.category) {
      where.category = filters.category;
    }
    if (filters?.severity) {
      where.severity = filters.severity;
    }

    const incidents = await this.prisma.incident.findMany({
      where,
      include: {
        _count: {
          select: { incidentReports: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return incidents.map((inc) => ({
      id: inc.id,
      incidentCode: inc.incidentCode,
      title: inc.title,
      description: inc.description,
      category: inc.category.toLowerCase(),
      severity: inc.severity.toLowerCase(),
      operationalStatus: inc.operationalStatus,
      status:
        inc.operationalStatus === "RESOLVED" || inc.operationalStatus === "CLOSED"
          ? "resolved"
          : "verified",
      verificationStatus: "verified",
      reportCount: inc._count.incidentReports,
      // Geographic coordinates: GeoJSON standard [longitude, latitude]
      coordinates: [inc.longitude, inc.latitude] as [number, number],
      location: {
        name: inc.locationName,
        latitude: inc.latitude || 0,
        longitude: inc.longitude || 0,
      },
      createdAt: inc.createdAt.toISOString(),
      updatedAt: inc.updatedAt.toISOString(),
    }));
  }
}

