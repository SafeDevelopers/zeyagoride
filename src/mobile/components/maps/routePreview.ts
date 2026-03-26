import type { LatLng } from '../../types/api';
import type { MapboxRoutePolylineSegment, RoutePreviewInput } from './types';

/**
 * Ordered WGS84 [lng, lat] for a straight-line preview (skips null coords).
 * Used where segment is not yet applied (legacy callers) or for quick sync fallback.
 */
export function buildRoutePreviewCoordinates(input: RoutePreviewInput): [number, number][] {
  const { pickupCoords, destinationCoords, stops } = input;
  const seq = buildTripWaypointSequence('full_trip', null, pickupCoords, destinationCoords, stops);
  return seq.map((ll) => [ll.longitude, ll.latitude] as [number, number]);
}

/**
 * Ordered trip waypoints for routing (WGS84). Drives Directions API + map polyline.
 */
export function buildTripWaypointSequence(
  segment: MapboxRoutePolylineSegment,
  driverCoords: LatLng | null,
  pickupCoords: LatLng | null,
  destinationCoords: LatLng | null,
  stops: RoutePreviewInput['stops'],
): LatLng[] {
  if (segment === 'driver_to_pickup') {
    const out: LatLng[] = [];
    if (driverCoords) out.push(driverCoords);
    if (pickupCoords) out.push(pickupCoords);
    return out;
  }
  const seq: LatLng[] = [];
  if (pickupCoords) seq.push(pickupCoords);
  for (const s of stops) {
    if (s.coords) seq.push(s.coords);
  }
  if (destinationCoords) seq.push(destinationCoords);
  return seq;
}
