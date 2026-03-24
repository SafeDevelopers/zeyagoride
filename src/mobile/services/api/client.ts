import { API_BASE_URL, API_TIMEOUT_MS } from '../../config/env';
import { getAccessToken } from '../sessionStorage';

/**
 * Normalized failure from `request()` (network, HTTP, parse).
 * TODO: refresh token/session handling — on 401, attempt refresh then retry once.
 */
export type ApiClientError = {
  readonly kind: 'api_client_error';
  readonly status: number | null;
  readonly code: string;
  readonly message: string;
  readonly body?: unknown;
};

export function isApiClientError(e: unknown): e is ApiClientError {
  return (
    typeof e === 'object' &&
    e !== null &&
    'kind' in e &&
    (e as ApiClientError).kind === 'api_client_error'
  );
}

function makeError(
  status: number | null,
  code: string,
  message: string,
  body?: unknown,
): ApiClientError {
  return { kind: 'api_client_error', status, code, message, body };
}

function getAuthToken(): string | null {
  return getAccessToken();
}

function joinUrl(base: string, path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`;
  if (!base) return p;
  return `${base}${p}`;
}

/**
 * Central HTTP wrapper for real backend calls.
 * Not used when `USE_MOCK_API` is true (mocks bypass this layer).
 */
export async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  headers?: Record<string, string>,
): Promise<T> {
  const url = joinUrl(API_BASE_URL, path);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

  const merged: Record<string, string> = {
    Accept: 'application/json',
    ...(headers ?? {}),
  };

  const token = getAuthToken();
  if (token) {
    merged.Authorization = `Bearer ${token}`;
  }

  const init: RequestInit = {
    method: method.toUpperCase(),
    signal: controller.signal,
    headers: merged,
  };

  const m = init.method ?? 'GET';
  if (body !== undefined && m !== 'GET' && m !== 'HEAD') {
    init.body = JSON.stringify(body);
    merged['Content-Type'] = 'application/json';
  }

  try {
    const res = await fetch(url, init);
    const text = await res.text();
    let parsed: unknown = undefined;
    if (text) {
      const ct = res.headers.get('content-type') ?? '';
      if (ct.includes('application/json')) {
        try {
          parsed = JSON.parse(text) as unknown;
        } catch {
          throw makeError(res.status, 'parse_error', 'Invalid JSON in response body', text);
        }
      } else {
        parsed = text;
      }
    }

    if (!res.ok) {
      const msg =
        typeof parsed === 'object' && parsed !== null && 'message' in parsed
          ? String((parsed as { message: unknown }).message)
          : res.statusText || 'Request failed';
      throw makeError(res.status, `http_${res.status}`, msg, parsed);
    }

    if (res.status === 204 || text === '') {
      return undefined as T;
    }

    return parsed as T;
  } catch (e) {
    if (isApiClientError(e)) throw e;
    if ((e instanceof Error || e instanceof DOMException) && (e as Error).name === 'AbortError') {
      throw makeError(null, 'timeout', `Request timed out after ${API_TIMEOUT_MS}ms`);
    }
    if (e instanceof TypeError) {
      throw makeError(null, 'network_error', e.message || 'Network error');
    }
    throw e;
  } finally {
    clearTimeout(timeoutId);
  }
}
