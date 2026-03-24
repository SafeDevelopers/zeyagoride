# Backend ↔ mobile contract

This document describes the HTTP and realtime contract the **NestJS API and gateway** must implement so the Zeyago mobile client (`src/mobile`) stays aligned. Canonical path and string literals live in `src/mobile/contracts/backendContract.ts`.

**Global prefix:** paths below are **relative to `VITE_API_BASE_URL`** (no trailing slash). If NestJS uses `app.setGlobalPrefix('api')`, either include `api` in that base URL or mirror the prefixed paths in controllers.

**Serialization:** the mobile `request()` layer sends and expects **JSON** with **`Authorization: Bearer <accessToken>`** when a session token exists (`src/mobile/services/api/client.ts`). Field names below match **`src/mobile/types/api.ts`** and **`src/mobile/types/route.ts`** (camelCase).

---

## Auth

### `POST /auth/login-with-phone`

| | |
|---|---|
| **Request body** | `LoginWithPhoneRequest` |

```ts
// types/api.ts
type LoginWithPhoneRequest = {
  phone: string;
};
```

| | |
|---|---|
| **Response body** | `LoginWithPhoneResponse` |

```ts
type LoginWithPhoneResponse = {
  message: string;
};
```

---

### `POST /auth/verify-otp`

| | |
|---|---|
| **Request body** | `VerifyOtpRequest` |

```ts
type VerifyOtpRequest = {
  phone: string;
  code: string;
};
```

| | |
|---|---|
| **Response body** | `VerifyOtpResponse` |

```ts
type SessionUser = {
  id: string;
  phone: string;
  name: string;
  role: 'rider' | 'driver' | 'admin';
};

type VerifyOtpResponse = {
  accessToken: string;
  refreshToken: string;
  user: SessionUser;
  expiresAt: string; // ISO 8601
};
```

---

## Rides (rider)

### `POST /rides`

Creates a ride request. Mobile sends the same shape as `RequestRideRequest`.

| | |
|---|---|
| **Request body** | `RequestRideRequest` |

```ts
type LatLng = { latitude: number; longitude: number };

type RideStop = {
  address: string;
  coords: LatLng | null;
};

// VehicleType = SelectedVehicleId (economy | basic | classic | electric | minivan | executive | hourly)
type RequestRideRequest = {
  pickup: string;
  destination: string;
  pickupAddress: string;
  destinationAddress: string;
  pickupCoords: LatLng | null;
  destinationCoords: LatLng | null;
  stops: RideStop[];
  vehicleType: VehicleType;
  profileType: 'personal' | 'business';
  scheduledDate?: string;
  scheduledTime?: string;
  distanceMeters?: number;
  durationSeconds?: number;
  fareEstimate?: FareEstimate;
};
```

`FareEstimate` (`types/route.ts`):

```ts
type FareEstimate = {
  currency: 'ETB';
  amount: number;
  formatted: string;
};
```

| | |
|---|---|
| **Response body** | `RequestRideResponse` |

```ts
type RequestRideResponse = {
  ride: RideSummary;
};
```

`RideSummary` (`types/api.ts`) — backend should return a full projection the UI can render:

```ts
type RideStatus =
  | 'pending'
  | 'matching'
  | 'driver_assigned'
  | 'driver_arrived'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

type RideSummary = {
  id: string;
  riderId?: string | null;
  driverId?: string | null;
  status: RideStatus;
  pickup: string;
  destination: string;
  pickupAddress: string;
  destinationAddress: string;
  pickupCoords: LatLng | null;
  destinationCoords: LatLng | null;
  stops: RideStop[];
  vehicleType: VehicleType;
  profileType: 'personal' | 'business';
  scheduledDate?: string;
  scheduledTime?: string;
  createdAt?: string;
  updatedAt?: string;
  distanceMeters?: number;
  durationSeconds?: number;
  fareEstimate?: FareEstimate;
};
```

---

### `GET /rides/:rideId`

| | |
|---|---|
| **Response** | Prefer `{ ride: RideSummary }`. The client also accepts a bare `RideSummary` at the root and normalizes it in `riderRideService`. |

---

### `DELETE /rides/:rideId`

Cancels a ride. Optional JSON body:

| | |
|---|---|
| **Request body** | `CancelRideRequest` (only `reason` is sent in body; `rideId` is in the path) |

```ts
// Client sends body: { reason?: string } when reason is set
type CancelRideRequest = {
  rideId: string;
  reason?: string;
};
```

| | |
|---|---|
| **Response body** | `CancelRideResponse` |

```ts
type CancelRideResponse = {
  cancelled: true;
  ride?: RideSummary;
};
```

---

## Driver (HTTP)

### `PUT /driver/availability`

| | |
|---|---|
| **Request body** | `DriverAvailabilityRequest` |

```ts
type DriverAvailabilityRequest = {
  online: boolean;
};
```

| | |
|---|---|
| **Response body** | `DriverAvailabilityResponse` |

```ts
type DriverAvailabilityResponse = {
  online: boolean;
};
```

---

### `GET /driver/incoming-requests`

| | |
|---|---|
| **Response body** | `ListDriverRequestsResponse` |

```ts
type DriverIncomingOffer = {
  id: string;
  pickup: string;
  destination: string;
  earning: string;
};

type ListDriverRequestsResponse = {
  requests: DriverIncomingOffer[];
};
```

