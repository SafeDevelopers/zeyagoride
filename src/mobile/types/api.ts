import type { SelectedVehicleId } from './mobile';
import type { FareEstimate } from './route';

/**
 * API boundary types for mobile services (auth, rider rides, driver rides).
 * Mock implementations live under `services/api/` until real HTTP clients exist.
 */

/** Backend auth — request OTP to the given phone (E.164 or normalized digits per API contract). */
export type LoginWithPhoneRequest = {
  phone: string;
};

/** Backend auth — OTP send acknowledged. */
export type LoginWithPhoneResponse = {
  message: string;
};

export type SessionUserRole = 'rider' | 'driver' | 'admin';

/** Normalized user returned on successful auth (matches persisted session `user`). */
export type SessionUser = {
  id: string;
  phone: string;
  name: string;
  role: SessionUserRole;
};

export type VerifyOtpRequest = {
  phone: string;
  code: string;
};

/** Tokens + user + session boundary time (ISO 8601). */
export type VerifyOtpResponse = {
  accessToken: string;
  refreshToken: string;
  user: SessionUser;
  /** Access token expiry (ISO 8601). */
  expiresAt: string;
};

/** Vehicle category for pricing / matching (aligned with UI `SelectedVehicleId`). */
export type VehicleType = SelectedVehicleId;

/** Server-side ride lifecycle (distinct from UI rider trip phase in `types/mobile`). */
export type RideStatus =
  | 'pending'
  | 'matching'
  | 'driver_assigned'
  | 'driver_arrived'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

/** WGS84 coordinates — Mapbox / Directions API compatible. */
export type LatLng = {
  latitude: number;
  longitude: number;
};

export type RideStop = {
  address: string;
  coords: LatLng | null;
};

/** Normalized ride projection for list/detail and post-mutation responses. */
export type RideSummary = {
  id: string;
  riderId?: string | null;
  driverId?: string | null;
  status: RideStatus;
  /** Legacy one-line labels (keep for existing UI copy). */
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
  /** Preview / confirmed route metrics when provided by client or API. */
  distanceMeters?: number;
  durationSeconds?: number;
  fareEstimate?: FareEstimate;
};

export type RequestRideRequest = {
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
  /** Snapshot from route/fare preview at request time (optional). */
  distanceMeters?: number;
  durationSeconds?: number;
  fareEstimate?: FareEstimate;
};

export type RequestRideResponse = {
  ride: RideSummary;
};

export type CancelRideRequest = {
  rideId: string;
  reason?: string;
};

export type CancelRideResponse = {
  cancelled: true;
  ride?: RideSummary;
};

export type DriverAvailabilityRequest = {
  online: boolean;
};

export type DriverAvailabilityResponse = {
  online: boolean;
};

export type AcceptRideRequest = {
  requestId: string;
};

export type AcceptRideResponse = {
  tripId: string;
  ride: RideSummary;
};

export type DeclineRideRequest = {
  requestId: string;
  reason?: string;
};

export type DeclineRideResponse = {
  declined: true;
};

export type GetRideRequest = {
  rideId: string;
};

export type GetRideResponse = {
  ride: RideSummary;
};

/** Incoming offer row for driver polling (matches UI `IncomingDriverRequest` fields). */
export type DriverIncomingOffer = {
  id: string;
  pickup: string;
  destination: string;
  earning: string;
};

export type ListDriverRequestsResponse = {
  requests: DriverIncomingOffer[];
};

export type TripSummary = {
  tripId: string;
  ride: RideSummary;
};

export type GetTripRequest = {
  tripId: string;
};

export type GetTripResponse = {
  trip: TripSummary;
};
