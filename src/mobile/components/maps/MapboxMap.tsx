import { useEffect, useMemo, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { MAPBOX_ACCESS_TOKEN } from '../../config/env';
import type { MapboxMapProps } from './types';
import { DEFAULT_MAP_CENTER } from './types';
import { buildRoutePreviewCoordinates } from './routePreview';

const ROUTE_SOURCE_ID = 'route-preview';
const ROUTE_LAYER_ID = 'route-preview-line';

type MarkerPoint = {
  lng: number;
  lat: number;
  kind: 'pickup' | 'destination' | 'driver' | 'stop';
};

function collectMarkerPoints(
  props: Pick<MapboxMapProps, 'pickupCoords' | 'destinationCoords' | 'driverCoords' | 'stops'>,
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
  return out;
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
    default:
      return '#64748b';
  }
}

function createMarkerElement(kind: MarkerPoint['kind']): HTMLDivElement {
  const el = document.createElement('div');
  el.style.width = '14px';
  el.style.height = '14px';
  el.style.borderRadius = '9999px';
  el.style.backgroundColor = markerColor(kind);
  el.style.border = '2px solid white';
  el.style.boxShadow = '0 1px 4px rgba(0,0,0,0.35)';
  return el;
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
  stops,
  showRoute = false,
  className = '',
  height,
}: MapboxMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);

  const points = useMemo(
    () =>
      collectMarkerPoints({
        pickupCoords,
        destinationCoords,
        driverCoords,
        stops,
      }),
    [pickupCoords, destinationCoords, driverCoords, stops],
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

  const canRenderMap = Boolean(MAPBOX_ACCESS_TOKEN && points.length > 0);

  useEffect(() => {
    if (!canRenderMap || !containerRef.current) {
      return;
    }

    mapboxgl.accessToken = MAPBOX_ACCESS_TOKEN;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [DEFAULT_MAP_CENTER.longitude, DEFAULT_MAP_CENTER.latitude],
      zoom: 13,
      attributionControl: true,
    });

    const clearMarkers = () => {
      for (const m of markersRef.current) {
        m.remove();
      }
      markersRef.current = [];
    };

    const addMarkers = () => {
      clearMarkers();
      for (const p of points) {
        const marker = new mapboxgl.Marker({ element: createMarkerElement(p.kind) })
          .setLngLat([p.lng, p.lat])
          .addTo(map);
        markersRef.current.push(marker);
      }

      if (points.length === 1) {
        map.jumpTo({ center: [points[0].lng, points[0].lat], zoom: 14 });
      } else {
        const bounds = new mapboxgl.LngLatBounds();
        for (const p of points) {
          bounds.extend([p.lng, p.lat]);
        }
        map.fitBounds(bounds, { padding: 48, maxZoom: 15, duration: 0 });
      }
    };

    const onLoad = () => {
      map.resize();
      addMarkers();
      addOrUpdateRoutePreview(map, routePreviewCoords, showRoute);
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
      clearMarkers();
      map.remove();
    };
  }, [canRenderMap, points, showRoute, routePreviewCoords]);

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
