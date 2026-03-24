/**
 * Normalized place shapes for Mapbox search / geocoding and rider address fields.
 */

export type PlaceCoords = {
  latitude: number;
  longitude: number;
};

/** One row from forward search (Mapbox or mock). */
export type PlaceSuggestion = {
  id: string;
  /** Mapbox `feature.id` when live; `demo:*` when seeded mock. */
  placeId: string | null;
  /** Short label for UI lists (future). */
  label: string;
  /** Full address line for inputs / API copy. */
  address: string;
  coords: PlaceCoords | null;
};

/** Best single match from a query (forward geocode resolution). */
export type ResolvedPlace = {
  placeId: string | null;
  address: string;
  coords: PlaceCoords | null;
};
