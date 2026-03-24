import type { LatLng } from '../types/api';

/**
 * Temporary demo coordinates (Addis Ababa area) for seeded / saved-place flows until Mapbox picker + backend geocoding exist.
 */
export const DEMO_ADDIS_CENTER: LatLng = { latitude: 9.0227, longitude: 38.746 };

/** Distinct mock points so markers don’t stack when multiple fields are set. */
export const DEMO_COORD_BOLE_MEDHANIALEM: LatLng = { latitude: 9.0227, longitude: 38.7468 };
export const DEMO_COORD_KAZANCHIS: LatLng = { latitude: 9.0312, longitude: 38.7525 };
const BOLE_AIRPORT: LatLng = { latitude: 8.9779, longitude: 38.7994 };
const SHERATON: LatLng = { latitude: 9.0198, longitude: 38.7634 };
const CMC: LatLng = { latitude: 9.0124, longitude: 38.721 };
const PIAZZA: LatLng = { latitude: 9.0371, longitude: 38.7489 };

/** Normalized lookup keys → coords (lowercase, trimmed punctuation variants). */
const DEMO_COORDS_BY_KEY: Record<string, LatLng> = {
  'bole medhanialem': DEMO_COORD_BOLE_MEDHANIALEM,
  bole: DEMO_COORD_BOLE_MEDHANIALEM,
  kazanchis: DEMO_COORD_KAZANCHIS,
  'bole near medhanialem': DEMO_COORD_BOLE_MEDHANIALEM,
  'bole, near medhanialem': DEMO_COORD_BOLE_MEDHANIALEM,
  'kazanchis nani building': DEMO_COORD_KAZANCHIS,
  'kazanchis, nani building': DEMO_COORD_KAZANCHIS,
  'bole airport': BOLE_AIRPORT,
  'sheraton addis': SHERATON,
  cmc: CMC,
  piazza: PIAZZA,
  'current location': DEMO_ADDIS_CENTER,
};

/** Shared key for demo lookup + stable `demo:` place ids. */
export function normalizeDemoAddressKey(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/,/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Returns mock coords when `address` matches a seeded place; otherwise null (safe for Mapbox).
 */
export function resolveDemoCoordsForAddress(address: string): LatLng | null {
  const key = normalizeDemoAddressKey(address);
  if (!key) return null;
  return DEMO_COORDS_BY_KEY[key] ?? null;
}

export const demoSeededDestination = {
  homeAsRiderHome: DEMO_COORD_BOLE_MEDHANIALEM,
  workAsRiderHome: DEMO_COORD_KAZANCHIS,
} as const;

/** Static rows for mock search + geocoding fallback (Addis demo). */
export const SEEDED_DEMO_PLACES_FOR_SEARCH: readonly {
  id: string;
  address: string;
  coords: LatLng;
}[] = [
  { id: 'demo-bole-medhanialem', address: 'Bole Medhanialem, Addis Ababa', coords: DEMO_COORD_BOLE_MEDHANIALEM },
  { id: 'demo-kazanchis', address: 'Kazanchis, Addis Ababa', coords: DEMO_COORD_KAZANCHIS },
  { id: 'demo-bole-near', address: 'Bole, Near Medhanialem', coords: DEMO_COORD_BOLE_MEDHANIALEM },
  { id: 'demo-kazanchis-nani', address: 'Kazanchis, Nani Building', coords: DEMO_COORD_KAZANCHIS },
  { id: 'demo-bole-airport', address: 'Bole Airport', coords: { latitude: 8.9779, longitude: 38.7994 } },
  { id: 'demo-sheraton', address: 'Sheraton Addis', coords: { latitude: 9.0198, longitude: 38.7634 } },
  { id: 'demo-cmc', address: 'CMC, Addis Ababa', coords: { latitude: 9.0124, longitude: 38.721 } },
  { id: 'demo-piazza', address: 'Piazza, Addis Ababa', coords: { latitude: 9.0371, longitude: 38.7489 } },
  { id: 'demo-current-location', address: 'Current Location', coords: DEMO_ADDIS_CENTER },
] as const;
