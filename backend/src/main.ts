import * as path from 'path';
import { config as loadEnv } from 'dotenv';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

/** Load `backend/.env` so `PORT` matches root `NEST_API_PORT` / `VITE_API_BASE_URL`. */
loadEnv({ path: path.resolve(__dirname, '..', '.env') });

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidUnknownValues: false,
    }),
  );
  const corsOrigins =
    process.env.CORS_ORIGINS?.split(',').map((s) => s.trim()).filter(Boolean) ?? [
      'http://localhost:5173',
      'http://127.0.0.1:5173',
    ];
  app.enableCors({
    origin: corsOrigins,
    credentials: true,
  });
  const port = process.env.PORT ?? 3000;
  await app.listen(port);
}

void bootstrap();
