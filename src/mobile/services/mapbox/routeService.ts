/**
 * Route distance/time and fare estimates (mock straight-line; API-ready for Directions).
 * TODO(Mapbox): call Directions API for geometry, distance, duration.
 * TODO: traffic-aware ETA (depart_at / live traffic).
 * TODO: surge / dynamic pricing hooks.
 * TODO: server-side fare validation before confirming ride.
 */
import type { LatLng, RideStop, VehicleType } from '../../types/api';
import type { FareEstimate, RouteEstimate, RoutePoint } from '../../types/route';

export type GetRouteEstimateInput = {
  pickupCoords: LatLng | null;
  destinationCoords: LatLng | null;
  stops: RideStop[];
  vehicleType: VehicleType;
};

/** Straight-line road-ish multiplier vs geodesic sum (until real routing exists). */
const MOCK_ROAD_DISTANCE_FACTOR = 1.28;
/** City average speed for mock ETA (km/h). TODO: traffic-aware. */
const MOCK_AVG_SPEED_KMH = 22;

function toRoutePoint(ll: LatLng): RoutePoint {
  return { latitude: ll.latitude, longitude: ll.longitude };
}

/** Same visit order as map route preview: pickup → stops with coords → destination. */
function collectOrderedLatLngs(input: GetRouteEstimateInput): LatLng[] {
  const { pickupCoords, destinationCoords, stops } = input;
  const seq: LatLng[] = [];
  if (pickupCoords) seq.push(pickupCoords);
  for (const s of stops) {
    if (s.coords) seq.push(s.coords);
  }
  if (destinationCoords) seq.push(destinationCoords);
  return seq;
}

function haversineMeters(a: LatLng, b: LatLng): number {
  const R = 6_371_000;
  const φ1 = (a.latitude * Math.PI) / 180;
  const φ2 = (b.latitude * Math.PI) / 180;
  const Δφ = ((b.latitude - a.latitude) * Math.PI) / 180;
  const Δλ = ((b.longitude - a.longitude) * Math.PI) / 180;
  const s =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
  return R * c;
}

function getRouteEstimateMock(input: GetRouteEstimateInput): RouteEstimate {
  const seq = collectOrderedLatLngs(input);
  if (seq.length < 2) {
    return {
      distanceMeters: 0,
      durationSeconds: 0,
      points: seq.map(toRoutePoint),
      source: 'mock_straight_line',
    };
  }
  let geodesicM = 0;
  for (let i = 1; i < seq.length; i++) {
    geodesicM += haversineMeters(seq[i - 1], seq[i]);
  }
  const distanceMeters = geodesicM * MOCK_ROAD_DISTANCE_FACTOR;
  const hours = distanceMeters / 1000 / MOCK_AVG_SPEED_KMH;
  const durationSeconds = Math.max(60, Math.round(hours * 3600));
  return {
    distanceMeters,
    durationSeconds,
    points: seq.map(toRoutePoint),
    source: 'mock_straight_line',
  };
}

/**
 * Route metrics for the current path. Live mode will call Mapbox Directions; mock uses straight-line segments.
 */
export async function getRouteEstimate(input: GetRouteEstimateInput): Promise<RouteEstimate> {
  void input.vehicleType;
  // TODO(Mapbox Directions): if MAPBOX_ACCESS_TOKEN && useDirectionsApi, fetch and return mapbox_directions source.
  return Promise.resolve(getRouteEstimateMock(input));
}

/** Base + per-km by vehicle (mock pricing curve). */
const FARE_BY_VEHICLE: Record<
  VehicleType,
  { base: number; perKm: number }
> = {
  economy: { base: 35, perKm: 11 },
  basic: { base: 42, perKm: 13 },
  classic: { base: 48, perKm: 15 },
  electric: { base: 52, perKm: 16 },
  minivan: { base: 70, perKm: 22 },
  executive: { base: 95, perKm: 28 },
  hourly: { base: 0, perKm: 0 },
};

/**
 * Turn routed distance/time into a display fare (mock).
 * TODO: surge, promos, backend quote.
 */
export function calculateFareEstimate(routeEstimate: RouteEstimate, vehicleType: VehicleType): FareEstimate {
  if (vehicleType === 'hourly') {
    return { currency: 'ETB', amount: 800, formatted: 'ETB 800' };
  }
  const km = routeEstimate.distanceMeters / 1000;
  const { base, perKm } = FARE_BY_VEHICLE[vehicleType];
  const raw = base + km * perKm;
  const amount = Math.max(25, Math.round(raw / 5) * 5);
  return {
    currency: 'ETB',
    amount,
    formatted: `ETB ${amount.toLocaleString('en-US')}`,
  };
}

export function formatDistanceLabel(distanceMeters: number): string {
  if (distanceMeters <= 0) return '—';
  if (distanceMeters < 1000) return `${Math.round(distanceMeters)} m`;
  return `${(distanceMeters / 1000).toFixed(1)} km`;
}

export function formatDurationLabel(durationSeconds: number): string {
  if (durationSeconds <= 0) return '—';
  const m = Math.round(durationSeconds / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rest = m % 60;
  return rest > 0 ? `${h} h ${rest} min` : `${h} h`;
}
