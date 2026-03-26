import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';
import type { AuthenticatedRequest } from '../auth/authenticated-request';
import { StructuredLogger } from './structured-logger';

@Catch()
export class HttpExceptionLoggingFilter implements ExceptionFilter {
  private readonly logger = new StructuredLogger(HttpExceptionLoggingFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<AuthenticatedRequest>();
    const res = ctx.getResponse<Response>();

    const isHttp = exception instanceof HttpException;
    const status = isHttp ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const payload = isHttp
      ? exception.getResponse()
      : { message: 'Internal server error' };

    if (status >= 500) {
      this.logger.error('http.request_failed', exception, {
        method: req.method,
        path: req.originalUrl ?? req.url,
        statusCode: status,
        actorId: req.user?.id ?? null,
        actorRole: req.user?.role ?? null,
      });
    } else {
      this.logger.warn('http.request_rejected', {
        method: req.method,
        path: req.originalUrl ?? req.url,
        statusCode: status,
        actorId: req.user?.id ?? null,
        actorRole: req.user?.role ?? null,
        error: payload,
      });
    }

    res.status(status).json(payload);
  }
}
