import { Injectable } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";
import {
  OperationalStatus,
  IncidentSeverity,
  DisasterCategory,
  CorrelationStatus,
} from "@prisma/client";

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * High-level summary metrics calculated directly from PostgreSQL.
   */
  async getOverview() {
    const [
      totalReports,
      activeIncidents,
      criticalIncidents,
      allIncidents,
      unreviewedReports,
      pendingCorrelations,
    ] = await Promise.all([
      this.prisma.disasterReport.count(),
      this.prisma.incident.count({
        where: {
          operationalStatus: {
            in: [
              OperationalStatus.OPEN,
              OperationalStatus.MONITORING,
              OperationalStatus.CONTAINED,
            ],
          },
        },
      }),
      this.prisma.incident.count({
        where: { severity: IncidentSeverity.CRITICAL },
      }),
      this.prisma.incident.count(),
      this.prisma.disasterReport.count({
        where: {
          OR: [
            { reviews: { none: {} } },
            { reviews: { some: { decision: "UNDER_REVIEW" } } },
          ],
        },
      }),
      this.prisma.correlationCandidate.count({
        where: { status: CorrelationStatus.PENDING },
      }),
    ]);

    return {
      totalReports,
      activeIncidents,
      criticalIncidents,
      totalIncidents: allIncidents,
      pendingVerification: unreviewedReports,
      pendingCorrelations,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Incident counts grouped by disaster category from database records.
   */
  async getCategoryDistribution() {
    const counts = await this.prisma.incident.groupBy({
      by: ["category"],
      _count: { id: true },
    });

    const categoryMap: Record<string, number> = {
      flood: 0,
      earthquake: 0,
      fire: 0,
      cyclone: 0,
      landslide: 0,
      other: 0,
    };

    counts.forEach((item) => {
      const key = item.category.toLowerCase();
      categoryMap[key] = item._count.id;
    });

    const config: Record<string, { label: string; color: string }> = {
      flood: { label: "Flood", color: "#326B54" },
      earthquake: { label: "Earthquake", color: "#D97706" },
      fire: { label: "Fire", color: "#DC2626" },
      cyclone: { label: "Cyclone", color: "#2563EB" },
      landslide: { label: "Landslide", color: "#7C3AED" },
      other: { label: "Other", color: "#6B7280" },
    };

    const data = Object.entries(categoryMap).map(([key, count]) => ({
      category: key,
      label: config[key]?.label || key,
      count,
      color: config[key]?.color || "#6B7280",
    }));

    return {
      data,
      total: counts.reduce((acc, c) => acc + c._count.id, 0),
    };
  }

  /**
   * Incident counts grouped by severity.
   */
  async getSeverityDistribution() {
    const counts = await this.prisma.incident.groupBy({
      by: ["severity"],
      _count: { id: true },
    });

    const severityMap: Record<string, number> = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
    };

    counts.forEach((item) => {
      severityMap[item.severity.toLowerCase()] = item._count.id;
    });

    return {
      critical: severityMap.critical,
      high: severityMap.high,
      medium: severityMap.medium,
      low: severityMap.low,
      total: Object.values(severityMap).reduce((a, b) => a + b, 0),
    };
  }

  /**
   * Incident operational status breakdown.
   */
  async getStatusDistribution() {
    const counts = await this.prisma.incident.groupBy({
      by: ["operationalStatus"],
      _count: { id: true },
    });

    const statusMap: Record<string, number> = {
      open: 0,
      monitoring: 0,
      contained: 0,
      resolved: 0,
      closed: 0,
    };

    counts.forEach((item) => {
      statusMap[item.operationalStatus.toLowerCase()] = item._count.id;
    });

    return statusMap;
  }

  /**
   * Timeline trend of reports and incidents over time.
   */
  async getTimeline(range: "7d" | "30d" | "90d" = "7d") {
    const days = range === "90d" ? 90 : range === "30d" ? 30 : 7;
    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - days);

    const [reports, incidents] = await Promise.all([
      this.prisma.disasterReport.findMany({
        where: { submittedAt: { gte: sinceDate } },
        select: { submittedAt: true },
      }),
      this.prisma.incident.findMany({
        where: { createdAt: { gte: sinceDate } },
        select: { createdAt: true },
      }),
    ]);

    // Aggregate by day
    const dayMap: Record<string, { date: string; reports: number; incidents: number }> = {};

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
      dayMap[key] = { date: label, reports: 0, incidents: 0 };
    }

    reports.forEach((r) => {
      const key = r.submittedAt.toISOString().slice(0, 10);
      if (dayMap[key]) dayMap[key].reports++;
    });

    incidents.forEach((inc) => {
      const key = inc.createdAt.toISOString().slice(0, 10);
      if (dayMap[key]) dayMap[key].incidents++;
    });

    return Object.values(dayMap);
  }
}

