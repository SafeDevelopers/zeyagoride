import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LocateFixed } from 'lucide-react';
import mapboxgl from 'mapbox-gl';
import type { CameraOptions } from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
/** Populated from `VITE_MAPBOX_ACCESS_TOKEN` in `config/env.ts` (Vite client env). */
import { MAPBOX_ACCESS_TOKEN } from '../../config/env';
import type { MapboxCameraFraming, MapboxMapProps } from './types';
import { DEFAULT_MAP_CENTER } from './types';
import type { LatLng } from '../../types/api';
import { buildTripWaypointSequence } from './routePreview';
import { reverseGeocode } from '../../services/mapbox/geocodingService';
import { densifyStraightLineWaypoints, resolveRoutePolylineForMap } from '../../services/mapbox/routeService';

const ROUTE_SOURCE_ID = 'route-preview';
const ROUTE_LAYER_ID = 'route-preview-line';

const reverseLabelCache = new Map<string, string>();

/**
 * Base map: keep `streets-v12` (default here).
 *
 * Tradeoff vs `navigation-day-v1` / `navigation-night-v1`:
 * - Navigation styles: course-up / lane-style visuals and traffic-oriented labeling, but they compose in
 *   `mapbox.mapbox-incidents-v1` (and related traffic sources). Many public tokens hit 404 on incidents,
 *   which spams the console and can degrade load — we stay on streets for stability.
 * - `streets-v12`: no incidents composite; reliable tiles; strong road + place + POI labels at city zoom.
 *   Slightly less “turn-by-turn dashboard” than Mapbox Navigation, but correct for this web shell.
 *
 * Switching back is OK only if your Mapbox account can load the navigation style’s composite sources.
 */
const MAPBOX_BASE_STYLE = 'mapbox://styles/mapbox/streets-v12';

/** Non–rider-home: still street-level, slightly less aggressive than rider home. */
const FRAMING_DEFAULT = {
  singlePoint: 16,
  fallbackNoMarkers: 15,
  multiInitial: 15,
  fitPadding: 32,
  fitMaxZoom: 16.5,
} as const;

/** Rider home: neighborhood / street-level, tight multi-point fits. */
const FRAMING_RIDER_HOME = {
  singlePoint: 17.35,
  fallbackNoMarkers: 17,
  multiInitial: 16,
  fitPadding: 22,
  fitMaxZoom: 17,
} as const;

/** Pre-trip route overview: fit waypoints, north-up, don’t zoom out past readability. */
const FRAMING_ROUTE_OVERVIEW = {
  singlePoint: 16,
  fallbackNoMarkers: 15,
  multiInitial: 15,
  fitPadding: 80,
  fitMaxZoom: 16.5,
  /** Prevent over-zooming out on short hops (mapbox fitBounds min zoom). */
  fitMinZoom: 14,
} as const;

/** Active navigation: tight follow zoom range (actual zoom picked inside band). */
const FRAMING_ACTIVE_NAV = {
  zoom: 16.75 as number,
  zoomMin: 15.5 as number,
  zoomMax: 17.75 as number,
  /** Pitched follow view; kept moderate so labels stay readable over 3D buildings. */
  pitch: 46,
  /** Asymmetric padding: more inset at bottom → vehicle / POI reads lower, more road ahead visible. */
  padding: { top: 56, bottom: 120, left: 40, right: 40 } as const,
} as const;

/**
 * Fit/zoom presets for `applyCamera` (overview, home, default). Not used for runtime active-navigation
 * framing: `applyCamera` returns early for `activeNavigation` and reads `FRAMING_ACTIVE_NAV` instead.
 * The `activeNavigation` branch here only supplies constructor-time zoom steps when the map is created
 * while that mode is already active (same numeric fallback as `default`).
 */
function framingConfig(framing: MapboxCameraFraming) {
  switch (framing) {
    case 'riderHome':
      return FRAMING_RIDER_HOME;
    case 'routeOverview':
      return FRAMING_ROUTE_OVERVIEW;
    case 'activeNavigation':
      return FRAMING_DEFAULT;
    default:
      return FRAMING_DEFAULT;
  }
}

/**
 * Camera focal point (not marker draw order): driver → pickup → destination →
 * (rider home only) user GPS → city default.
 */
function getCameraCenterLngLat(
  driverCoords: LatLng | null,
  pickupCoords: LatLng | null,
  destinationCoords: LatLng | null,
  userLocationCoords: LatLng | null | undefined,
  framing: MapboxCameraFraming,
): [number, number] {
  if (driverCoords) {
    return [driverCoords.longitude, driverCoords.latitude];
  }
  if (pickupCoords) {
    return [pickupCoords.longitude, pickupCoords.latitude];
  }
  if (destinationCoords) {
    return [destinationCoords.longitude, destinationCoords.latitude];
  }
  if (framing === 'riderHome' && userLocationCoords) {
    return [userLocationCoords.longitude, userLocationCoords.latitude];
  }
  return [DEFAULT_MAP_CENTER.longitude, DEFAULT_MAP_CENTER.latitude];
}

type MarkerPoint = {
  lng: number;
  lat: number;
  kind: 'pickup' | 'destination' | 'driver' | 'stop' | 'current';
};

