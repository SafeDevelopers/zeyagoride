import * as path from 'path';
import { config as loadEnv } from 'dotenv';

/**
 * Load env files in order (later overrides earlier).
 *
 * Monorepo layout: repo root `.env` holds shared secrets (e.g. `DATABASE_URL`); `backend/.env`
 * overrides for Nest-only vars (`PORT`, `DEMO_*`, etc.).
 *
 * Files:
 * - `../.env`, `../.env.local` — project root (Vite + Postgres URL)
 * - `backend/.env`, `backend/.env.local`, `backend/.env.<NODE_ENV>`
 */
export function loadBackendEnv(backendRoot: string): void {
  const repoRoot = path.join(backendRoot, '..');
  const nodeEnv = process.env.NODE_ENV || 'development';
  const files = [
    path.join(repoRoot, '.env'),
    path.join(repoRoot, '.env.local'),
    path.join(backendRoot, '.env'),
    path.join(backendRoot, '.env.local'),
    path.join(backendRoot, `.env.${nodeEnv}`),
  ];
  for (const file of files) {
    loadEnv({ path: file, override: true });
  }
}
