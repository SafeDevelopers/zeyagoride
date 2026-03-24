/**
 * Transport-ready realtime client (WebSocket / Socket.IO / SSE gateway).
 * Does not open a network connection until you wire `connect()` to your stack.
 *
 * WebSocket / Socket.IO: replace the `// TODO(realtime)` block in `RealtimeTransport.connect`
 * with `new WebSocket(url)` or `io(url, { auth: { token } })`, then route `onmessage` /
 * socket events through `dispatchChannelMessage` → `applyGatewayPayloadToRideEvents`.
 *
 * Use `RIDE_EVENTS_CHANNEL` / `DRIVER_REQUESTS_CHANNEL` from `contracts/backendContract.ts` when joining NestJS rooms.
 */

import { GATEWAY_PAYLOAD_KIND } from '../../contracts/backendContract';
import {
  emitMockDriverRequestEvent,
  emitMockRideEvent,
  type DriverRequestEvent,
  type RideEvent,
} from '../rides/rideEvents';
import type { RealtimeReconnectStrategyName } from '../../config/env';
import {
  REALTIME_ENABLED,
  REALTIME_MAX_RECONNECT_ATTEMPTS,
  REALTIME_RECONNECT_BASE_DELAY_MS,
  REALTIME_RECONNECT_STRATEGY,
  REALTIME_URL,
} from '../../config/env';

export type { RealtimeReconnectStrategyName as RealtimeReconnectStrategy } from '../../config/env';

export interface RealtimeClientConfig {
  /** Gateway base URL (ws/wss or HTTP upgrade URL — product-specific). */
  url: string;
  /** Access token for `Authorization` / socket `auth` — wire to your session store. */
  getAccessToken?: () => string | null;
  reconnectStrategy?: RealtimeReconnectStrategyName;
  reconnectBaseDelayMs?: number;
  maxReconnectAttempts?: number;
}

export interface RealtimeClient {
  connect(): void;
  disconnect(): void;
  /** Subscribe to a logical channel (e.g. `ride:123`, `driver:requests`). */
  subscribe(channel: string, handler: (message: unknown) => void): () => void;
  /** Remove a handler previously passed to `subscribe`. */
  unsubscribe(channel: string, handler: (message: unknown) => void): void;
  /** Fan-out to channel subscribers (used when gateway delivers a message). */
  dispatchChannelMessage(channel: string, message: unknown): void;
}

type Handler = (message: unknown) => void;

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** Map gateway JSON into `rideEvents` emitters (`source: 'live'`). */
export function applyGatewayPayloadToRideEvents(payload: unknown): void {
  if (!isRecord(payload)) return;
  const kind = payload.kind;
  if (kind === GATEWAY_PAYLOAD_KIND.RIDE && typeof payload.rideId === 'string' && typeof payload.eventType === 'string') {
    const ride = payload.ride as RideEvent['ride'] | undefined;
    const t = payload.eventType as RideEvent['type'];
    emitMockRideEvent({
      type: t,
      rideId: payload.rideId,
      ride,
      occurredAt: typeof payload.occurredAt === 'string' ? payload.occurredAt : undefined,
      source: 'live',
    });
    return;
  }
  if (kind === GATEWAY_PAYLOAD_KIND.DRIVER_REQUEST && typeof payload.eventType === 'string') {
    emitMockDriverRequestEvent({
      type: payload.eventType as DriverRequestEvent['type'],
      requestId: typeof payload.requestId === 'string' ? payload.requestId : undefined,
      pickup: typeof payload.pickup === 'string' ? payload.pickup : undefined,
      destination: typeof payload.destination === 'string' ? payload.destination : undefined,
      earning: typeof payload.earning === 'string' ? payload.earning : undefined,
      occurredAt: typeof payload.occurredAt === 'string' ? payload.occurredAt : undefined,
      source: 'live',
    });
  }
}

/** Mock/local: no socket; ride traffic stays in-memory via existing mock + polling. */
class MockRealtimeClient implements RealtimeClient {
  private readonly channels = new Map<string, Set<Handler>>();