---

### `POST /driver/requests/:requestId/accept`

| | |
|---|---|
| **Request body** | `AcceptRideRequest` (mobile includes `requestId` in body as well as path) |

```ts
type AcceptRideRequest = {
  requestId: string;
};
```

| | |
|---|---|
| **Response body** | `AcceptRideResponse` |

```ts
type AcceptRideResponse = {
  tripId: string;
  ride: RideSummary;
};
```

---

### `POST /driver/requests/:requestId/decline`

| | |
|---|---|
| **Request body** | `DeclineRideRequest` |

```ts
type DeclineRideRequest = {
  requestId: string;
  reason?: string;
};
```

| | |
|---|---|
| **Response body** | `DeclineRideResponse` |

```ts
type DeclineRideResponse = {
  declined: true;
};
```

---

### `GET /driver/trips/:tripId`

| | |
|---|---|
| **Response body** | `GetTripResponse` |

```ts
type TripSummary = {
  tripId: string;
  ride: RideSummary;
};

type GetTripResponse = {
  trip: TripSummary;
};
```

---

## Realtime gateway

Canonical strings: `src/mobile/contracts/backendContract.ts`. Inbound messages are parsed in `applyGatewayPayloadToRideEvents` (`src/mobile/services/realtime/realtimeClient.ts`) and forwarded into the same in-app bus as mock events (`emitMockRideEvent` / `emitMockDriverRequestEvent` with `source: 'live'`).

### Channels (logical)

| Constant | Value | Purpose |
|----------|--------|---------|
| `RIDE_EVENTS_CHANNEL` | `ride.events` | Ride lifecycle fan-out (Nest must use the same room/topic names if using Socket.IO rooms or Redis channels). |
| `DRIVER_REQUESTS_CHANNEL` | `driver.requests` | Driver request / queue updates. |

Clients subscribe via the app’s `RealtimeClient.subscribe(channel, handler)` when the transport is wired; **channel strings must match** what the gateway emits/joins.

### Event names (`eventType` / mobile `RideEvent` / `DriverRequestEvent`)

**Ride** — must match `RIDE_EVENT` in backendContract:

| Value |
|-------|
| `ride.requested` |
| `ride.matching` |
| `ride.assigned` |
| `ride.arrived` |
| `ride.started` |
| `ride.completed` |
| `ride.cancelled` |

**Driver request** — must match `DRIVER_REQUEST_EVENT`:

| Value |
|-------|
| `driver.request.incoming` |
| `driver.request.expired` |

### Envelope discriminator (`kind`)

| Constant | Value |
|----------|--------|
| `GATEWAY_PAYLOAD_KIND.RIDE` | `ride` |
| `GATEWAY_PAYLOAD_KIND.DRIVER_REQUEST` | `driver_request` |

### Payload shapes (JSON)

**Ride lifecycle (`kind: "ride"`)**

Required for the current client mapper:

- `kind`: `"ride"`
- `rideId`: `string`
- `eventType`: `string` (one of the ride event names above)
- `occurredAt`: `string` (ISO 8601) — optional; client defaults if missing
- `ride`: optional `RideSummary` snapshot

**Driver request (`kind: "driver_request"`)**

- `kind`: `"driver_request"`
- `eventType`: `string` (`driver.request.incoming` | `driver.request.expired`)
- `requestId`, `pickup`, `destination`, `earning`: optional strings
- `occurredAt`: optional ISO string

### Auth token expectation (socket)

- **HTTP:** `Authorization: Bearer <accessToken>` from session storage after OTP verify.
- **Realtime (planned):** `getRealtimeClient()` config uses `getAccessToken()` — **TODO:** wire to the same session `accessToken` as HTTP. For local experiments, `VITE_REALTIME_DEV_TOKEN` may be read; production should use the **same JWT** (or a short-lived socket ticket) the API issued at login.
- **Socket.IO:** typical pattern is `auth: { token: accessToken }` on handshake; **WebSocket:** query param or first message auth — **must match** whatever NestJS `WsAdapter` / gateway implements; the mobile `RealtimeTransport.openSocket` is still a stub.

---

## NestJS implementation checklist

- **Controllers & routes** — Implement the HTTP table above with paths matching `HTTP_AUTH_PATHS`, `RIDER_RIDE_PATHS`, and `DRIVER_API_PATHS` (plus any global prefix). Use consistent `:rideId`, `:requestId`, `:tripId` parameter names.
- **DTOs** — Define request/response classes or interfaces that serialize to the **camelCase** shapes above (or configure `ValidationPipe` + `@Expose()` / `ClassSerializerInterceptor` if you prefer snake_case in wire format — then document the mapping; today the mobile expects camelCase).
- **Guards** — Protect rider and driver routes with JWT (or session) guards; align issuer/claims with tokens returned by `POST /auth/verify-otp`.
- **Validation** — Enforce `RideStatus`, `VehicleType`, and required fields on `RequestRideRequest` / `RideSummary`.
- **WebSocket gateway** — Subscribe clients to `ride.events` and `driver.requests` (or equivalent); emit envelopes with `kind` + `eventType` exactly as in **Payload shapes**.
- **Token auth** — Accept the same bearer JWT as REST on the socket handshake (or exchange JWT for a socket-scoped token); document the chosen mechanism in the gateway module.
