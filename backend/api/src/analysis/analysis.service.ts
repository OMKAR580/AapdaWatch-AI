import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ServiceUnavailableException,
  Logger,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../database/prisma.service";
import { MlClientService } from "./ml-client.service";
import { classifyDemoText } from "./demo-classifier";
import { BatchAnalysisDto } from "./dto/batch-analysis.dto";
import {
  AuditAction,
  InferenceStatus,
  PredictedLabel,
  DisasterCategory,
  Prisma,
} from "@prisma/client";

function inferCategoryFromText(text: string): DisasterCategory | null {
  const lower = text.toLowerCase();
  if (/\b(flood|floods|flooding|waterlogg|inundat|overflow|drown|submerg)/.test(lower)) {
    return DisasterCategory.FLOOD;
  }
  if (/\b(earthquake|earthquakes|tremor|tremors|quake|quakes|aftershock|aftershocks|seismic)/.test(lower)) {
    return DisasterCategory.EARTHQUAKE;
  }
  if (/\b(fire|fires|wildfire|wildfires|blaze|blazes|inferno|burning|smoke)/.test(lower)) {
    return DisasterCategory.FIRE;
  }
  if (/\b(cyclone|cyclones|hurricane|hurricanes|typhoon|typhoons|storm|storms|tempest|gale)/.test(lower)) {
    return DisasterCategory.CYCLONE;
  }
  if (/\b(landslide|landslides|mudslide|mudslides|rockfall|rockfalls|debris)/.test(lower)) {
    return DisasterCategory.LANDSLIDE;
  }
  return null;
}

@Injectable()
export class AnalysisService {
  private readonly logger = new Logger(AnalysisService.name);
  private readonly enableDemoFallback: boolean;

  constructor(
    private readonly prisma: PrismaService,
    private readonly mlClient: MlClientService,
    private readonly config: ConfigService,
  ) {
    this.enableDemoFallback =
      this.config.get<string>("ENABLE_DEMO_FALLBACK") === "true";
  }

  async getModelInfo() {
    return this.mlClient.getModelInfo();
  }

