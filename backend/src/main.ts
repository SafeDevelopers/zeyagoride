import './preload-env';
import { randomUUID } from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import type { Request, Response, NextFunction } from 'express';
import { HttpExceptionLoggingFilter } from './common/logging/http-exception.filter';
import { runWithRequestContext } from './common/logging/request-context';
import { StructuredLogger } from './common/logging/structured-logger';

async function bootstrap() {
  const logger = new StructuredLogger('bootstrap');
  try {
    const app = await NestFactory.create(AppModule, { bufferLogs: true });

    app.use((req: Request & { requestId?: string }, res: Response, next: NextFunction) => {
      const requestId = (req.headers['x-request-id'] as string | undefined)?.trim() || randomUUID();
      req.requestId = requestId;
      res.setHeader('x-request-id', requestId);
      const startedAt = Date.now();
      runWithRequestContext({ requestId }, () => {
        res.on('finish', () => {
          logger.log('http.request_completed', {
            method: req.method,
            path: req.originalUrl ?? req.url,
            statusCode: res.statusCode,
            durationMs: Date.now() - startedAt,
          });
        });
        next();
      });
    });

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidUnknownValues: false,
      }),
    );
    app.useGlobalFilters(new HttpExceptionLoggingFilter());

    const config = app.get(ConfigService);
    const configured = config
      .get<string>('CORS_ORIGINS')
      ?.split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const corsOrigins =
      configured && configured.length > 0
        ? configured
        : [config.get<string>('APP_PUBLIC_URL')].filter((x): x is string => Boolean(x && x.trim()));
    if (corsOrigins.length === 0) {
      corsOrigins.push('http://localhost:5173', 'http://127.0.0.1:5173');
    }
    app.enableCors({
      origin: corsOrigins,
      credentials: true,
    });

    const port = Number(config.get<string>('PORT')) || 3000;
    await app.listen(port);
    logger.log('app.started', {
      port,
      env: config.get<string>('NODE_ENV', 'development'),
      corsOrigins,
    });
  } catch (error) {
    logger.error('app.start_failed', error);
    throw error;
  }
}

void bootstrap();
