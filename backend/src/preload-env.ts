/**
 * Must run before `AppModule` is loaded: `ConfigModule` validates `process.env` at import time.
 * Root `.env` + `backend/.env` are applied here so `DATABASE_URL` exists before validation.
 */
import * as path from 'path';
import { loadBackendEnv } from './config/load-env';

const backendRoot = path.resolve(__dirname, '..');
loadBackendEnv(backendRoot);
