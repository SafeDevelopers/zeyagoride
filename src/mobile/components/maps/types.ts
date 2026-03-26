import type { LatLng, RideStop } from '../../types/api';

/** Ordered inputs for straight-line route preview (pickup → stops → destination). */
export type RoutePreviewInput = {
  pickupCoords: LatLng | null;
  destinationCoords: LatLng | null;
  stops: RideStop[];
};

/**
 * - `riderHome` — idle “where to?” / neighborhood framing (north-up, no nav pitch).
 * - `routeOverview` — pre-trip route + ride options: fit pickup/destination/stops, flat, north-up.
 * - `activeNavigation` — driver or rider in-trip: pitched, course-up, tight zoom, bottom-heavy padding.
 * - `default` — generic fallback (e.g. driver off-trip).
 */
export type MapboxCameraFraming =
  | 'default'
  | 'riderHome'
  | 'routeOverview'
  | 'activeNavigation';

/**
 * Which ordered path to draw on the map (camera modes unchanged).
 * - `full_trip` — pickup → stops (with coords) → destination (rider overview/active trip, driver after pickup).
 * - `driver_to_pickup` — live driver GPS → pickup (driver en route to rider).
 */
export type MapboxRoutePolylineSegment = 'full_trip' | 'driver_to_pickup';

export type MapboxMapProps = {
  pickupCoords: LatLng | null;
  destinationCoords: LatLng | null;
  /** TODO(Mapbox): wire from live driver / trip socket when backend exposes coords. */
  driverCoords: LatLng | null;
  /** Device GPS / browser geolocation — “my location” pin (optional). */
  userLocationCoords?: LatLng | null;
  /** Rider home tab uses closer zoom and centers on user when no trip coords yet. */
  cameraFraming?: MapboxCameraFraming;
  stops: RideStop[];
  /**
   * When true and ≥2 valid coords exist in order, draw a straight-line preview.
   * TODO(Mapbox): replace with Directions API geometry, ETA, and distance.
   */
  showRoute?: boolean;
  /** Trip/navigation path to render when `showRoute` is true. */
  routePolylineSegment?: MapboxRoutePolylineSegment;
  className?: string;
  /** CSS height for the map container (e.g. `100%`). */
  height?: string;
};

/** Default viewport when fitting bounds is not used (single-point fallback). */
export const DEFAULT_MAP_CENTER: LatLng = {
  latitude: 9.0227,
  longitude: 38.746,
};
