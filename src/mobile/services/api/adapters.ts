/**
 * Normalizes arbitrary backend JSON into mobile DTOs.
 * TODO(Mapbox): attach route geometry, live driver position, ETA/distance from Directions/Matrix APIs.
 * TODO(Mapbox): reverse geocoding for address ↔ coords.
 * TODO(Mapbox): pickup/dropoff marker positions for Mapbox GL layers.
 */
import type {
  AcceptRideResponse,
  CancelRideResponse,
  DriverAvailabilityResponse,
  DriverIncomingOffer,
  GetTripResponse,
  LatLng,
  ListDriverRequestsResponse,
  LoginWithPhoneResponse,
  RequestRideRequest,
  RideStatus,
  RideStop,
  RideSummary,
  SessionUser,
  SessionUserRole,
  VehicleType,
  VerifyOtpResponse,
} from '../../types/api';
import type { IncomingDriverRequest } from '../../types/mobile';
import type { FareEstimate } from '../../types/route';
import { isValidStopAddressString } from '../rides/rideLifecycle';

export function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

function str(v: unknown, fallback = ''): string {
  return typeof v === 'string' ? v : fallback;
}

function nullableStr(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  return typeof v === 'string' ? v : null;
}

function optNum(v: unknown): number | undefined {
  if (v === undefined || v === null) return undefined;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function parseFareEstimate(raw: unknown): FareEstimate | undefined {
  if (!isRecord(raw)) return undefined;
  const amount = optNum(raw.amount);
  const formatted = str(raw.formatted, '');
  if (amount === undefined || !formatted) return undefined;
  return { currency: 'ETB', amount: Math.round(amount), formatted };
}

function parseLatLng(raw: unknown): LatLng | null {
  if (!isRecord(raw)) return null;
  const lat = raw.latitude ?? raw.lat;
  const lng = raw.longitude ?? raw.lng ?? raw.lon;
  if (typeof lat !== 'number' || typeof lng !== 'number') return null;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { latitude: lat, longitude: lng };
}

function parseRideStatus(raw: unknown): RideStatus {
  const s = str(raw, 'matching');
  const allowed: RideStatus[] = [
    'pending',
    'matching',
    'driver_assigned',
    'driver_arrived',
    'in_progress',
    'completed',
    'cancelled',
  ];
  return (allowed.includes(s as RideStatus) ? s : 'matching') as RideStatus;
}

function parseRideStop(raw: unknown): RideStop {
  if (typeof raw === 'string') {
    return { address: raw, coords: null };
  }
  if (!isRecord(raw)) {
    return { address: '', coords: null };
  }
  const address = str(raw.address ?? raw.label ?? raw.name, '');
  const coords = parseLatLng(raw.coords ?? raw.coordinates ?? raw.location) ?? null;
  return { address, coords };
}

function parseStops(raw: unknown): RideStop[] {
  if (!Array.isArray(raw)) return [];
  return raw.map(parseRideStop);
}

/**
 * Maps auth verify response JSON → `VerifyOtpResponse`.
 */
export function adaptVerifyOtpResponse(raw: unknown): VerifyOtpResponse {
  if (!isRecord(raw)) {
    throw new Error('invalid_auth_response');
  }
  const accessToken = str(raw.accessToken ?? raw.access_token, '');
  const refreshToken = str(raw.refreshToken ?? raw.refresh_token ?? '', '');
  const expiresAt = str(raw.expiresAt ?? raw.expires_at ?? raw.expires_in, '');
  const userRaw = raw.user ?? raw.profile;
  if (!isRecord(userRaw)) {
    throw new Error('invalid_auth_user');
  }
  const role = (str(userRaw.role, 'rider') as SessionUserRole) || 'rider';
  const user: SessionUser = {
    id: str(userRaw.id ?? userRaw.userId, 'unknown'),
    phone: str(userRaw.phone ?? userRaw.phoneNumber, ''),
    name: str(userRaw.name ?? userRaw.displayName, 'User'),
    role,
  };
  if (!accessToken || !expiresAt) {
    throw new Error('invalid_auth_tokens');
  }
  return {
    accessToken,
    refreshToken,
    user,
    expiresAt,
  };
}

/**
 * Maps a ride JSON object → `RideSummary` (includes Mapbox-ready location fields).
 */
export function adaptRideSummary(raw: unknown): RideSummary {
  if (!isRecord(raw)) {
    throw new Error('invalid_ride');
  }
  const pickupAddress = str(raw.pickupAddress ?? raw.pickup_address ?? raw.pickup, '');
  const destinationAddress = str(
    raw.destinationAddress ?? raw.destination_address ?? raw.destination,
    '',
  );
  const pickup = str(raw.pickup ?? pickupAddress, pickupAddress);
  const destination = str(raw.destination ?? destinationAddress, destinationAddress);
  const pickupCoords =
    parseLatLng(raw.pickupCoords ?? raw.pickup_coords ?? raw.pickupLocation) ?? null;
  const destinationCoords =
    parseLatLng(raw.destinationCoords ?? raw.destination_coords ?? raw.destinationLocation) ?? null;
  const stops = parseStops(raw.stops);
  return {
    id: str(raw.id ?? raw.rideId, ''),
    riderId: nullableStr(raw.riderId ?? raw.rider_id),
    driverId: nullableStr(raw.driverId ?? raw.driver_id),
    status: parseRideStatus(raw.status),
    pickup,
    destination,
    pickupAddress: pickupAddress || pickup,
    destinationAddress: destinationAddress || destination,
    pickupCoords,
    destinationCoords,
    stops,
    vehicleType: str(raw.vehicleType ?? raw.vehicle_type ?? raw.vehicleId, 'economy') as RideSummary['vehicleType'],
    profileType: (str(raw.profileType ?? raw.profile_type, 'personal') === 'business'
      ? 'business'
      : 'personal') as RideSummary['profileType'],
    scheduledDate:
      raw.scheduledDate !== undefined
        ? str(raw.scheduledDate)
        : raw.scheduled_date !== undefined
          ? str(raw.scheduled_date)
          : undefined,
    scheduledTime:
      raw.scheduledTime !== undefined
        ? str(raw.scheduledTime)
        : raw.scheduled_time !== undefined
          ? str(raw.scheduled_time)
          : undefined,
    createdAt:
      raw.createdAt !== undefined ? str(raw.createdAt) : raw.created_at !== undefined ? str(raw.created_at) : undefined,
    updatedAt:
      raw.updatedAt !== undefined ? str(raw.updatedAt) : raw.updated_at !== undefined ? str(raw.updated_at) : undefined,
    distanceMeters: optNum(raw.distanceMeters ?? raw.distance_meters),
    durationSeconds: optNum(raw.durationSeconds ?? raw.duration_seconds),
    fareEstimate: parseFareEstimate(raw.fareEstimate ?? raw.fare_estimate),
  };
}

/**
 * Maps one driver-offer row → `IncomingDriverRequest` (UI overlay).
 */
export function adaptIncomingDriverRequest(raw: unknown): IncomingDriverRequest {
  if (!isRecord(raw)) {
    return { id: '', pickup: '', destination: '', earning: '' };
  }
  return {
    id: str(raw.id ?? raw.requestId, ''),
    pickup: str(raw.pickup ?? raw.pickupAddress ?? raw.pickup_address, ''),
    destination: str(raw.destination ?? raw.destinationAddress ?? raw.destination_address, ''),
    earning: str(raw.earning ?? raw.estimatedEarning ?? raw.fareEstimate ?? 'ETB 0.00', 'ETB 0.00'),
  };
}

function adaptDriverIncomingOffer(raw: unknown): DriverIncomingOffer {
  const r = adaptIncomingDriverRequest(raw);
  return { id: r.id, pickup: r.pickup, destination: r.destination, earning: r.earning };
}

/**
 * Maps list incoming requests response.
 */
export function adaptListDriverRequestsResponse(raw: unknown): ListDriverRequestsResponse {
  if (!isRecord(raw) || !Array.isArray(raw.requests)) {
    return { requests: [] };
  }
  return {
    requests: raw.requests.map(adaptDriverIncomingOffer),
  };
}

/**
 * Maps trip lookup JSON → `GetTripResponse` (ride normalized for Mapbox-ready fields).
 */
export function adaptGetTripResponse(raw: unknown): GetTripResponse {
  if (!isRecord(raw)) {
    throw new Error('invalid_trip');
  }
  const tripRaw = raw.trip ?? raw;
  if (!isRecord(tripRaw)) {
    throw new Error('invalid_trip_shape');
  }
  const tripId = str(tripRaw.tripId ?? tripRaw.id ?? tripRaw.trip_id, '');
  const rideRaw = tripRaw.ride ?? tripRaw.rideSummary ?? tripRaw.ride_summary;
  const ride = adaptRideSummary(rideRaw ?? tripRaw);
  return { trip: { tripId: tripId || ride.id, ride } };
}

export function adaptAcceptRideResponse(raw: unknown): AcceptRideResponse {
  if (!isRecord(raw)) {
    throw new Error('invalid_accept');
  }
  const tripId = str(raw.tripId ?? raw.trip_id ?? raw.id, '');
  const rideRaw = raw.ride;
  const ride = adaptRideSummary(rideRaw !== undefined ? rideRaw : raw);
  return { tripId: tripId || ride.id, ride };
}

export function adaptDriverAvailabilityResponse(raw: unknown, fallbackOnline: boolean): DriverAvailabilityResponse {
  if (!isRecord(raw)) {
    return { online: fallbackOnline };
  }
  if (typeof raw.online === 'boolean') {
    return { online: raw.online };
  }
  if (typeof raw.is_online === 'boolean') {
    return { online: raw.is_online };
  }
  return { online: fallbackOnline };
}

export function adaptCancelRideResponse(raw: unknown): CancelRideResponse {
  if (!isRecord(raw)) {
    return { cancelled: true };
  }
  const rideRaw = raw.ride;
  return {
    cancelled: true,
    ride: rideRaw !== undefined ? adaptRideSummary(rideRaw) : undefined,
  };
}

export function adaptLoginWithPhoneResponse(raw: unknown): LoginWithPhoneResponse {
  if (!isRecord(raw)) {
    return { message: 'ok' };
  }
  return { message: str(raw.message ?? raw.status, 'ok') };
}

/** Optional Mapbox-ready coords aligned with rider UI fields (demo resolver or future picker). */
export type BuildRequestRideLocationOptions = {
  pickupCoords?: LatLng | null;
  destinationCoords?: LatLng | null;
  /** Same length as `stops` strings; missing entries treated as null. */
  stopCoords?: (LatLng | null)[];
};

/** Snapshot from route service (single compute in rider request UI). */
export type BuildRequestRideEstimateOptions = {
  distanceMeters?: number;
  durationSeconds?: number;
  fareEstimate?: FareEstimate;
};

/** Build `RequestRideRequest` from current UI strings plus optional coordinates. */
export function buildRequestRideRequest(
  pickup: string,
  destination: string,
  stops: string[],
  vehicleType: VehicleType,
  profileType: 'personal' | 'business',
  scheduledDate?: string,
  scheduledTime?: string,
  location?: BuildRequestRideLocationOptions,
  estimate?: BuildRequestRideEstimateOptions,
): RequestRideRequest {
  const pickupCoords = location?.pickupCoords ?? null;
  const destinationCoords = location?.destinationCoords ?? null;
  const stopCoords = location?.stopCoords ?? [];
  const normalizedStops: { address: string; coords: LatLng | null }[] = [];
  stops.forEach((address, i) => {
    if (!isValidStopAddressString(address)) return;
    normalizedStops.push({ address: address.trim(), coords: stopCoords[i] ?? null });
  });
  return {
    pickup,
    destination,
    pickupAddress: pickup,
    destinationAddress: destination,
    pickupCoords,
    destinationCoords,
    stops: normalizedStops,
    vehicleType,
    profileType,
    scheduledDate,
    scheduledTime,
    distanceMeters: estimate?.distanceMeters,
    durationSeconds: estimate?.durationSeconds,
    fareEstimate: estimate?.fareEstimate,
  };
}
