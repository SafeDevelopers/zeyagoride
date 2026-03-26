/**
 * Mapbox Geocoding API + safe Addis demo fallback (no token / network errors).
 * TODO(Mapbox): batch requests, session token, country filter (ET).
 */
import { MAPBOX_ACCESS_TOKEN } from '../../config/env';
import {
  normalizeDemoAddressKey,
  resolveDemoCoordsForAddress,
  SEEDED_DEMO_PLACES_FOR_SEARCH,
} from '../../rider/demoPlaceCoords';
import type { PlaceCoords, PlaceSuggestion, ResolvedPlace } from '../../types/places';

const GEOCODE_BASE = 'https://api.mapbox.com/geocoding/v5/mapbox.places';

/** Addis — bias proximity for search (lng, lat). */
const DEFAULT_PROXIMITY = '38.746,9.023';

/** Ethiopia ISO 3166-1 alpha-2 — narrows Mapbox relevance without changing proximity. */
const MAPBOX_GEOCODE_COUNTRY = 'et';
/** Static UI language for Mapbox `place_name` / labels (not dynamic yet). */
const MAPBOX_GEOCODE_LANGUAGE = 'en';

function mapboxGeocodeQuerySuffix(): string {
  return `&country=${encodeURIComponent(MAPBOX_GEOCODE_COUNTRY)}&language=${encodeURIComponent(MAPBOX_GEOCODE_LANGUAGE)}`;
}

export function isLiveGeocodingEnabled(): boolean {
  return MAPBOX_ACCESS_TOKEN.length > 0;
}

function toPlaceCoords(lng: number, lat: number): PlaceCoords {
  return { latitude: lat, longitude: lng };
}

type MapboxGeocodeFeature = {
  id?: string;
  place_name?: string;
  text?: string;
  center?: [number, number];
  place_type?: string[];
};

function shortAreaLabelFromFeature(feature: MapboxGeocodeFeature): string {
  const full = typeof feature.place_name === 'string' ? feature.place_name.trim() : '';
  const head = typeof feature.text === 'string' ? feature.text.trim() : '';
  if (head && full) {
    const lower = full.toLowerCase();
    const hLower = head.toLowerCase();
    if (lower.startsWith(hLower)) {
      const rest = full.slice(head.length).replace(/^[,\s]+/, '');
      return rest ? `${head}, ${rest.split(',')[0]?.trim() ?? rest}` : head;
    }
  }
  if (full) {
    const parts = full.split(',').map((s) => s.trim()).filter(Boolean);
    return parts.slice(0, 2).join(', ') || full;
  }
  return head;
}

function mapboxFeatureToSuggestion(feature: MapboxGeocodeFeature, index: number): PlaceSuggestion | null {
  const center = feature.center;
  if (!center || center.length < 2) return null;
  const [lng, lat] = center;
  const address = typeof feature.place_name === 'string' ? feature.place_name : '';
  const label = typeof feature.text === 'string' ? feature.text : address;
  return {
    id: typeof feature.id === 'string' ? feature.id : `mapbox-${index}`,
    placeId: typeof feature.id === 'string' ? feature.id : null,
    label,
    address: address || label,
    coords: toPlaceCoords(lng, lat),
  };
}

function mapboxFeatureToResolved(feature: MapboxGeocodeFeature): ResolvedPlace | null {
  const s = mapboxFeatureToSuggestion(feature, 0);
  if (!s?.coords) return null;
  return {
    placeId: s.placeId,
    address: s.address,
    coords: s.coords,
  };
}

/** Seeded Addis demo — same keys as `resolveDemoCoordsForAddress`. */
function resolveSeededPlace(query: string): ResolvedPlace | null {
  const trimmed = query.trim();
  if (!trimmed) return null;
  const coords = resolveDemoCoordsForAddress(trimmed);
  if (!coords) return null;
  return {
    placeId: `demo:${normalizeDemoAddressKey(trimmed)}`,
    address: trimmed,
    coords: { latitude: coords.latitude, longitude: coords.longitude },
  };
}

function searchPlacesMock(query: string): PlaceSuggestion[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const out: PlaceSuggestion[] = [];
  for (const row of SEEDED_DEMO_PLACES_FOR_SEARCH) {
    const hay = `${row.address} ${row.id}`.toLowerCase();
    if (hay.includes(q)) {
      out.push({
        id: row.id,
        placeId: row.id,
        label: row.address.split(',')[0] ?? row.address,
        address: row.address,
        coords: { latitude: row.coords.latitude, longitude: row.coords.longitude },
      });
    }
  }
  return out.slice(0, 8);
}