/** Pre-trip overview: only route anchors (not live user / not driver ghost). */
function filterRouteOverviewPoints(points: MarkerPoint[]): MarkerPoint[] {
  return points.filter(
    (p) => p.kind === 'pickup' || p.kind === 'destination' || p.kind === 'stop',
  );
}

function bearingLngLatPoints(a: [number, number], b: [number, number]): number {
  const φ1 = (a[1] * Math.PI) / 180;
  const φ2 = (b[1] * Math.PI) / 180;
  const Δλ = ((b[0] - a[0]) * Math.PI) / 180;
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return (Math.atan2(y, x) * 180) / Math.PI;
}

function normalizeBearingDeg(b: number): number {
  return ((b % 360) + 360) % 360;
}

/**
 * Course-up bearing: prefer segment along route polyline near vehicle, else toward destination,
 * else pickup→drop. No live device heading — coarse only (anti-jitter via cameraSyncKey buckets).
 */
function computeNavigationBearingDeg(
  driverCoords: LatLng | null,
  routeLngLat: [number, number][],
  pickupCoords: LatLng | null,
  destinationCoords: LatLng | null,
): number {
  const d = driverCoords
    ? ([driverCoords.longitude, driverCoords.latitude] as [number, number])
    : null;
  if (d && routeLngLat.length >= 2) {
    let nearestIdx = 0;
    let best = Infinity;
    for (let i = 0; i < routeLngLat.length; i++) {
      const dx = routeLngLat[i][0] - d[0];
      const dy = routeLngLat[i][1] - d[1];
      const dist = dx * dx + dy * dy;
      if (dist < best) {
        best = dist;
        nearestIdx = i;
      }
    }
    let i0 = nearestIdx;
    let i1 = nearestIdx + 1;
    if (i1 >= routeLngLat.length) {
      i0 = Math.max(0, nearestIdx - 1);
      i1 = nearestIdx;
    }
    return normalizeBearingDeg(bearingLngLatPoints(routeLngLat[i0], routeLngLat[i1]));
  }
  if (d && destinationCoords) {
    return normalizeBearingDeg(
      bearingLngLatPoints(d, [destinationCoords.longitude, destinationCoords.latitude]),
    );
  }
  if (pickupCoords && destinationCoords) {
    return normalizeBearingDeg(
      bearingLngLatPoints(
        [pickupCoords.longitude, pickupCoords.latitude],
        [destinationCoords.longitude, destinationCoords.latitude],
      ),
    );
  }
  return 0;
}

function collectMarkerPoints(
  props: Pick<
    MapboxMapProps,
    'pickupCoords' | 'destinationCoords' | 'driverCoords' | 'stops' | 'userLocationCoords'
  >,
): MarkerPoint[] {
  const out: MarkerPoint[] = [];
  if (props.pickupCoords) {
    out.push({
      lng: props.pickupCoords.longitude,
      lat: props.pickupCoords.latitude,
      kind: 'pickup',
    });
  }
  if (props.destinationCoords) {
    out.push({
      lng: props.destinationCoords.longitude,
      lat: props.destinationCoords.latitude,
      kind: 'destination',
    });
  }
  if (props.driverCoords) {
    out.push({
      lng: props.driverCoords.longitude,
      lat: props.driverCoords.latitude,
      kind: 'driver',
    });
  }
  for (const s of props.stops) {
    if (s.coords) {
      out.push({
        lng: s.coords.longitude,
        lat: s.coords.latitude,
        kind: 'stop',
      });
    }
  }
  if (props.userLocationCoords) {
    out.push({
      lng: props.userLocationCoords.longitude,
      lat: props.userLocationCoords.latitude,
      kind: 'current',
    });
  }
  return out;
}

/** Full precision for marker moves (GPS can update every tick). */
function markerSyncKey(points: MarkerPoint[]): string {
  return points.map((p) => `${p.kind}:${p.lng.toFixed(6)}:${p.lat.toFixed(6)}`).join('|');
}

/**
 * Coarse coords for camera (jumpTo/fitBounds) so GPS jitter does not retrigger camera every frame.
 * ~100m for live GPS pins; trip anchors stay tighter.
 */
function roundForCamera(kind: MarkerPoint['kind'], n: number): number {
  const d = kind === 'current' || kind === 'driver' ? 3 : 5;
  const f = 10 ** d;
  return Math.round(n * f) / f;
}

/** Driver shell: `userLocationCoords` omitted/null and map follows vehicle — coarser driver rounding reduces camera fighting user pans. */
function isDriverDefaultShell(
  framing: MapboxCameraFraming,
  userLocationCoords: LatLng | null | undefined,
  driverCoords: LatLng | null,
): boolean {
  return framing === 'default' && driverCoords != null && (userLocationCoords == null || userLocationCoords === undefined);
}

function roundCoordForCameraSyncKey(
  kind: MarkerPoint['kind'],
  n: number,
  driverDefaultShell: boolean,
): number {
  if (driverDefaultShell && kind === 'driver') {
    return Math.round(n * 100) / 100;
  }
  return roundForCamera(kind, n);
}

