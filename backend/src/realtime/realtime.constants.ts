/**
 * Must stay aligned with `src/mobile/contracts/backendContract.ts` and `docs/backend-mobile-contract.md`.
 * TODO: verify string-for-string match on every mobile release.
 */

export const RIDE_EVENTS_CHANNEL = 'ride.events';
export const DRIVER_REQUESTS_CHANNEL = 'driver.requests';

export const GATEWAY_PAYLOAD_KIND = {
  RIDE: 'ride',
  DRIVER_REQUEST: 'driver_request',
} as const;

/** Mobile `RIDE_EVENT` — use as `eventType` in envelopes. */
export const RIDE_EVENT = {
  REQUESTED: 'ride.requested',
  MATCHING: 'ride.matching',
  ASSIGNED: 'ride.assigned',
  ARRIVED: 'ride.arrived',
  STARTED: 'ride.started',
  COMPLETED: 'ride.completed',
  CANCELLED: 'ride.cancelled',
} as const;

export const DRIVER_REQUEST_EVENT = {
  INCOMING: 'driver.request.incoming',
  EXPIRED: 'driver.request.expired',
} as const;