  async analyzeReport(reportId: string) {
    const report = await this.prisma.disasterReport.findUnique({
      where: { id: reportId },
    });

    if (!report) {
      throw new NotFoundException(`Disaster report with ID ${reportId} not found.`);
    }

    if (!report.originalText || !report.originalText.trim()) {
      throw new BadRequestException("Report text cannot be blank or whitespace-only.");
    }

    let predictionResult: {
      predictedLabel: PredictedLabel;
      probability: number;
      decisionThreshold: number;
      suggestedCategory: DisasterCategory | null;
      modelName: string;
      modelVersion: string;
      preprocessingVersion: string;
      inferenceStatus: InferenceStatus;
      metadata: Record<string, unknown>;
      isSynthetic: boolean;
    };

    try {
      // 1. Primary: Real BiLSTM inference via FastAPI microservice
      const mlRes = await this.mlClient.predict(report.originalText, report.id);

      predictionResult = {
        predictedLabel:
          mlRes.prediction === "DISASTER_RELATED"
            ? PredictedLabel.DISASTER_RELATED
            : PredictedLabel.NOT_DISASTER_RELATED,
        probability: mlRes.probability,
        decisionThreshold: mlRes.decision_threshold,
        suggestedCategory: inferCategoryFromText(report.originalText),
        modelName: mlRes.model_name,
        modelVersion: mlRes.model_version,
        preprocessingVersion: mlRes.preprocessing_version,
        inferenceStatus: InferenceStatus.COMPLETED,
        metadata: {
          analysisMode: "ML",
          isSynthetic: false,
          confidence: mlRes.confidence,
          preprocessingParity: mlRes.preprocessing_parity,
          inferenceDurationMs: mlRes.inference_duration_ms,
          sequenceLength: mlRes.sequence_length,
          tokens: mlRes.tokens,
          threshold: mlRes.decision_threshold,
        },
        isSynthetic: false,
      };
    } catch (mlErr: any) {
      this.logger.error(
        `ML microservice inference failed for report ${reportId}: ${mlErr.message}`
      );

      if (this.enableDemoFallback) {
        this.logger.warn(
          `ENABLE_DEMO_FALLBACK=true: falling back to rule-based heuristic for report ${reportId}`
        );
        const demo = classifyDemoText(report.originalText);
        predictionResult = {
          predictedLabel: demo.predictedLabel,
          probability: demo.probability,
          decisionThreshold: demo.decisionThreshold,
          suggestedCategory: demo.suggestedCategory,
          modelName: "RuleBasedDemoClassifier-Fallback",
          modelVersion: "1.0.0-fallback",
          preprocessingVersion: "1.0.0",
          inferenceStatus: InferenceStatus.COMPLETED,
          metadata: {
            ...demo.metadata,
            analysisMode: "DEMO_FALLBACK",
            isSynthetic: true,
            fallbackReason: mlErr.message,
          },
          isSynthetic: true,
        };
      } else {
        throw new ServiceUnavailableException(
          `ML Inference service unavailable. Neural model inference could not be completed: ${mlErr.message}`
        );
      }
    }

    // 2. Persist analysis record in PostgreSQL
    const analysis = await this.prisma.analysis.create({
      data: {
        reportId: report.id,
        predictedLabel: predictionResult.predictedLabel,
        probability: predictionResult.probability,
        decisionThreshold: predictionResult.decisionThreshold,
        suggestedCategory: predictionResult.suggestedCategory,
        modelName: predictionResult.modelName,
        modelVersion: predictionResult.modelVersion,
        preprocessingVersion: predictionResult.preprocessingVersion,
        inferenceStatus: predictionResult.inferenceStatus,
        metadata: predictionResult.metadata as Prisma.InputJsonValue,
      },
    });

    // 3. Write immutable audit log
    try {
      await this.prisma.auditLog.create({
        data: {
          action: AuditAction.ANALYSIS_RECORDED,
          entityType: "Analysis",
          entityId: analysis.id,
          metadata: {
            reportId: report.id,
            predictedLabel: analysis.predictedLabel,
            probability: analysis.probability,
            modelName: analysis.modelName,
            isSynthetic: predictionResult.isSynthetic,
          },
        },
      });
    } catch (auditErr) {
      this.logger.warn(
        `Failed to write audit log for analysis ${analysis.id}: ${auditErr}`
      );
    }

    const confidence =
      predictionResult.predictedLabel === PredictedLabel.DISASTER_RELATED
        ? analysis.probability
        : Number((1 - analysis.probability).toFixed(4));

    return {
      id: analysis.id,
      reportId: analysis.reportId,
      predictedClass:
        analysis.predictedLabel === PredictedLabel.DISASTER_RELATED
          ? "disaster-related"
          : "not-disaster-related",
      confidence,
      disasterProbability: analysis.probability,
      notDisasterProbability: Number((1 - analysis.probability).toFixed(4)),
      suggestedCategory: analysis.suggestedCategory?.toLowerCase() || null,
      decisionThreshold: analysis.decisionThreshold,
      modelName: analysis.modelName,
      modelVersion: analysis.modelVersion,
      preprocessingVersion: analysis.preprocessingVersion,
      inferenceStatus: analysis.inferenceStatus,
      createdAt: analysis.createdAt.toISOString(),
      metadata: analysis.metadata,
      isSynthetic: predictionResult.isSynthetic,
    };
  }

  async analyzeBatch(dto: BatchAnalysisDto) {
    const items = dto.items.map((i) => ({
      text: i.text.trim(),
      request_id: i.requestId,
    }));

    const result = await this.mlClient.predictBatch(items);

    return {
      totalItems: result.total_items,
      batchDurationMs: result.batch_duration_ms,
      modelName: result.predictions[0]?.model_name || "AapdaWatch_BiLSTM",
      predictions: result.predictions.map((p) => ({
        requestId: p.request_id,
        predictedClass:
          p.prediction === "DISASTER_RELATED"
            ? "disaster-related"
            : "not-disaster-related",
        probability: p.probability,
        confidence: p.confidence,
        decisionThreshold: p.decision_threshold,
        modelName: p.model_name,
        modelVersion: p.model_version,
        suggestedCategory: inferCategoryFromText(
          items.find((it) => it.request_id === p.request_id)?.text || ""
        )?.toLowerCase() || null,
        isSynthetic: false,
      })),
    };
  }

