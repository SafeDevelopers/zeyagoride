/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_API_TIMEOUT_MS?: string;
  readonly VITE_USE_MOCK_API?: string;
  /** Dev-only: when `false`, never use mock services if the real API is unreachable. */
  readonly VITE_API_DEV_FALLBACK_MOCK?: string;
  /** Demo: timed ride phases after assign when not using `VITE_USE_MOCK_API` (requires backend `DEMO_AUTO_TRIP_PROGRESS` too). */
  readonly VITE_DEMO_AUTO_TRIP_PROGRESS?: string;
  readonly VITE_MAPBOX_ACCESS_TOKEN?: string;
  readonly VITE_REALTIME_ENABLED?: string;
  readonly VITE_REALTIME_URL?: string;
  readonly VITE_REALTIME_RECONNECT_STRATEGY?: string;
  readonly VITE_REALTIME_RECONNECT_BASE_DELAY_MS?: string;
  readonly VITE_REALTIME_MAX_RECONNECT_ATTEMPTS?: string;
  /** Dev-only token placeholder for future socket auth (never ship real secrets). */
  readonly VITE_REALTIME_DEV_TOKEN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module "*.png" {
  const value: string;
  export default value;
}
