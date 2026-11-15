import {
  Injectable,
  Logger,
  ServiceUnavailableException,
  BadRequestException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

export interface MlPredictionResult {
  prediction: "DISASTER_RELATED" | "NOT_DISASTER_RELATED";
  probability: number;
  confidence: number;
  decision_threshold: number;
  model_name: string;
  model_version: string;
  inference_status: "SUCCESS" | "FAILED";
  analysis_mode: "ML";
  is_synthetic: boolean;
  preprocessing_version: string;
  preprocessing_parity: string;
  inference_duration_ms: number;
  tokens: number[];
  sequence_length: number;
  request_id?: string;
}

export interface MlBatchPredictionResult {
  predictions: MlPredictionResult[];
  total_items: number;
  batch_duration_ms: number;
}

@Injectable()
export class MlClientService {
  private readonly logger = new Logger(MlClientService.name);
  private readonly mlServiceUrl: string;
  private readonly timeoutMs: number;

  constructor(private readonly config: ConfigService) {
    this.mlServiceUrl =
      this.config.get<string>("ML_SERVICE_URL") || "http://localhost:8001";
    this.timeoutMs = Number(
      this.config.get<number>("ML_SERVICE_TIMEOUT_MS") || 3000
    );
  }

  getServiceUrl(): string {
    return this.mlServiceUrl;
  }

  async predict(text: string, reportId?: string): Promise<MlPredictionResult> {
    const url = `${this.mlServiceUrl}/predict`;

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          text,
          request_id: reportId,
        }),
        signal: AbortSignal.timeout(this.timeoutMs),
      });

      if (!response.ok) {
        let errJson: any = {};
        try {
          errJson = await response.json();
        } catch {
          // not JSON
        }

        const detail = errJson.detail || response.statusText;

        if (response.status === 400 || response.status === 422) {
          throw new BadRequestException(`ML Service input validation error: ${detail}`);
        }

        if (response.status === 503) {
          throw new ServiceUnavailableException(`ML Service is not ready: ${detail}`);
        }

        throw new ServiceUnavailableException(
          `ML Service returned unexpected HTTP ${response.status}: ${detail}`
        );
      }

      const data = (await response.json()) as MlPredictionResult;

      // Validate required response fields
      if (
        typeof data.probability !== "number" ||
        !["DISASTER_RELATED", "NOT_DISASTER_RELATED"].includes(data.prediction)
      ) {
        throw new Error("ML Service returned invalid prediction contract structure");
      }

      return data;
    } catch (err: any) {
      if (err instanceof BadRequestException) {
        throw err;
      }

      const isTimeout = err.name === "TimeoutError" || err.name === "AbortError";
      const isConnRefused = err.cause?.code === "ECONNREFUSED" || err.message?.includes("fetch failed");

      if (isTimeout) {
        this.logger.error(`ML Service timed out after ${this.timeoutMs}ms calling ${url}`);
        throw new ServiceUnavailableException(
          `ML Service request timed out after ${this.timeoutMs}ms.`
        );
      }

      if (isConnRefused) {
        this.logger.error(`ML Service connection refused at ${url}`);
        throw new ServiceUnavailableException(
          `Cannot connect to ML Service at ${this.mlServiceUrl}. Ensure FastAPI microservice is running.`
        );
      }

      this.logger.error(`ML Service communication failure: ${err.message}`, err.stack);
      throw new ServiceUnavailableException(
        `ML Service communication error: ${err.message}`
      );
    }
  }

  async predictBatch(
    items: { text: string; request_id?: string }[]
  ): Promise<MlBatchPredictionResult> {
    const url = `${this.mlServiceUrl}/predict/batch`;

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ items }),
        signal: AbortSignal.timeout(Math.max(this.timeoutMs * 2, items.length * 500)),
      });

      if (!response.ok) {
        let errJson: any = {};
        try {
          errJson = await response.json();
        } catch {}
        const detail = errJson.detail || response.statusText;
        throw new ServiceUnavailableException(`ML Service batch prediction error: ${detail}`);
      }

      return (await response.json()) as MlBatchPredictionResult;
    } catch (err: any) {
      if (err instanceof BadRequestException || err instanceof ServiceUnavailableException) {
        throw err;
      }
      this.logger.error(`ML Service batch communication failure: ${err.message}`);
      throw new ServiceUnavailableException(
        `ML Service batch error: ${err.message}`
      );
    }
  }

  async checkHealth(): Promise<{ status: string; modelLoaded: boolean; backend?: string }> {
    const url = `${this.mlServiceUrl}/health`;
    try {
      const res = await fetch(url, {
        signal: AbortSignal.timeout(2000),
      });
      if (res.ok) {
        const data = await res.json();
        return {
          status: data.status || "healthy",
          modelLoaded: !!data.model_loaded,
          backend: data.backend,
        };
      }
      return { status: "degraded", modelLoaded: false };
    } catch {
      return { status: "unreachable", modelLoaded: false };
    }
  }

  async getModelInfo(): Promise<any> {
    const url = `${this.mlServiceUrl}/model/info`;
    const res = await fetch(url, {
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) {
      throw new ServiceUnavailableException(`ML Service info unavailable (${res.status})`);
    }
    return res.json();
  }
}

