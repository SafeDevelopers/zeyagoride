import { API_DEV_FALLBACK_TO_MOCK, USE_MOCK_API } from '../../config/env';
import { isApiClientError } from './client';

/**
 * True when the client could not reach the server (no HTTP response).
 * Does not treat 4xx/5xx as unreachable — those surface as normal API errors.
 */
export function isUnreachableApiError(e: unknown): boolean {
  if (isApiClientError(e)) {
    return e.status === null && (e.code === 'network_error' || e.code === 'timeout');
  }
  return e instanceof TypeError;
}

/** When using the real API in dev, optionally fall back to in-app mocks if the backend is down. */
export function shouldDevFallbackToMock(e: unknown): boolean {
  if (USE_MOCK_API) return false;
  if (!import.meta.env.DEV) return false;
  if (!API_DEV_FALLBACK_TO_MOCK) return false;
  return isUnreachableApiError(e);
}
