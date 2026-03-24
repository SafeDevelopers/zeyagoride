/**
 * Mobile app environment — Vite exposes only `VITE_*` variables to the client bundle.
 */

function parseBoolEnv(raw: string | undefined, defaultValue: boolean): boolean {
  if (raw === undefined || raw === '') return defaultValue;
  const v = raw.toLowerCase();
  if (v === 'true' || v === '1' || v === 'yes') return true;
  if (v === 'false' || v === '0' || v === 'no') return false;
  return defaultValue;
}

/** Mapbox public access token (client-side). Required for interactive maps. */
export const MAPBOX_ACCESS_TOKEN =
  (import.meta.env.VITE_MAPBOX_ACCESS_TOKEN as string | undefined)?.trim() ?? '';

/** Base URL for the REST API (no trailing slash). Example: `https://api.example.com` */
export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') ?? '';

/** Request timeout in milliseconds (AbortSignal). */
const rawTimeout = Number(import.meta.env.VITE_API_TIMEOUT_MS ?? 30_000);
export const API_TIMEOUT_MS = Number.isFinite(rawTimeout) && rawTimeout > 0 ? rawTimeout : 30_000;

/**
 * When `true`, domain services use in-app mocks (current demo behavior).
 * When `false`, services call `request()` against `API_BASE_URL`.
 */
export const USE_MOCK_API = parseBoolEnv(import.meta.env.VITE_USE_MOCK_API as string | undefined, true);

/**
 * When `USE_MOCK_API` is false and the app runs in dev, fall back to in-app mocks only if the
 * backend is unreachable (network/timeout). Default: enabled in dev so local work continues when
 * Nest is stopped; set `VITE_API_DEV_FALLBACK_MOCK=false` to always surface connection errors.
 */
export const API_DEV_FALLBACK_TO_MOCK = parseBoolEnv(
  import.meta.env.VITE_API_DEV_FALLBACK_MOCK as string | undefined,
  import.meta.env.DEV,
);

/**
 * Demo-only: after `driver_assigned`, auto-advance the same ride through arrived → in progress → completed
 * (mock in-memory store or Nest in-memory store). Defaults on when `USE_MOCK_API` is true; set
 * `VITE_DEMO_AUTO_TRIP_PROGRESS=false` to follow explicit driver/API transitions only.
 */
export const DEMO_AUTO_TRIP_PROGRESS = parseBoolEnv(
  import.meta.env.VITE_DEMO_AUTO_TRIP_PROGRESS as string | undefined,
  USE_MOCK_API,
);

/** When `true`, `getRealtimeClient()` uses the transport placeholder (still no network until wired). When `false`, mock in-memory bus only. */
export const REALTIME_ENABLED = parseBoolEnv(import.meta.env.VITE_REALTIME_ENABLED as string | undefined, false);

/** WebSocket / Socket.IO / SSE gateway URL (env-ready placeholder). */
export const REALTIME_URL =
  (import.meta.env.VITE_REALTIME_URL as string | undefined)?.trim().replace(/\/$/, '') ?? '';

export type RealtimeReconnectStrategyName = 'exponential' | 'fixed' | 'none';

function parseReconnectStrategy(raw: string | undefined): RealtimeReconnectStrategyName {
  const v = (raw ?? 'none').toLowerCase();
  if (v === 'exponential' || v === 'fixed' || v === 'none') return v;
  return 'none';
}

/** Backoff policy for future reconnect loops (used when implementing `openSocket`). */
export const REALTIME_RECONNECT_STRATEGY = parseReconnectStrategy(
  import.meta.env.VITE_REALTIME_RECONNECT_STRATEGY as string | undefined,
);

const rawRealtimeBase = Number(import.meta.env.VITE_REALTIME_RECONNECT_BASE_DELAY_MS ?? 2000);
export const REALTIME_RECONNECT_BASE_DELAY_MS =
  Number.isFinite(rawRealtimeBase) && rawRealtimeBase > 0 ? rawRealtimeBase : 2000;

const rawRealtimeMax = Number(import.meta.env.VITE_REALTIME_MAX_RECONNECT_ATTEMPTS ?? 8);
export const REALTIME_MAX_RECONNECT_ATTEMPTS =
  Number.isFinite(rawRealtimeMax) && rawRealtimeMax > 0 ? Math.floor(rawRealtimeMax) : 8;
