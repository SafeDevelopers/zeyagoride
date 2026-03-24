/**
 * Shared alignment between the mobile client and NestJS (HTTP controllers, gateway DTOs, WebSocket channels).
 * TODO: Keep path segments, event names, channel names, and payload `kind` values in lockstep with:
 * - `AuthController`, `RidesController`, `DriverController` route decorators
 * - Realtime gateway / `@WebSocketGateway` or Redis pub/sub naming
 * - Any global API prefix (e.g. `app.setGlobalPrefix('api')`) — prepend here or in the HTTP client base URL.
 */

// --- HTTP: auth (NestJS auth module) ---

/** TODO: Must match NestJS `AuthController` (or equivalent) `@Post` paths exactly. */
export const HTTP_AUTH_PATHS = {
  LOGIN_WITH_PHONE: '/auth/login-with-phone',
  VERIFY_OTP: '/auth/verify-otp',
} as const;

// --- HTTP: rider rides ---

/** TODO: Must match NestJS rider `RidesController` base path + param names. */
export const RIDER_RIDE_PATHS = {
  COLLECTION: '/rides',
  byId: (rideId: string) => `/rides/${encodeURIComponent(rideId)}`,
} as const;

// --- HTTP: driver ---

/** TODO: Must match NestJS driver module controllers (`DriverController`, trips, requests). */
export const DRIVER_API_PATHS = {
  AVAILABILITY: '/driver/availability',
  INCOMING_REQUESTS: '/driver/incoming-requests',
  acceptRequest: (requestId: string) =>
    `/driver/requests/${encodeURIComponent(requestId)}/accept`,
  declineRequest: (requestId: string) =>
    `/driver/requests/${encodeURIComponent(requestId)}/decline`,
  trip: (tripId: string) => `/driver/trips/${encodeURIComponent(tripId)}`,
  tripArrive: (tripId: string) => `/driver/trips/${encodeURIComponent(tripId)}/arrive`,
  tripStart: (tripId: string) => `/driver/trips/${encodeURIComponent(tripId)}/start`,
  tripComplete: (tripId: string) => `/driver/trips/${encodeURIComponent(tripId)}/complete`,
} as const;

/** Read-only admin snapshot — same `AppStateService` as rider/driver (`AdminController`). */
export const ADMIN_API_PATHS = {
  OVERVIEW: '/admin/overview',
} as const;

// --- Realtime: channel names (Socket.IO rooms / WS topics / Redis channels) ---

/** TODO: Must match NestJS gateway subscription channel / room names. */
export const RIDE_EVENTS_CHANNEL = 'ride.events';

/** TODO: Must match NestJS gateway subscription channel / room names. */
export const DRIVER_REQUESTS_CHANNEL = 'driver.requests';

// --- Realtime: normalized event type strings (mobile bus + gateway envelopes) ---

/** TODO: Must match NestJS gateway event `type` / `eventType` string literals emitted to clients. */
export const RIDE_EVENT = {
  REQUESTED: 'ride.requested',
  MATCHING: 'ride.matching',
  ASSIGNED: 'ride.assigned',
  ARRIVED: 'ride.arrived',
  STARTED: 'ride.started',
  COMPLETED: 'ride.completed',
  CANCELLED: 'ride.cancelled',
} as const;

export type RideEventName = (typeof RIDE_EVENT)[keyof typeof RIDE_EVENT];

/** TODO: Must match NestJS gateway event `type` / `eventType` for driver-offer lifecycle. */
export const DRIVER_REQUEST_EVENT = {
  INCOMING: 'driver.request.incoming',
  EXPIRED: 'driver.request.expired',
} as const;

export type DriverRequestEventName = (typeof DRIVER_REQUEST_EVENT)[keyof typeof DRIVER_REQUEST_EVENT];

// --- Realtime: gateway message envelope `kind` (DTO discriminator) ---

/** TODO: Must match NestJS gateway outbound message DTO discriminator field. */
export const GATEWAY_PAYLOAD_KIND = {
  RIDE: 'ride',
  DRIVER_REQUEST: 'driver_request',
} as const;

export type GatewayPayloadKind = (typeof GATEWAY_PAYLOAD_KIND)[keyof typeof GATEWAY_PAYLOAD_KIND];
