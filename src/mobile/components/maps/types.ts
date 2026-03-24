import type { LatLng, RideStop } from '../../types/api';

/** Ordered inputs for straight-line route preview (pickup → stops → destination). */
export type RoutePreviewInput = {
  pickupCoords: LatLng | null;
  destinationCoords: LatLng | null;
  stops: RideStop[];
};

/** `riderHome` = street-level home framing around the user (closer zoom, user before city default). */
export type MapboxCameraFraming = 'default' | 'riderHome';

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
  className?: string;
  /** CSS height for the map container (e.g. `100%`). */
  height?: string;
};

/** Default viewport when fitting bounds is not used (single-point fallback). */
export const DEFAULT_MAP_CENTER: LatLng = {
  latitude: 9.0227,
  longitude: 38.746,
};