function cameraSyncKey(
  points: MarkerPoint[],
  cameraFraming: MapboxCameraFraming,
  driverCoords: LatLng | null,
  pickupCoords: LatLng | null,
  destinationCoords: LatLng | null,
  userLocationCoords: LatLng | null | undefined,
  routeLngLat: [number, number][],
): string {
  if (cameraFraming === 'activeNavigation') {
    const b = computeNavigationBearingDeg(driverCoords, routeLngLat, pickupCoords, destinationCoords);
    const bBucket = Math.round(b / 5) * 5;
    const dc = driverCoords
      ? `${roundForCamera('driver', driverCoords.longitude)}:${roundForCamera('driver', driverCoords.latitude)}`
      : 'none';
    return JSON.stringify({
      framing: cameraFraming,
      dc,
      b: bBucket,
      rn: routeLngLat.length,
    });
  }
  if (cameraFraming === 'routeOverview') {
    const ov = filterRouteOverviewPoints(points);
    const coarsePts = ov.map((p) => ({
      k: p.kind,
      lng: roundForCamera(p.kind, p.lng),
      lat: roundForCamera(p.kind, p.lat),
    }));
    return JSON.stringify({ framing: cameraFraming, pts: coarsePts });
  }
  const driverDefaultShell = isDriverDefaultShell(cameraFraming, userLocationCoords, driverCoords);
  const coarsePts = points.map((p) => ({
    k: p.kind,
    lng: roundCoordForCameraSyncKey(p.kind, p.lng, driverDefaultShell),
    lat: roundCoordForCameraSyncKey(p.kind, p.lat, driverDefaultShell),
  }));
  const pc = getCameraCenterLngLat(
    driverCoords,
    pickupCoords,
    destinationCoords,
    userLocationCoords,
    cameraFraming,
  );
  const coarsePriority: [number, number] = driverDefaultShell
    ? [Math.round(pc[0] * 100) / 100, Math.round(pc[1] * 100) / 100]
    : [Math.round(pc[0] * 1000) / 1000, Math.round(pc[1] * 1000) / 1000];
  return JSON.stringify({
    framing: cameraFraming,
    n: points.length,
    pts: coarsePts,
    priority: coarsePriority,
  });
}

function routeSyncKey(
  routeLngLat: [number, number][],
  showRoute: boolean,
  segment: MapboxMapProps['routePolylineSegment'],
): string {
  const line = routeLngLat.map(([lng, lat]) => `${lng.toFixed(5)},${lat.toFixed(5)}`).join(';');
  return `${showRoute}|${segment ?? 'full_trip'}|${line}`;
}

/**
 * Insert the route line before the first symbol layer that actually draws text,
 * so the line sits above roads/buildings but under labels (Mapbox tutorial pattern).
 */
function routeLineInsertionBeforeId(map: mapboxgl.Map): string | undefined {
  try {
    const layers = map.getStyle()?.layers;
    if (!layers?.length) return undefined;
    const withText = layers.find((l) => {
      if (l.type !== 'symbol') return false;
      const tf = (l.layout as mapboxgl.SymbolLayout | undefined)?.['text-field'];
      return tf !== undefined && tf !== null;
    });
    if (withText?.id) return withText.id;
    return layers.find((l) => l.type === 'symbol')?.id;
  } catch {
    return undefined;
  }
}

function addRouteLineLayer(map: mapboxgl.Map): void {
  if (map.getLayer(ROUTE_LAYER_ID)) return;
  const spec: mapboxgl.LineLayer = {
    id: ROUTE_LAYER_ID,
    type: 'line',
    source: ROUTE_SOURCE_ID,
    layout: {
      'line-cap': 'round',
      'line-join': 'round',
      'line-elevation-reference': 'ground',
    },
    paint: {
      'line-color': '#4f46e5',
      'line-width': 6,
      'line-opacity': 1,
      /** Keep route visible when 3D buildings would otherwise hide the line. */
      'line-occlusion-opacity': 1,
    },
  };
  const beforeId = routeLineInsertionBeforeId(map);
  try {
    map.addLayer(spec, beforeId);
  } catch {
    try {
      map.addLayer(spec);
    } catch (e) {
      if (import.meta.env.DEV) {
        console.warn('[MapboxMap] route layer add failed', e);
      }
    }
  }
}

function addOrUpdateRoutePreview(
  map: mapboxgl.Map,
  routeLngLat: [number, number][],
  showRoute: boolean,
  debugLabel: string,
): void {
  if (!map.isStyleLoaded()) {
    if (import.meta.env.DEV) {
      console.warn('[MapboxMap] route skipped — style not loaded yet', debugLabel);
    }
    return;
  }

  const shouldDraw = showRoute && routeLngLat.length >= 2;

  if (import.meta.env.DEV) {
    console.log('[MapboxMap] route geometry', {
      context: debugLabel,
      showRoute,
      coordCount: routeLngLat.length,
      shouldDraw,
      firstCoord: routeLngLat[0],
      lastCoord: routeLngLat[routeLngLat.length - 1],
    });
  }

  if (!shouldDraw) {
    if (map.getLayer(ROUTE_LAYER_ID)) map.removeLayer(ROUTE_LAYER_ID);
    if (map.getSource(ROUTE_SOURCE_ID)) map.removeSource(ROUTE_SOURCE_ID);
    return;
  }

  const geojson = {
    type: 'Feature' as const,
    properties: {},
    geometry: {
      type: 'LineString' as const,
      coordinates: routeLngLat,
    },
  };

  const existing = map.getSource(ROUTE_SOURCE_ID) as mapboxgl.GeoJSONSource | undefined;
  if (existing) {
    existing.setData(geojson);
    if (!map.getLayer(ROUTE_LAYER_ID)) {
      addRouteLineLayer(map);
    }
    return;
  }

  map.addSource(ROUTE_SOURCE_ID, {
    type: 'geojson',
    data: geojson,
  });
  addRouteLineLayer(map);
}