  async getAnalysisByReport(reportId: string) {
    const report = await this.prisma.disasterReport.findUnique({
      where: { id: reportId },
      include: {
        analyses: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!report) {
      throw new NotFoundException(`Disaster report with ID ${reportId} not found.`);
    }

    if (report.analyses.length === 0) {
      return this.analyzeReport(reportId);
    }

    const latest = report.analyses[0];
    const meta = (latest.metadata as Record<string, unknown>) || {};
    const isSynthetic = meta.isSynthetic === true;

    return {
      id: latest.id,
      reportId: latest.reportId,
      predictedClass:
        latest.predictedLabel === "DISASTER_RELATED"
          ? "disaster-related"
          : "not-disaster-related",
      confidence:
        latest.predictedLabel === "DISASTER_RELATED"
          ? latest.probability
          : Number((1 - latest.probability).toFixed(4)),
      disasterProbability: latest.probability,
      notDisasterProbability: Number((1 - latest.probability).toFixed(4)),
      suggestedCategory: latest.suggestedCategory?.toLowerCase() || null,
      decisionThreshold: latest.decisionThreshold,
      modelName: latest.modelName,
      modelVersion: latest.modelVersion,
      preprocessingVersion: latest.preprocessingVersion,
      inferenceStatus: latest.inferenceStatus,
      createdAt: latest.createdAt.toISOString(),
      metadata: latest.metadata,
      isSynthetic,
      allAnalyses: report.analyses,
    };
  }

  async getAnalysisHistory(reportId: string) {
    const report = await this.prisma.disasterReport.findUnique({
      where: { id: reportId },
      include: {
        analyses: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!report) {
      throw new NotFoundException(`Disaster report with ID ${reportId} not found.`);
    }

    return report.analyses.map((a) => {
      const meta = (a.metadata as Record<string, unknown>) || {};
      return {
        id: a.id,
        reportId: a.reportId,
        predictedClass:
          a.predictedLabel === "DISASTER_RELATED"
            ? "disaster-related"
            : "not-disaster-related",
        probability: a.probability,
        confidence:
          a.predictedLabel === "DISASTER_RELATED"
            ? a.probability
            : Number((1 - a.probability).toFixed(4)),
        decisionThreshold: a.decisionThreshold,
        suggestedCategory: a.suggestedCategory?.toLowerCase() || null,
        modelName: a.modelName,
        modelVersion: a.modelVersion,
        inferenceStatus: a.inferenceStatus,
        createdAt: a.createdAt.toISOString(),
        isSynthetic: meta.isSynthetic === true,
      };
    });
  }

  async findAll(page = 1, limit = 20) {
    const skip = (Math.max(1, page) - 1) * Math.min(100, Math.max(1, limit));
    const take = Math.min(100, Math.max(1, limit));

    const [total, items] = await Promise.all([
      this.prisma.analysis.count(),
      this.prisma.analysis.findMany({
        skip,
        take,
        orderBy: { createdAt: "desc" },
        include: {
          report: {
            select: {
              id: true,
              originalText: true,
              locationName: true,
              submittedAt: true,
            },
          },
        },
      }),
    ]);

    return {
      items: items.map((a) => ({
        id: a.id,
        reportId: a.reportId,
        reportTextPreview: a.report.originalText.slice(0, 100),
        locationName: a.report.locationName,
        predictedClass:
          a.predictedLabel === "DISASTER_RELATED"
            ? "disaster-related"
            : "not-disaster-related",
        probability: a.probability,
        category: a.suggestedCategory?.toLowerCase() || null,
        modelName: a.modelName,
        modelVersion: a.modelVersion,
        createdAt: a.createdAt.toISOString(),
      })),
      total,
      page,
      limit: take,
      totalPages: Math.ceil(total / take),
    };
  }
}