async function searchPlacesMapbox(query: string): Promise<PlaceSuggestion[]> {
  const q = query.trim();
  if (!q) return [];
  const url = `${GEOCODE_BASE}/${encodeURIComponent(q)}.json?access_token=${encodeURIComponent(
    MAPBOX_ACCESS_TOKEN,
  )}&limit=5&proximity=${DEFAULT_PROXIMITY}${mapboxGeocodeQuerySuffix()}`;
  const res = await fetch(url);
  if (!res.ok) {
    if (import.meta.env.DEV) {
      console.warn('[geocodingService] searchPlacesMapbox HTTP error', res.status);
    }
    return searchPlacesMock(query);
  }
  const data = (await res.json()) as { features?: unknown[] };
  const features = Array.isArray(data.features) ? data.features : [];
  const out: PlaceSuggestion[] = [];
  let i = 0;
  for (const f of features) {
    const s = mapboxFeatureToSuggestion(f as MapboxGeocodeFeature, i);
    if (s) out.push(s);
    i += 1;
  }
  return out.length > 0 ? out : searchPlacesMock(query);
}

/**
 * Forward search — Mapbox when token present; otherwise seeded Addis demo list.
 */
export async function searchPlaces(query: string): Promise<PlaceSuggestion[]> {
  if (!isLiveGeocodingEnabled()) {
    return Promise.resolve(searchPlacesMock(query));
  }
  try {
    return await searchPlacesMapbox(query);
  } catch (e) {
    if (import.meta.env.DEV) {
      console.warn('[geocodingService] searchPlacesMapbox fetch failed, using mock', e);
    }
    return searchPlacesMock(query);
  }
}

async function resolvePlaceMapbox(query: string): Promise<ResolvedPlace | null> {
  const list = await searchPlacesMapbox(query);
  const first = list[0];
  if (!first?.coords) return null;
  return {
    placeId: first.placeId,
    address: first.address,
    coords: first.coords,
  };
}

/**
 * Single best match for a free-text query (e.g. after user edits an input).
 */
export async function resolvePlace(query: string): Promise<ResolvedPlace | null> {
  const trimmed = query.trim();
  if (!trimmed) return null;

  if (!isLiveGeocodingEnabled()) {
    return Promise.resolve(resolveSeededPlace(trimmed));
  }

  try {
    const resolved = await resolvePlaceMapbox(trimmed);
    if (resolved) return resolved;
  } catch (e) {
    if (import.meta.env.DEV) {
      console.warn('[geocodingService] resolvePlace Mapbox path failed, using seeded fallback', e);
    }
    /* fall through */
  }
  return resolveSeededPlace(trimmed);
}

const REVERSE_TYPES = 'address,poi,place,locality,neighborhood,district';

function reverseFeaturePriority(f: MapboxGeocodeFeature): number {
  const types = Array.isArray(f.place_type) ? f.place_type : [];
  const rank = (t: string) => {
    if (t === 'address') return 0;
    if (t === 'poi') return 1;
    if (t === 'neighborhood') return 2;
    if (t === 'district') return 3;
    if (t === 'locality') return 4;
    if (t === 'place') return 5;
    return 20;
  };
  return Math.min(...types.map(rank), 99);
}

function pickBestReverseFeature(features: MapboxGeocodeFeature[]): MapboxGeocodeFeature | null {
  const usable = features.filter((f) => mapboxFeatureToResolved(f)?.coords);
  if (usable.length === 0) return null;
  usable.sort((a, b) => reverseFeaturePriority(a) - reverseFeaturePriority(b));
  return usable[0] ?? null;
}

async function reverseGeocodeMapbox(coords: PlaceCoords): Promise<ResolvedPlace | null> {
  const { longitude: lng, latitude: lat } = coords;
  const url = `${GEOCODE_BASE}/${encodeURIComponent(`${lng},${lat}`)}.json?access_token=${encodeURIComponent(
    MAPBOX_ACCESS_TOKEN,
  )}&types=${REVERSE_TYPES}${mapboxGeocodeQuerySuffix()}`;
  const res = await fetch(url);
  if (!res.ok) {
    if (import.meta.env.DEV) {
      console.warn('[geocodingService] reverseGeocodeMapbox HTTP error', res.status, { url });
    }
    return null;
  }
  const data = (await res.json()) as { features?: MapboxGeocodeFeature[] };
  const features = Array.isArray(data.features) ? data.features : [];
  const feature = pickBestReverseFeature(features);
  if (!feature) return null;
  const resolved = mapboxFeatureToResolved(feature);
  if (!resolved?.coords) return null;
  const address =
    (typeof feature.place_name === 'string' && feature.place_name.trim()) ||
    shortAreaLabelFromFeature(feature) ||
    resolved.address;
  return {
    placeId: resolved.placeId,
    address,
    coords: resolved.coords,
  };
}

/**
 * Reverse geocode — Mapbox when token present; otherwise coords only (no network).
 */
export async function reverseGeocode(coords: PlaceCoords): Promise<ResolvedPlace> {
  const base: ResolvedPlace = {
    placeId: null,
    address: '',
    coords: { latitude: coords.latitude, longitude: coords.longitude },
  };
  if (!isLiveGeocodingEnabled()) {
    return base;
  }
  try {
    const r = await reverseGeocodeMapbox(coords);
    if (r?.address) return r;
  } catch (e) {
    if (import.meta.env.DEV) {
      console.warn('[geocodingService] reverseGeocode Mapbox path failed, using coords-only fallback', e);
    }
    /* fall through */
  }
  return base;
}