function markerColor(kind: MarkerPoint['kind']): string {
  switch (kind) {
    case 'pickup':
      return '#059669';
    case 'destination':
      return '#dc2626';
    case 'driver':
      return '#2563eb';
    case 'stop':
      return '#d97706';
    case 'current':
      return '#0284c7';
    default:
      return '#64748b';
  }
}

function createMarkerElement(kind: MarkerPoint['kind']): HTMLDivElement {
  const el = document.createElement('div');
  const size = kind === 'current' ? 16 : 14;
  el.style.width = `${size}px`;
  el.style.height = `${size}px`;
  el.style.borderRadius = '9999px';
  el.style.backgroundColor = markerColor(kind);
  el.style.border = '2px solid white';
  el.style.boxShadow = '0 1px 4px rgba(0,0,0,0.35)';
  if (kind === 'current') {
    el.style.boxShadow = '0 0 0 4px rgba(14, 165, 233, 0.35), 0 1px 4px rgba(0,0,0,0.35)';
  }
  return el;
}

function resetFlatNorthUp(map: mapboxgl.Map): void {
  map.jumpTo({ pitch: 0, bearing: 0, retainPadding: false });
}

function applyCamera(
  map: mapboxgl.Map,
  points: MarkerPoint[],
  cfg: ReturnType<typeof framingConfig>,
  driverCoords: LatLng | null,
  pickupCoords: LatLng | null,
  destinationCoords: LatLng | null,
  userLocationCoords: LatLng | null | undefined,
  cameraFraming: MapboxCameraFraming,
  routeLngLat: [number, number][],
): void {
  if (cameraFraming === 'activeNavigation') {
    const centerLL =
      driverCoords ??
      pickupCoords ??
      destinationCoords ??
      (userLocationCoords ?? null);
    if (!centerLL) {
      resetFlatNorthUp(map);
      return;
    }
    const bearing = computeNavigationBearingDeg(
      driverCoords,
      routeLngLat,
      pickupCoords,
      destinationCoords,
    );
    let z: number = FRAMING_ACTIVE_NAV.zoom;
    if (routeLngLat.length >= 8) z = Math.min(FRAMING_ACTIVE_NAV.zoomMax, z + 0.5);
    else if (routeLngLat.length <= 3) z = Math.max(FRAMING_ACTIVE_NAV.zoomMin, z - 0.35);
    const navCamera: CameraOptions = {
      center: [centerLL.longitude, centerLL.latitude],
      zoom: z,
      pitch: FRAMING_ACTIVE_NAV.pitch,
      bearing,
      padding: { ...FRAMING_ACTIVE_NAV.padding },
      retainPadding: false,
    };
    map.jumpTo(navCamera);
    return;
  }

  resetFlatNorthUp(map);

  const fitPoints =
    cameraFraming === 'routeOverview' ? filterRouteOverviewPoints(points) : points;

  if (fitPoints.length === 0) {
    map.jumpTo({
      center: getCameraCenterLngLat(
        driverCoords,
        pickupCoords,
        destinationCoords,
        userLocationCoords,
        cameraFraming,
      ),
      zoom: cfg.fallbackNoMarkers,
      pitch: 0,
      bearing: 0,
      retainPadding: false,
    });
    return;
  }

  if (fitPoints.length === 1) {
    map.jumpTo({
      center: [fitPoints[0].lng, fitPoints[0].lat],
      zoom: cfg.singlePoint,
      pitch: 0,
      bearing: 0,
      retainPadding: false,
    });
    return;
  }

  const bounds = new mapboxgl.LngLatBounds();
  for (const p of fitPoints) {
    bounds.extend([p.lng, p.lat]);
  }

  const routePad =
    cameraFraming === 'routeOverview'
      ? { top: 64, bottom: 120, left: 52, right: 52 }
      : cfg.fitPadding;

  const fitOpts: mapboxgl.EasingOptions = {
    padding: routePad,
    maxZoom: cfg.fitMaxZoom,
    duration: 0,
    pitch: 0,
    bearing: 0,
    retainPadding: false,
  };
  if (cameraFraming === 'routeOverview' && 'fitMinZoom' in cfg && cfg.fitMinZoom != null) {
    fitOpts.minZoom = cfg.fitMinZoom;
  }
  map.fitBounds(bounds, fitOpts);
}