  connect(): void {
    /* intentionally empty — events come from mock services + rideEvents */
  }

  disconnect(): void {
    this.channels.clear();
  }

  subscribe(channel: string, handler: Handler): () => void {
    let set = this.channels.get(channel);
    if (!set) {
      set = new Set();
      this.channels.set(channel, set);
    }
    set.add(handler);
    return () => this.unsubscribe(channel, handler);
  }

  unsubscribe(channel: string, handler: Handler): void {
    const set = this.channels.get(channel);
    if (!set) return;
    set.delete(handler);
    if (set.size === 0) this.channels.delete(channel);
  }

  dispatchChannelMessage(channel: string, message: unknown): void {
    const set = this.channels.get(channel);
    if (!set) return;
    for (const h of set) {
      h(message);
    }
  }
}

/**
 * Realtime placeholder: holds subscribers and config; `connect()` is where WebSocket/Socket.IO attaches.
 * Incoming frames should call `dispatchChannelMessage` or `applyGatewayPayloadToRideEvents`.
 */
class RealtimeTransport implements RealtimeClient {
  private readonly channels = new Map<string, Set<Handler>>();
  private readonly config: RealtimeClientConfig;
  private connected = false;

  constructor(config: RealtimeClientConfig) {
    this.config = config;
  }

  connect(): void {
    if (this.connected) return;
    this.connected = true;
    this.openSocket();
  }

  disconnect(): void {
    this.connected = false;
    // TODO(realtime): close WebSocket / socket.io connection here
    this.channels.clear();
  }

  subscribe(channel: string, handler: Handler): () => void {
    let set = this.channels.get(channel);
    if (!set) {
      set = new Set();
      this.channels.set(channel, set);
    }
    set.add(handler);
    return () => this.unsubscribe(channel, handler);
  }

  unsubscribe(channel: string, handler: Handler): void {
    const set = this.channels.get(channel);
    if (!set) return;
    set.delete(handler);
    if (set.size === 0) this.channels.delete(channel);
  }

  /** Forward a decoded message to all subscribers of `channel`. */
  dispatchChannelMessage(channel: string, message: unknown): void {
    const set = this.channels.get(channel);
    if (!set) return;
    for (const h of set) {
      h(message);
    }
  }

  /**
   * Wire transport here:
   * - `new WebSocket(this.config.url)` — token often via query `?access_token=` or first message auth.
   * - Socket.IO: `io(this.config.url, { auth: { token: this.config.getAccessToken?.() } })`.
   * On message: `applyGatewayPayloadToRideEvents(JSON.parse(data))` and/or `dispatchChannelMessage(channel, parsed)`.
   * Reconnect: use `REALTIME_RECONNECT_*` env and `RealtimeClientConfig` when implementing backoff.
   */
  private openSocket(): void {
    const c = this.config;
    void c.url;
    void c.reconnectStrategy;
    void c.reconnectBaseDelayMs;
    void c.maxReconnectAttempts;
    void c.getAccessToken?.();

    // TODO(realtime): attach WebSocket / Socket.IO; no network I/O until implemented.
  }
}

let singleton: RealtimeClient | null = null;

export function getRealtimeClient(): RealtimeClient {
  if (singleton) return singleton;
  const config: RealtimeClientConfig = {
    url: REALTIME_URL,
    reconnectStrategy: REALTIME_RECONNECT_STRATEGY,
    reconnectBaseDelayMs: REALTIME_RECONNECT_BASE_DELAY_MS,
    maxReconnectAttempts: REALTIME_MAX_RECONNECT_ATTEMPTS,
    getAccessToken: () => {
      // TODO(realtime): return session access token from auth/session module
      return (import.meta.env.VITE_REALTIME_DEV_TOKEN as string | undefined)?.trim() || null;
    },
  };
  singleton = REALTIME_ENABLED ? new RealtimeTransport(config) : new MockRealtimeClient();
  return singleton;
}

/** Reset singleton (e.g. tests). */
export function resetRealtimeClientForTests(): void {
  singleton?.disconnect();
  singleton = null;
}
