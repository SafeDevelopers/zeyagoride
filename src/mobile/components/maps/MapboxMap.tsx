import { useEffect, useMemo, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
/** Populated from `VITE_MAPBOX_ACCESS_TOKEN` in `config/env.ts` (Vite client env). */
import { MAPBOX_ACCESS_TOKEN } from '../../config/env';
import type { MapboxCameraFraming, MapboxMapProps } from './types';
import { DEFAULT_MAP_CENTER } from './types';
import type { LatLng } from '../../types/api';
import { buildRoutePreviewCoordinates } from './routePreview';

const ROUTE_SOURCE_ID = 'route-preview';
const ROUTE_LAYER_ID = 'route-preview-line';

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

function framingConfig(framing: MapboxCameraFraming) {
  return framing === 'riderHome' ? FRAMING_RIDER_HOME : FRAMING_DEFAULT;
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

function cameraSyncKey(
  points: MarkerPoint[],
  cameraFraming: MapboxCameraFraming,
  driverCoords: LatLng | null,
  pickupCoords: LatLng | null,
  destinationCoords: LatLng | null,
  userLocationCoords: LatLng | null | undefined,
): string {
  const coarsePts = points.map((p) => ({
    k: p.kind,
    lng: roundForCamera(p.kind, p.lng),
    lat: roundForCamera(p.kind, p.lat),
  }));
  const pc = getCameraCenterLngLat(
    driverCoords,
    pickupCoords,
    destinationCoords,
    userLocationCoords,
    cameraFraming,
  );
  const coarsePriority: [number, number] = [
    Math.round(pc[0] * 1000) / 1000,
    Math.round(pc[1] * 1000) / 1000,
  ];
  return JSON.stringify({
    framing: cameraFraming,
    n: points.length,
    pts: coarsePts,
    priority: coarsePriority,
  });
}

function routeSyncKey(routeLngLat: [number, number][], showRoute: boolean): string {
  const line = routeLngLat.map(([lng, lat]) => `${lng.toFixed(5)},${lat.toFixed(5)}`).join(';');
  return `${showRoute}|${line}`;
}

function addOrUpdateRoutePreview(
  map: mapboxgl.Map,
  routeLngLat: [number, number][],
  showRoute: boolean,
): void {
  const shouldDraw = showRoute && routeLngLat.length >= 2;

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
    return;
  }

  map.addSource(ROUTE_SOURCE_ID, {
    type: 'geojson',
    data: geojson,
  });
  map.addLayer({
    id: ROUTE_LAYER_ID,
    type: 'line',
    source: ROUTE_SOURCE_ID,
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: {
      'line-color': '#059669',
      'line-width': 3,
      'line-opacity': 0.75,
    },
  });
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

function applyCamera(
  map: mapboxgl.Map,
  points: MarkerPoint[],
  cfg: ReturnType<typeof framingConfig>,
  driverCoords: LatLng | null,
  pickupCoords: LatLng | null,
  destinationCoords: LatLng | null,
  userLocationCoords: LatLng | null | undefined,
  cameraFraming: MapboxCameraFraming,
): void {
  if (points.length === 0) {
    map.jumpTo({
      center: getCameraCenterLngLat(
        driverCoords,
        pickupCoords,
        destinationCoords,
        userLocationCoords,
        cameraFraming,
      ),
      zoom: cfg.fallbackNoMarkers,
    });
  } else if (points.length === 1) {
    map.jumpTo({
      center: [points[0].lng, points[0].lat],
      zoom: cfg.singlePoint,
    });
  } else {
    const bounds = new mapboxgl.LngLatBounds();
    for (const p of points) {
      bounds.extend([p.lng, p.lat]);
    }
    map.fitBounds(bounds, {
      padding: cfg.fitPadding,
      maxZoom: cfg.fitMaxZoom,
      duration: 0,
    });
  }
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
  className = '',
  height,
}: MapboxMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [mapReady, setMapReady] = useState(false);

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

  const routePreviewCoords = useMemo(
    () =>
      buildRoutePreviewCoordinates({
        pickupCoords,
        destinationCoords,
        stops,
      }),
    [pickupCoords, destinationCoords, stops],
  );

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
      ),
    [
      points,
      cameraFraming,
      driverCoords,
      pickupCoords,
      destinationCoords,
      userLocationCoords,
    ],
  );

  const routeKey = useMemo(
    () => routeSyncKey(routePreviewCoords, showRoute),
    [routePreviewCoords, showRoute],
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
      style: 'mapbox://styles/mapbox/streets-v12',
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

  /** Route polyline: update when geometry or visibility changes. */
  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map) return;
    addOrUpdateRoutePreview(map, routePreviewCoords, showRoute);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- routeKey encodes line + showRoute
  }, [mapReady, routeKey]);

  /** Camera: jumpTo / fitBounds only when coarse scene signature changes (not every GPS tick). */
  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map) return;
    const cfg = framingConfig(cameraFraming);
    applyCamera(map, points, cfg, driverCoords, pickupCoords, destinationCoords, userLocationCoords, cameraFraming);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- cameraKey encodes framing + coarse geometry
  }, [mapReady, cameraKey]);

  if (!canRenderMap) {
    return (
      <div className="absolute inset-0 z-0">
        <MapPlaceholderFallback className={`h-full w-full ${className}`} height={height} />
      </div>
    );
  }

  return (
    <div className="absolute inset-0 z-0">
      <div
        ref={containerRef}
        className={`h-full w-full ${className}`}
        style={height ? { height } : undefined}
        role="presentation"
        aria-label="Map"
      />
    </div>
  );
}
