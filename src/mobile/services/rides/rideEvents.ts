import type { RideStatus, RideSummary } from '../../types/api';
import { RIDE_EVENT, type DriverRequestEventName, type RideEventName } from '../../contracts/backendContract';

export type { DriverRequestEventName, RideEventName } from '../../contracts/backendContract';
export { DRIVER_REQUEST_EVENT, RIDE_EVENT } from '../../contracts/backendContract';

/**
 * Local pub/sub for ride + driver-request events. For WebSocket / SSE / gateway:
 * - Call `setRideEventTransport` to mirror outbound events or attach analytics.
 * - On inbound messages, parse the payload and call `emitMockRideEvent` / `emitMockDriverRequestEvent`
 *   with `source: 'live'` (or extend `dispatchRide` / `dispatchDriverRequest` similarly) so existing
 *   `subscribeToRideEvents` / `subscribeToDriverRequestEvents` consumers stay unchanged.
 */

/** Where the event originated — swap mock bus for live gateway later. */
export type RideEventSource = 'mock' | 'live';

export type RideEvent = {
  type: RideEventName;
  rideId: string;
  /** Snapshot after transition (optional for cancelled if already removed server-side). */
  ride?: RideSummary;
  occurredAt: string;
  source: RideEventSource;
};

export type DriverRequestEvent = {
  type: DriverRequestEventName;
  occurredAt: string;
  source: RideEventSource;
  requestId?: string;
  pickup?: string;
  destination?: string;
  earning?: string;
};

export type RideEventHandler = (event: RideEvent) => void;
export type DriverRequestEventHandler = (event: DriverRequestEvent) => void;

/**
 * Future WebSocket / SSE / realtime gateway: implement this and call `setRideEventTransport`
 * to forward server pushes into the same subscriber API (or replace in-memory dispatch).
 */
export interface RideEventTransport {
  /** Called when a ride event is produced locally (optional echo to server). */
  onLocalRideEvent?(event: RideEvent): void;
  /** Called when a driver-request event is produced locally. */
  onLocalDriverRequestEvent?(event: DriverRequestEvent): void;
}

let transport: RideEventTransport | null = null;

export function setRideEventTransport(t: RideEventTransport | null): void {
  transport = t;
}

/** Last API status emitted per ride — avoids duplicate events when both request + polling observe the same phase. */
const lastEmittedRideStatus = new Map<string, RideStatus>();

export function clearRideEventDedupForRide(rideId: string): void {
  lastEmittedRideStatus.delete(rideId);
}

function statusForRideEventName(type: RideEventName): RideStatus | null {
  switch (type) {
    case RIDE_EVENT.REQUESTED:
      return 'pending';
    case RIDE_EVENT.MATCHING:
      return 'matching';
    case RIDE_EVENT.ASSIGNED:
      return 'driver_assigned';
    case RIDE_EVENT.ARRIVED:
      return 'driver_arrived';
    case RIDE_EVENT.STARTED:
      return 'in_progress';
    case RIDE_EVENT.COMPLETED:
      return 'completed';
    case RIDE_EVENT.CANCELLED:
      return 'cancelled';
    default:
      return null;
  }
}

function shouldEmitRideStatus(rideId: string, status: RideStatus): boolean {
  const prev = lastEmittedRideStatus.get(rideId);
  if (prev === status) return false;
  lastEmittedRideStatus.set(rideId, status);
  return true;
}

const rideSubscribers = new Map<string, Set<RideEventHandler>>();
const allRideSubscribers = new Set<RideEventHandler>();
const driverRequestSubscribers = new Set<DriverRequestEventHandler>();

function dispatchRide(event: RideEvent): void {
  transport?.onLocalRideEvent?.(event);
  for (const h of allRideSubscribers) {
    h(event);
  }
  const set = rideSubscribers.get(event.rideId);
  if (!set) return;
  for (const h of set) {
    h(event);
  }
}

function dispatchDriverRequest(event: DriverRequestEvent): void {
  transport?.onLocalDriverRequestEvent?.(event);
  for (const h of driverRequestSubscribers) {
    h(event);
  }
}

/** Subscribe to all ride lifecycle events (any `rideId`) — e.g. notification fan-in. */
export function subscribeToAllRideEvents(handler: RideEventHandler): () => void {
  allRideSubscribers.add(handler);
  return () => {
    allRideSubscribers.delete(handler);
  };
}

/** Subscribe to ride-scoped events (polling, mock emits, future WS fan-in). */
export function subscribeToRideEvents(rideId: string, handler: RideEventHandler): () => void {
  let set = rideSubscribers.get(rideId);
  if (!set) {
    set = new Set();
    rideSubscribers.set(rideId, set);
  }
  set.add(handler);
  return () => {
    const s = rideSubscribers.get(rideId);
    if (!s) return;
    s.delete(handler);
    if (s.size === 0) rideSubscribers.delete(rideId);
  };
}

/** Subscribe to driver incoming / expired request events. */
export function subscribeToDriverRequestEvents(handler: DriverRequestEventHandler): () => void {
  driverRequestSubscribers.add(handler);
  return () => {
    driverRequestSubscribers.delete(handler);
  };
}

/** Low-level mock emitter — prefer `publishRideSnapshotTransition` for status changes. */
export function emitMockRideEvent(event: Omit<RideEvent, 'occurredAt' | 'source'> & Partial<Pick<RideEvent, 'occurredAt' | 'source'>>): void {
  const status = statusForRideEventName(event.type);
  const source = event.source ?? 'mock';
  if (status !== null && source !== 'live' && !shouldEmitRideStatus(event.rideId, status)) return;
  const full: RideEvent = {
    ...event,
    occurredAt: event.occurredAt ?? new Date().toISOString(),
    source,
  };
  dispatchRide(full);
}

/** Low-level mock emitter for driver offer lifecycle. */
export function emitMockDriverRequestEvent(
  event: Omit<DriverRequestEvent, 'occurredAt' | 'source'> & Partial<Pick<DriverRequestEvent, 'occurredAt' | 'source'>>,
): void {
  const full: DriverRequestEvent = {
    ...event,
    occurredAt: event.occurredAt ?? new Date().toISOString(),
    source: event.source ?? 'mock',
  };
  dispatchDriverRequest(full);
}

function rideEventNameForStatus(status: RideStatus): RideEventName | null {
  switch (status) {
    case 'pending':
      return RIDE_EVENT.REQUESTED;
    case 'matching':
      return RIDE_EVENT.MATCHING;
    case 'driver_assigned':
      return RIDE_EVENT.ASSIGNED;
    case 'driver_arrived':
      return RIDE_EVENT.ARRIVED;
    case 'in_progress':
      return RIDE_EVENT.STARTED;
    case 'completed':
      return RIDE_EVENT.COMPLETED;
    case 'cancelled':
      return RIDE_EVENT.CANCELLED;
    default:
      return null;
  }
}

/**
 * Publish a normalized ride event when the snapshot moves to a new API status (polling, sync).
 * Uses the same dedup map as `emitMockRideEvent` so mock request + first poll do not double-emit.
 */
export function publishRideSnapshotTransition(prev: RideSummary | null, next: RideSummary | null): void {
  if (!next) return;
  const name = rideEventNameForStatus(next.status);
  if (!name) return;
  const prevSame =
    prev !== null && prev.id === next.id && prev.status === next.status;
  if (prevSame) return;
  emitMockRideEvent({ type: name, rideId: next.id, ride: next });
}
