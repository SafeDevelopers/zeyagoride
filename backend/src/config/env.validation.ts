import { plainToInstance } from 'class-transformer';
import { IsIn, IsNotEmpty, IsOptional, IsString, validateSync } from 'class-validator';

/**
 * Validated subset of process.env. Used by ConfigModule `validate` — no business logic.
 */
export class EnvironmentVariables {
  @IsNotEmpty({ message: 'DATABASE_URL is required (PostgreSQL connection string)' })
  @IsString()
  DATABASE_URL!: string;

  /** Optional: duplicate DATABASE_URL locally; use direct non-pooled URL when using PgBouncer in production. */
  @IsOptional()
  @IsString()
  DIRECT_URL?: string;

  @IsOptional()
  @IsString()
  PORT?: string;

  @IsOptional()
  @IsString()
  NODE_ENV?: string;

  @IsNotEmpty({ message: 'JWT_SECRET is required for signed access tokens' })
  @IsString()
  JWT_SECRET!: string;

  @IsOptional()
  @IsString()
  ACCESS_TOKEN_TTL_SECONDS?: string;

  @IsOptional()
  @IsString()
  REFRESH_TOKEN_TTL_SECONDS?: string;

  @IsOptional()
  @IsString()
  ADMIN_PHONE_NUMBERS?: string;

  @IsOptional()
  @IsString()
  AUTH_ALLOW_TEST_OTP?: string;

  @IsOptional()
  @IsString()
  AUTH_TEST_OTP_CODE?: string;

  @IsOptional()
  @IsString()
  NOTIFICATION_PROVIDER?: string;

  /** Comma-separated browser origins allowed for CORS (e.g. Vite dev server). */
  @IsOptional()
  @IsString()
  CORS_ORIGINS?: string;

  /** Public base URL of this API (no trailing slash). Used in responses and storage URLs. */
  @IsOptional()
  @IsString()
  API_PUBLIC_URL?: string;

  /** Public URL of the rider/driver web app (redirects / deep links). */
  @IsOptional()
  @IsString()
  APP_PUBLIC_URL?: string;

  /** Public URL of the admin UI. */
  @IsOptional()
  @IsString()
  ADMIN_PUBLIC_URL?: string;

  @IsOptional()
  @IsString()
  STORAGE_DRIVER?: string;

  /** Base URL for publicly reachable stored objects (no trailing slash). */
  @IsOptional()
  @IsString()
  STORAGE_PUBLIC_BASE_URL?: string;

  /** Root directory for STORAGE_DRIVER=local (absolute or relative to cwd). */
  @IsOptional()
  @IsString()
  STORAGE_LOCAL_ROOT?: string;

  @IsOptional()
  @IsString()
  S3_ENDPOINT?: string;

  @IsOptional()
  @IsString()
  S3_REGION?: string;

  @IsOptional()
  @IsString()
  S3_BUCKET?: string;

  @IsOptional()
  @IsString()
  S3_ACCESS_KEY?: string;

  @IsOptional()
  @IsString()
  S3_SECRET_KEY?: string;

  /** "true" | "false" — typical for MinIO path-style addressing. */
  @IsOptional()
  @IsString()
  S3_FORCE_PATH_STYLE?: string;
}

export function validateEnvConfig(config: Record<string, unknown>): EnvironmentVariables {
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validated, {
    skipMissingProperties: false,
    forbidUnknownValues: false,
  });
  if (errors.length > 0) {
    const messages = errors
      .map((e) => Object.values(e.constraints ?? {}).join('; '))
      .filter(Boolean);
    throw new Error(`Environment validation failed:\n${messages.join('\n')}`);
  }

  const driver = (validated.STORAGE_DRIVER ?? 'local').trim() || 'local';
  if (driver !== 'local' && driver !== 's3') {
    throw new Error('STORAGE_DRIVER must be "local" or "s3" (S3-compatible / MinIO).');
  }
  if (driver === 's3') {
    const missing: string[] = [];
    if (!validated.S3_ENDPOINT?.trim()) missing.push('S3_ENDPOINT');
    if (!validated.S3_BUCKET?.trim()) missing.push('S3_BUCKET');
    if (!validated.S3_ACCESS_KEY?.trim()) missing.push('S3_ACCESS_KEY');
    if (!validated.S3_SECRET_KEY?.trim()) missing.push('S3_SECRET_KEY');
    if (missing.length) {
      throw new Error(
        `STORAGE_DRIVER=s3 requires: ${missing.join(', ')}. Set these for MinIO/S3-compatible storage.`,
      );
    }
  }

  const notificationProvider = (validated.NOTIFICATION_PROVIDER ?? 'log').trim() || 'log';
  if (notificationProvider !== 'log') {
    throw new Error('NOTIFICATION_PROVIDER must be "log" until a real provider module is added.');
  }

  const accessTtl = Number(validated.ACCESS_TOKEN_TTL_SECONDS ?? '900');
  if (!Number.isFinite(accessTtl) || accessTtl < 60) {
    throw new Error('ACCESS_TOKEN_TTL_SECONDS must be a number >= 60.');
  }

  const refreshTtl = Number(validated.REFRESH_TOKEN_TTL_SECONDS ?? '2592000');
  if (!Number.isFinite(refreshTtl) || refreshTtl < 300) {
    throw new Error('REFRESH_TOKEN_TTL_SECONDS must be a number >= 300.');
  }

  const nodeEnv = (validated.NODE_ENV ?? 'development').trim().toLowerCase();
  const allowTestOtp = (validated.AUTH_ALLOW_TEST_OTP ?? (nodeEnv === 'production' ? 'false' : 'true')).trim().toLowerCase();
  if (!['true', 'false'].includes(allowTestOtp)) {
    throw new Error('AUTH_ALLOW_TEST_OTP must be "true" or "false".');
  }
  if (allowTestOtp === 'true' && !(validated.AUTH_TEST_OTP_CODE ?? '').trim()) {
    throw new Error('AUTH_TEST_OTP_CODE is required when AUTH_ALLOW_TEST_OTP=true.');
  }
  if (nodeEnv === 'production' && allowTestOtp === 'true') {
    throw new Error('AUTH_ALLOW_TEST_OTP must be false in production.');
  }

  return validated;
}
