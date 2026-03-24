import type { LatLng } from '../../types/api';
import type { RoutePreviewInput } from './types';

/**
 * Ordered WGS84 [lng, lat] for a straight-line preview (skips null coords).
 * TODO(Mapbox): replace polyline with Directions API route geometry; add ETA/distance from Matrix/Directions.
 */
export function buildRoutePreviewCoordinates(input: RoutePreviewInput): [number, number][] {
  const { pickupCoords, destinationCoords, stops } = input;
  const coords: [number, number][] = [];
  const push = (ll: LatLng) => coords.push([ll.longitude, ll.latitude]);
  if (pickupCoords) push(pickupCoords);
  for (const s of stops) {
    if (s.coords) push(s.coords);
  }
  if (destinationCoords) push(destinationCoords);
  return coords;
}
