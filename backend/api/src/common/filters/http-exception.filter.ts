import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { Request, Response } from "express";

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = "An internal server error occurred.";
    let errorType = "InternalServerError";
    let details: unknown = null;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();

      if (typeof res === "string") {
        message = res;
      } else if (typeof res === "object" && res !== null) {
        const resObj = res as Record<string, unknown>;
        message = (resObj.message as string) || exception.message;
        errorType = (resObj.error as string) || exception.name;
        details = resObj.message instanceof Array ? resObj.message : null;
      }
    } else if (exception instanceof Error) {
      // In development, log the full error message
      this.logger.error(`Unhandled Exception: ${exception.message}`, exception.stack);
      if (process.env.NODE_ENV === "development") {
        message = exception.message;
      }
    }

    // Do NOT expose stack traces in production responses
    response.status(status).json({
      success: false,
      statusCode: status,
      error: errorType,
      message,
      details,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}