/** Same non-interactive grid as the pre-Mapbox placeholder — used when token or coords are missing. */
function MapPlaceholderFallback({
  className,
  height,
}: Pick<MapboxMapProps, 'className' | 'height'>) {
  return (
    <div className={className} style={height ? { height } : undefined}>
      <div
        className="relative h-full w-full bg-slate-200"
        style={{
          backgroundImage: `linear-gradient(rgba(75,44,109,0.06) 2px, transparent 2px), linear-gradient(90deg, rgba(75,44,109,0.06) 2px, transparent 2px)`,
          backgroundSize: '40px 40px',
        }}
      >
        {/* Single center pin — matches rider home reference */}
        <div className="pointer-events-none absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center">
          <svg
            width="36"
            height="36"
            viewBox="0 0 24 24"
            fill="none"
            className="drop-shadow-md"
            aria-hidden
          >
            <path
              d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"
              fill="#4b2c6d"
              stroke="#fff"
              strokeWidth="1.5"
            />
            <circle cx="12" cy="9" r="2.5" fill="#fff" />
          </svg>
        </div>
      </div>
    </div>
  );
}

/**
 * Mapbox GL map — markers + optional straight-line route preview.
 */
export function MapboxMap({
  pickupCoords,
  destinationCoords,
  driverCoords,
  userLocationCoords = null,
  cameraFraming = 'default',
  stops,
  showRoute = false,
  routePolylineSegment = 'full_trip',
  className = '',
  height,
}: MapboxMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [mapReady, setMapReady] = useState(false);
  /** Rider home: show “recenter on me” after user pans/zooms away from synced view. */
  const [showRiderRecenter, setShowRiderRecenter] = useState(false);
  /** Skip off-center updates while applyCamera / flyTo runs (avoids flicker). */
  const programmaticCameraRef = useRef(false);
  /** Driver default map: after user drags/rotates, skip auto follow until recenter (prevents GPS from undoing pan). */
  const driverMapExploredRef = useRef(false);
  const framingRef = useRef(cameraFraming);
  framingRef.current = cameraFraming;
  const userLocRef = useRef(userLocationCoords);
  userLocRef.current = userLocationCoords;
  const driverCoordsRef = useRef(driverCoords);
  driverCoordsRef.current = driverCoords;

  const areaLabelCoords = userLocationCoords ?? driverCoords ?? null;
  const areaLabelCoordsRef = useRef(areaLabelCoords);
  areaLabelCoordsRef.current = areaLabelCoords;
  const areaLabelFetchKey = useMemo(() => {
    if (!areaLabelCoords) return '';
    const { longitude: lng, latitude: lat } = areaLabelCoords;
    return `${lng.toFixed(4)},${lat.toFixed(4)}`;
  }, [areaLabelCoords]);

  const [areaLabelText, setAreaLabelText] = useState('');

  useEffect(() => {
    const coords = areaLabelCoordsRef.current;
    if (!areaLabelFetchKey || !coords) {
      setAreaLabelText('');
      return;
    }
    const cached = reverseLabelCache.get(areaLabelFetchKey);
    if (cached !== undefined) {
      setAreaLabelText(cached);
      return;
    }
    const { latitude, longitude } = coords;
    let cancelled = false;
    void reverseGeocode({ latitude, longitude }).then((r) => {
      if (cancelled) return;
      const t = (r.address ?? '').trim();
      reverseLabelCache.set(areaLabelFetchKey, t);
      setAreaLabelText(t);
    });
    return () => {
      cancelled = true;
    };
  }, [areaLabelFetchKey]);

  const points = useMemo(
    () =>
      collectMarkerPoints({
        pickupCoords,
        destinationCoords,
        driverCoords,
        stops,
        userLocationCoords,
      }),
    [pickupCoords, destinationCoords, driverCoords, stops, userLocationCoords],
  );

  const pointsRef = useRef(points);
  pointsRef.current = points;

  const evaluateRiderRecenterVisibility = useCallback(() => {
    const map = mapRef.current;
    if (!map || programmaticCameraRef.current) return;
    const framing = framingRef.current;
    const user = userLocRef.current;
    const driver = driverCoordsRef.current;
    const pts = pointsRef.current;

    /**
     * Rider home / pre-trip route overview: recenter on device location.
     * Driver home (`default`): recenter on vehicle GPS (no rider `userLocationCoords` in shell).
     */
    const riderHomeMode = framing === 'riderHome' && user != null;
    const riderRouteOverviewMode = framing === 'routeOverview' && user != null;
    const driverRecenterMode = framing === 'default' && user == null && driver != null;
    if (!riderHomeMode && !riderRouteOverviewMode && !driverRecenterMode) {
      setShowRiderRecenter(false);
      return;
    }

    const target = riderHomeMode || riderRouteOverviewMode ? user! : driver!;
    const refZoom = riderHomeMode
      ? FRAMING_RIDER_HOME.singlePoint
      : riderRouteOverviewMode
        ? FRAMING_ROUTE_OVERVIEW.singlePoint
        : FRAMING_DEFAULT.singlePoint;
    const onlyAnchorPin = riderHomeMode
      ? pts.length === 0 || (pts.length === 1 && pts[0].kind === 'current')
      : riderRouteOverviewMode
        ? false
        : pts.length === 0 || (pts.length === 1 && pts[0].kind === 'driver');

    try {
      const projected = map.project([target.longitude, target.latitude]);
      const el = map.getContainer();
      const cw = el.clientWidth;
      const ch = el.clientHeight;
      if (cw < 8 || ch < 8) return;
      const cx = cw / 2;
      const cy = ch / 2;
      const distPx = Math.hypot(projected.x - cx, projected.y - cy);
      const thresholdPx = riderRouteOverviewMode
        ? Math.max(72, Math.min(cw, ch) * 0.12)
        : Math.max(64, Math.min(cw, ch) * 0.1);
      const z = map.getZoom();
      const zoomOff = onlyAnchorPin && Math.abs(z - refZoom) > 0.6;
      setShowRiderRecenter(distPx > thresholdPx || zoomOff);
    } catch {
      setShowRiderRecenter(false);
    }
  }, []);

  const routeWaypoints = useMemo(
    () =>
      buildTripWaypointSequence(
        routePolylineSegment,
        driverCoords,
        pickupCoords,
        destinationCoords,
        stops,
      ),
    [routePolylineSegment, driverCoords, pickupCoords, destinationCoords, stops],
  );

  const routeWaypointsKey = useMemo(
    () =>
      routeWaypoints.map((w) => `${w.longitude.toFixed(5)},${w.latitude.toFixed(5)}`).join('|'),
    [routeWaypoints],
  );

  /** Coarser key for Directions on driver→pickup (avoids refetch every GPS tick). */
  const driverPickupDirectionsKey = useMemo(() => {
    if (routePolylineSegment !== 'driver_to_pickup') return '';
    if (routeWaypoints.length < 2) return '';
    const driver = routeWaypoints[0]!;
    const pickup = routeWaypoints[1]!;
    return `${pickup.longitude.toFixed(5)},${pickup.latitude.toFixed(5)}|${driver.longitude.toFixed(3)},${driver.latitude.toFixed(3)}`;
  }, [routePolylineSegment, routeWaypoints]);

  const fallbackRouteLngLat = useMemo(
    () => densifyStraightLineWaypoints(routeWaypoints),
    [routeWaypointsKey],
  );

  const [roadGeometryCoords, setRoadGeometryCoords] = useState<[number, number][] | null>(null);

  const routeWaypointsRef = useRef(routeWaypoints);
  routeWaypointsRef.current = routeWaypoints;

  useEffect(() => {
    setRoadGeometryCoords(null);
  }, [routePolylineSegment]);

  useEffect(() => {
    if (routePolylineSegment !== 'full_trip') return;
    let cancelled = false;
    const wps = routeWaypointsRef.current;
    if (!showRoute || wps.length < 2) {
      setRoadGeometryCoords(null);
      return () => {
        cancelled = true;
      };
    }
    setRoadGeometryCoords(null);
    void resolveRoutePolylineForMap(wps, { useDirections: true }).then((res) => {
      if (cancelled) return;
      if (import.meta.env.DEV) {
        console.log('[MapboxMap] route service geometry', {
          source: res.source,
          coordCount: res.coordinates.length,
        });
      }
      if (res.coordinates.length >= 2) {
        setRoadGeometryCoords(res.coordinates);
      } else if (import.meta.env.DEV) {
        console.log('[MapboxMap] using densified fallback line until/instead of Directions');
      }
    });
    return () => {
      cancelled = true;
    };
  }, [showRoute, routePolylineSegment, routeWaypointsKey]);

  useEffect(() => {
    if (routePolylineSegment !== 'driver_to_pickup') return;
    let cancelled = false;
    const wps = routeWaypointsRef.current;
    if (!showRoute || wps.length < 2 || !driverPickupDirectionsKey) {
      setRoadGeometryCoords(null);
      return () => {
        cancelled = true;
      };
    }
    setRoadGeometryCoords(null);
    const t = window.setTimeout(() => {
      void resolveRoutePolylineForMap(wps, { useDirections: true }).then((res) => {
        if (cancelled) return;
        if (import.meta.env.DEV) {
          console.log('[MapboxMap] driver→pickup directions', {
            source: res.source,
            coordCount: res.coordinates.length,
          });
        }
        if (res.coordinates.length >= 2) {
          setRoadGeometryCoords(res.coordinates);
        }
      });
    }, 1800);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [showRoute, routePolylineSegment, driverPickupDirectionsKey]);

  const displayRouteLngLat = useMemo(() => {
    if (!showRoute || routeWaypoints.length < 2) return [];
    if (roadGeometryCoords && roadGeometryCoords.length >= 2) return roadGeometryCoords;
    return fallbackRouteLngLat;
  }, [showRoute, routeWaypointsKey, roadGeometryCoords, fallbackRouteLngLat, routeWaypoints.length]);

  const markerKey = useMemo(() => markerSyncKey(points), [points]);
  const cameraKey = useMemo(
    () =>
      cameraSyncKey(
        points,
        cameraFraming,
        driverCoords,
        pickupCoords,
        destinationCoords,
        userLocationCoords,
        displayRouteLngLat,
      ),
    [
      points,
      cameraFraming,
      driverCoords,
      pickupCoords,
      destinationCoords,
      userLocationCoords,
      displayRouteLngLat,
    ],
  );

  const routeKey = useMemo(
    () => routeSyncKey(displayRouteLngLat, showRoute, routePolylineSegment),
    [displayRouteLngLat, showRoute, routePolylineSegment],
  );

  /** Token alone enables Mapbox; coords can appear later (do not gate on `points.length`). */
  const canRenderMap = Boolean(MAPBOX_ACCESS_TOKEN);

  useEffect(() => {
    if (import.meta.env.DEV) {
      const raw = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
      const ok = typeof raw === 'string' && raw.trim().length > 0;
      console.log(
        '[MapboxMap]',
        ok
          ? `VITE_MAPBOX_ACCESS_TOKEN ok (${raw.trim().length} chars)`
          : 'VITE_MAPBOX_ACCESS_TOKEN missing — set in root .env and restart dev server',
      );
    }
  }, []);

  /** Create map once — never destroy/recreate on coord/GPS churn. */
  useEffect(() => {
    if (!canRenderMap || !containerRef.current) {
      setMapReady(false);
      return;
    }

    mapboxgl.accessToken = MAPBOX_ACCESS_TOKEN;

    const cfg = framingConfig(cameraFraming);
    const priorityCenter = getCameraCenterLngLat(
      driverCoords,
      pickupCoords,
      destinationCoords,
      userLocationCoords,
      cameraFraming,
    );
    const initialCenter: [number, number] =
      points.length === 1 ? [points[0].lng, points[0].lat] : priorityCenter;
    const initialZoom =
      points.length === 0
        ? cfg.fallbackNoMarkers
        : points.length === 1
          ? cfg.singlePoint
          : cfg.multiInitial;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: MAPBOX_BASE_STYLE,
      center: initialCenter,
      zoom: initialZoom,
      attributionControl: true,
    });

    mapRef.current = map;

    const onLoad = () => {
      map.resize();
      setMapReady(true);
    };

    map.on('load', onLoad);

    const el = containerRef.current;
    const ro =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(() => {
            map.resize();
          })
        : null;
    if (el && ro) {
      ro.observe(el);
    }

    return () => {
      map.off('load', onLoad);
      ro?.disconnect();
      for (const m of markersRef.current) {
        m.remove();
      }
      markersRef.current = [];
      map.remove();
      mapRef.current = null;
      setMapReady(false);
    };
    // Intentionally minimal deps: only (re)create when token visibility toggles.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- stable map instance; props sync in separate effects
  }, [canRenderMap]);

  /** Markers: update when pin positions change (full precision). */
  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map) return;

    const clearMarkers = () => {
      for (const m of markersRef.current) {
        m.remove();
      }
      markersRef.current = [];
    };

    clearMarkers();
    for (const p of points) {
      const marker = new mapboxgl.Marker({ element: createMarkerElement(p.kind) })
        .setLngLat([p.lng, p.lat])
        .addTo(map);
      markersRef.current.push(marker);
    }
    // markerKey encodes pin moves; points is read from the same render.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- markerKey is the sync key for marker geometry
  }, [mapReady, markerKey]);

  /** Route polyline: update when geometry or visibility changes (after style is loadable). */
  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map) return;
    let cancelled = false;
    const applyRoute = () => {
      if (cancelled) return;
      addOrUpdateRoutePreview(map, displayRouteLngLat, showRoute, 'route-effect');
    };
    if (map.isStyleLoaded()) {
      applyRoute();
    } else {
      map.once('style.load', applyRoute);
      /** One idle after style load catches rare cases where `isStyleLoaded` is still false on first tick. */
      map.once('idle', applyRoute);
    }
    return () => {
      cancelled = true;
      map.off('style.load', applyRoute);
      map.off('idle', applyRoute);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- routeKey encodes line + showRoute
  }, [mapReady, routeKey, displayRouteLngLat, showRoute]);

  /** Driver home: mark manual pan/rotate so auto camera does not snap the map back on every GPS tick. */
  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map) return;
    const markExplored = () => {
      if (!isDriverDefaultShell(framingRef.current, userLocRef.current, driverCoordsRef.current)) return;
      if (programmaticCameraRef.current) return;
      driverMapExploredRef.current = true;
    };
    map.on('dragend', markExplored);
    map.on('rotateend', markExplored);
    return () => {
      map.off('dragend', markExplored);
      map.off('rotateend', markExplored);
    };
  }, [mapReady]);

  /** Camera: jumpTo / fitBounds only when coarse scene signature changes (not every GPS tick). */
  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map) return;

    const isDriverDefault = isDriverDefaultShell(cameraFraming, userLocationCoords, driverCoords);
    if (!isDriverDefault) {
      driverMapExploredRef.current = false;
    }

    if (isDriverDefault && driverMapExploredRef.current) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          programmaticCameraRef.current = false;
          evaluateRiderRecenterVisibility();
        });
      });
      return;
    }

    programmaticCameraRef.current = true;
    const cfg = framingConfig(cameraFraming);
    applyCamera(
      map,
      points,
      cfg,
      driverCoords,
      pickupCoords,
      destinationCoords,
      userLocationCoords,
      cameraFraming,
      displayRouteLngLat,
    );
    setShowRiderRecenter(false);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        programmaticCameraRef.current = false;
        evaluateRiderRecenterVisibility();
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- cameraKey encodes framing + coarse geometry
  }, [mapReady, cameraKey, evaluateRiderRecenterVisibility]);

  /** Rider home / route overview + driver default: after user pans/zooms, decide if recenter shows. */
  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map) return;
    const riderHomeCase = cameraFraming === 'riderHome' && userLocationCoords != null;
    const riderOverviewCase = cameraFraming === 'routeOverview' && userLocationCoords != null;
    const driverCase = cameraFraming === 'default' && userLocationCoords == null && driverCoords != null;
    if (!riderHomeCase && !riderOverviewCase && !driverCase) {
      setShowRiderRecenter(false);
      return;
    }
    const onMoveEnd = () => evaluateRiderRecenterVisibility();
    map.on('moveend', onMoveEnd);
    map.on('zoomend', onMoveEnd);
    map.on('rotateend', onMoveEnd);
    return () => {
      map.off('moveend', onMoveEnd);
      map.off('zoomend', onMoveEnd);
      map.off('rotateend', onMoveEnd);
    };
  }, [
    mapReady,
    cameraFraming,
    userLocationCoords,
    driverCoords,
    evaluateRiderRecenterVisibility,
  ]);

  const onRiderRecenterClick = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    const framing = framingRef.current;
    const user = userLocRef.current;
    const driver = driverCoordsRef.current;
    if (framing === 'riderHome' && user) {
      programmaticCameraRef.current = true;
      setShowRiderRecenter(false);
      map.flyTo({
        center: [user.longitude, user.latitude],
        zoom: FRAMING_RIDER_HOME.singlePoint,
        pitch: 0,
        bearing: 0,
        duration: 900,
        essential: true,
      });
      const done = () => {
        programmaticCameraRef.current = false;
        evaluateRiderRecenterVisibility();
      };
      map.once('moveend', done);
      return;
    }
    if (framing === 'routeOverview' && user) {
      programmaticCameraRef.current = true;
      setShowRiderRecenter(false);
      map.flyTo({
        center: [user.longitude, user.latitude],
        zoom: FRAMING_ROUTE_OVERVIEW.singlePoint,
        pitch: 0,
        bearing: 0,
        duration: 900,
        essential: true,
      });
      const done = () => {
        programmaticCameraRef.current = false;
        evaluateRiderRecenterVisibility();
      };
      map.once('moveend', done);
      return;
    }
    if (isDriverDefaultShell(framing, user, driver) && driver) {
      driverMapExploredRef.current = false;
      map.stop();
      programmaticCameraRef.current = true;
      setShowRiderRecenter(false);
      map.jumpTo({
        center: [driver.longitude, driver.latitude],
        zoom: FRAMING_DEFAULT.singlePoint,
        pitch: 0,
        bearing: 0,
      });
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          programmaticCameraRef.current = false;
          evaluateRiderRecenterVisibility();
        });
      });
    }
  }, [evaluateRiderRecenterVisibility]);

  if (!canRenderMap) {
    return (
      <div className="absolute inset-0 z-0">
        <MapPlaceholderFallback className={`h-full w-full ${className}`} height={height} />
      </div>
    );
  }

  const recenterVisible =
    showRiderRecenter &&
    ((cameraFraming === 'riderHome' && userLocationCoords) ||
      (cameraFraming === 'routeOverview' && userLocationCoords) ||
      (cameraFraming === 'default' && !userLocationCoords && driverCoords));

  const recenterRiderUpperRight =
    recenterVisible &&
    userLocationCoords != null &&
    (cameraFraming === 'riderHome' || cameraFraming === 'routeOverview');

  return (
    <Fragment>
      <div className="absolute inset-0 z-0">
        <div
          ref={containerRef}
          className={`h-full w-full ${className}`}
          style={height ? { height } : undefined}
          role="presentation"
          aria-label="Map"
        />
      </div>
      {/*
        z-[45] sits above the driver shell (z-40) so bottom-right recenter is not covered by
        full-width pointer-events-auto panels; still below SOS (z-50) and modals (z-[60]+).
        Map tiles stay in the z-0 sibling below.
      */}
      <div className="pointer-events-none absolute inset-0 z-[45]">
        {areaLabelText ? (
          <div
            className="pointer-events-none absolute left-1/2 top-[max(3.25rem,calc(env(safe-area-inset-top,0px)+2.75rem))] max-w-[min(92%,280px)] -translate-x-1/2 px-2"
            role="status"
          >
            <p className="truncate rounded-full bg-white/95 px-3 py-1.5 text-center text-[11px] font-semibold text-slate-800 shadow-[0_4px_16px_rgba(45,27,66,0.12)] ring-1 ring-slate-200/80">
              {areaLabelText}
            </p>
          </div>
        ) : null}
        {recenterVisible ? (
          <button
            type="button"
            onClick={onRiderRecenterClick}
            className={`pointer-events-auto absolute right-4 z-[46] flex h-12 w-12 items-center justify-center rounded-full bg-white text-velox-primary shadow-[0_8px_28px_rgba(45,27,66,0.28)] ring-2 ring-velox-primary/15 transition-transform active:scale-95 ${
              recenterRiderUpperRight
                ? 'top-[max(7.5rem,calc(env(safe-area-inset-top,0px)+6.25rem))]'
                : 'bottom-[max(5.5rem,env(safe-area-inset-bottom,0px)+4.5rem)]'
            }`}
            aria-label="Recenter map on current location"
          >
            <LocateFixed size={22} strokeWidth={2.25} aria-hidden className="shrink-0" />
          </button>
        ) : null}
      </div>
    </Fragment>
  );
}
