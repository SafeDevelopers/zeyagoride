/**
 * Normalized route / fare preview for rider trip planning (mock or Mapbox Directions).
 */

/** Single vertex along a route (WGS84). */
export type RoutePoint = {
  latitude: number;
  longitude: number;
};

/** How the route metrics were produced. */
export type RouteEstimateSource = 'mock_straight_line' | 'mapbox_directions';

/**
 * Distance & time preview for a path.
 * TODO(Mapbox): populate from Directions API geometry; add traffic-aware duration.
 */
export type RouteEstimate = {
  /** Approximate path length (meters). */
  distanceMeters: number;
  /** Estimated travel time (seconds). */
  durationSeconds: number;
  /** Ordered vertices (straight-line in mock; future: follow road geometry). */
  points: RoutePoint[];
  source: RouteEstimateSource;
};

/**
 * Display-ready fare preview.
 * TODO: dynamic pricing / surge; backend fare validation on request.
 */
export type FareEstimate = {
  currency: 'ETB';
  /** Whole birr for display (mock). */
  amount: number;
  /** e.g. "ETB 142" */
  formatted: string;
};
