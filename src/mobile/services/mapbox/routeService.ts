/**
 * Route distance/time and fare estimates (mock straight-line; API-ready for Directions).
 * TODO(Mapbox): call Directions API for geometry, distance, duration.
 * TODO: traffic-aware ETA (depart_at / live traffic).
 * TODO: surge / dynamic pricing hooks.
 * TODO: server-side fare validation before confirming ride.
 */
import { MAPBOX_ACCESS_TOKEN } from '../../config/env';
import { appSettingsService } from '../api/appSettingsService';
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

function interpolateLatLng(a: LatLng, b: LatLng, t: number): LatLng {
  return {
    latitude: a.latitude + (b.latitude - a.latitude) * t,
    longitude: a.longitude + (b.longitude - a.longitude) * t,
  };
}

/**
 * Smooth polyline along waypoint sequence when road geometry is unavailable (or driver→pickup leg).
 */
export function densifyStraightLineWaypoints(
  waypoints: LatLng[],
  stepsPerSegment = 12,
): [number, number][] {
  if (waypoints.length < 2) return [];
  const out: [number, number][] = [];
  for (let i = 0; i < waypoints.length - 1; i++) {
    const a = waypoints[i]!;
    const b = waypoints[i + 1]!;
    for (let s = 0; s < stepsPerSegment; s++) {
      const t = s / stepsPerSegment;
      const p = interpolateLatLng(a, b, t);
      out.push([p.longitude, p.latitude]);
    }
  }
  const last = waypoints[waypoints.length - 1]!;
  out.push([last.longitude, last.latitude]);
  return out;
}

/**
 * Mapbox Directions v5 — full route geometry (GeoJSON coordinates [lng, lat][]).
 * Up to 25 waypoints per request.
 */
async function fetchMapboxDirectionsCoordinates(waypoints: LatLng[]): Promise<[number, number][] | null> {
  if (waypoints.length < 2 || !MAPBOX_ACCESS_TOKEN) return null;
  const capped = waypoints.slice(0, 25);
  const pathPart = capped.map((w) => `${w.longitude},${w.latitude}`).join(';');
  const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${encodeURIComponent(
    pathPart,
  )}?alternatives=false&geometries=geojson&overview=full&access_token=${encodeURIComponent(
    MAPBOX_ACCESS_TOKEN,
  )}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = (await res.json()) as {
      routes?: { geometry?: { coordinates?: [number, number][] } }[];
    };
    const coords = data.routes?.[0]?.geometry?.coordinates;
    if (!coords || coords.length < 2) return null;
    return coords;
  } catch {
    return null;
  }
}

export type ResolvedMapPolyline = {
  coordinates: [number, number][];
  source: RouteEstimate['source'];
};

/**
 * Polyline for map drawing: Mapbox road geometry when allowed, else densified straight-line.
 * `useDirections: false` avoids API churn for the live driver→pickup leg (GPS updates often).
 */
export async function resolveRoutePolylineForMap(
  waypoints: LatLng[],
  options?: { useDirections?: boolean },
): Promise<ResolvedMapPolyline> {
  const useDirections = options?.useDirections !== false;
  if (waypoints.length < 2) {
    return { coordinates: [], source: 'mock_straight_line' };
  }
  if (!useDirections || !MAPBOX_ACCESS_TOKEN) {
    return {
      coordinates: densifyStraightLineWaypoints(waypoints),
      source: 'mock_straight_line',
    };
  }
  const road = await fetchMapboxDirectionsCoordinates(waypoints);
  if (road && road.length >= 2) {
    return { coordinates: road, source: 'mapbox_directions' };
  }
  return {
    coordinates: densifyStraightLineWaypoints(waypoints),
    source: 'mock_straight_line',
  };
}

/** Preserve current category differences while using backend pricing as the base rate card. */
const VEHICLE_RATE_MULTIPLIER: Record<VehicleType, number> = {
  economy: 1,
  basic: 1.18,
  classic: 1.36,
  electric: 1.45,
  minivan: 2,
  executive: 2.55,
  hourly: 0,
};

/**
 * Turn routed distance/time into a display fare using persisted backend pricing settings.
 * TODO: apply persisted promo settings to ride estimates where desired.
 * TODO: server-side fare validation / quote locking before confirming ride.
 */
export async function calculateFareEstimate(
  routeEstimate: RouteEstimate,
  vehicleType: VehicleType,
): Promise<FareEstimate> {
  if (vehicleType === 'hourly') {
    return { currency: 'ETB', amount: 800, formatted: 'ETB 800' };
  }
  const pricing = await appSettingsService
    .getPricingSettings()
    .catch(() => ({
      baseFare: 35,
      perKmRate: 11,
      perMinuteRate: 2,
      minimumFare: 25,
      cancellationFee: 20,
    }));
  const km = routeEstimate.distanceMeters / 1000;
  const minutes = routeEstimate.durationSeconds / 60;
  const multiplier = VEHICLE_RATE_MULTIPLIER[vehicleType] ?? 1;
  const raw =
    (pricing.baseFare + km * pricing.perKmRate + minutes * pricing.perMinuteRate) *
    multiplier;
  const minimum = pricing.minimumFare * multiplier;
  const amount = Math.max(minimum, Math.round(raw / 5) * 5);
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
