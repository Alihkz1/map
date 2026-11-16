'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Map as MapLibreMap,
  NavigationControl,
  setWorkerUrl,
  type StyleSpecification,
  type RasterTileSource,
} from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

setWorkerUrl(
  new URL(
    'maplibre-gl/dist/maplibre-gl-worker.mjs',
    import.meta.url,
  ).toString(),
);

type MapMode = 'satellite' | 'traffic';

const TOMTOM_API_KEY = process.env.NEXT_PUBLIC_TOMTOM_API_KEY;

const fallbackBasemap = {
  type: 'raster' as const,
  tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
  tileSize: 256,
  attribution: '&copy; OpenStreetMap contributors',
};

function createMapStyle(): StyleSpecification {
  const sources: StyleSpecification['sources'] = {
    fallback: fallbackBasemap,
  };
  const layers: StyleSpecification['layers'] = [
    {
      id: 'fallback',
      type: 'raster',
      source: 'fallback',
      paint: {
        'raster-fade-duration': 0,
      },
    },
  ];

  if (TOMTOM_API_KEY) {
    sources.satellite = {
      type: 'raster' as const,
      tiles: [
        `https://api.tomtom.com/maps/orbis/display/satellite/tile/{z}/{x}/{y}?apiVersion=2&key=${encodeURIComponent(TOMTOM_API_KEY)}&style=main`,
      ],
      tileSize: 256,
      maxzoom: 19,
      attribution: '&copy; TomTom',
    };
    sources['traffic-basemap'] = {
      type: 'raster',
      tiles: [
        `https://api.tomtom.com/maps/orbis/display/raster/tile/{z}/{x}/{y}?apiVersion=2&key=${encodeURIComponent(TOMTOM_API_KEY)}&style=street-light&tileSize=512`,
      ],
      tileSize: 512,
      attribution: '&copy; TomTom',
    };
    sources['traffic-flow'] = {
      type: 'raster',
      tiles: [
        `https://api.tomtom.com/maps/orbis/traffic/flow/raster/tile/{z}/{x}/{y}?apiVersion=2&key=${encodeURIComponent(TOMTOM_API_KEY)}&style=light&tileSize=256`,
      ],
      tileSize: 256,
      attribution: '&copy; TomTom',
    };

    layers.push({
      id: 'satellite',
      type: 'raster',
      source: 'satellite',
      layout: {
        visibility: 'visible',
      },
      paint: {
        'raster-fade-duration': 0,
      },
    });
    layers.push({
      id: 'traffic-basemap',
      type: 'raster',
      source: 'traffic-basemap',
      layout: {
        visibility: 'none',
      },
      paint: {
        'raster-fade-duration': 0,
      },
    });
    layers.push({
      id: 'traffic-flow',
      type: 'raster',
      source: 'traffic-flow',
      layout: {
        visibility: 'none',
      },
      paint: {
        'raster-opacity': 0.9,
        'raster-fade-duration': 0,
      },
    });
  }

  return {
    version: 8,
    sources,
    layers,
  };
}

export default function Map() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<MapLibreMap>(null);
  const requestedMode = useRef<MapMode>('satellite');
  const styleReady = useRef(false);
  const failedSources = useRef(new Set<string>());
  const [mode, setMode] = useState<MapMode>('satellite');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function applyMode(map: MapLibreMap) {
    if (!styleReady.current) return;
    for (const id of ['satellite', 'traffic-basemap', 'traffic-flow']) {
      const visible = (requestedMode.current === 'satellite' ? id === 'satellite' : id !== 'satellite') && !failedSources.current.has(id);
      if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', visible ? 'visible' : 'none');
    }
    const affected = requestedMode.current === 'satellite' ? ['satellite'] : ['traffic-basemap', 'traffic-flow'];
    setError(affected.some(id => failedSources.current.has(id)) ? 'This map layer could not be loaded. Check your connection or TomTom API access. The street map is still available.' : null);
  }

  useEffect(() => {
    if (!mapContainer.current) return;
    styleReady.current = false;
    failedSources.current.clear();
    const map = new MapLibreMap({ container: mapContainer.current, style: createMapStyle(), center: [51.389, 35.6892], zoom: 11, fadeDuration: 0, attributionControl: { compact: true } });
    mapInstance.current = map;
    const observer = new ResizeObserver(() => map.resize());
    observer.observe(mapContainer.current);
    map.addControl(new NavigationControl({ showCompass: false }), 'top-right');
    map.on('style.load', () => { styleReady.current = true; applyMode(map); });
    map.on('idle', () => setLoading(false));
    map.on('error', event => {
      const sourceId = (event as typeof event & { sourceId?: string }).sourceId;
      if (sourceId && ['satellite', 'traffic-basemap', 'traffic-flow'].includes(sourceId)) {
        failedSources.current.add(sourceId);
        applyMode(map);
      } else {
        setError('Some map tiles could not be loaded. Check your connection and map provider access.');
      }
      setLoading(false);
    });
    return () => { observer.disconnect(); styleReady.current = false; mapInstance.current = null; map.remove(); };
  }, []);

  function changeMode(next: MapMode) {
    requestedMode.current = next;
    setMode(next);
    const map = mapInstance.current;
    if (map) { setLoading(!map.areTilesLoaded()); applyMode(map); }
  }
  function retry() {
    const map = mapInstance.current;
    if (!map || !styleReady.current) return;
    failedSources.current.clear();
    for (const [id, specification] of Object.entries(createMapStyle().sources)) {
      if (specification.type === 'raster' && specification.tiles) (map.getSource(id) as RasterTileSource | undefined)?.setTiles(specification.tiles);
    }
    setLoading(true);
    applyMode(map);
  }

  return <main className="map-stage">
    <section className="phone" aria-label="iPhone 18 style map preview">
      <span className="phone-key phone-key-silent" aria-hidden="true" /><span className="phone-key phone-key-volume" aria-hidden="true" /><span className="phone-key phone-key-power" aria-hidden="true" />
      <div className="phone-screen">
        <div ref={mapContainer} className="phone-map" aria-label={`${mode === 'satellite' ? 'Satellite' : 'Traffic'} map of Tehran`} />
        <div className="phone-status" aria-hidden="true"><span>9:41</span><span className="phone-island"><i /></span><span className="phone-status-icons"><svg width="16" height="13" viewBox="0 0 16 13" fill="currentColor"><rect x="0" y="9" width="3" height="4" rx=".7"/><rect x="4" y="6" width="3" height="7" rx=".7"/><rect x="8" y="3" width="3" height="10" rx=".7"/><rect x="12" width="3" height="13" rx=".7"/></svg><span className="phone-battery" /></span></div>
        {(error || !TOMTOM_API_KEY) && <div className="map-notice" role="status">{error || 'A TomTom API key is required for satellite imagery and live traffic.'}{error && <button type="button" onClick={retry}>Try again</button>}</div>}
        <div className="map-dock">
          <div className="map-modes" role="group" aria-label="Map mode">
            <button type="button" aria-pressed={mode === 'satellite'} disabled={!TOMTOM_API_KEY} onClick={() => changeMode('satellite')}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="m12 3 9 5-9 5-9-5 9-5Zm-9 9 9 5 9-5M3 16l9 5 9-5" strokeLinecap="round" strokeLinejoin="round"/></svg>Satellite</button>
            <button type="button" aria-pressed={mode === 'traffic'} disabled={!TOMTOM_API_KEY} onClick={() => changeMode('traffic')}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M8 3H5v18h3M16 3h3v18h-3M12 4v3m0 4v3m0 4v3" strokeLinecap="round" strokeLinejoin="round"/></svg>Traffic</button>
          </div>
        </div>
        <div className="phone-home" aria-hidden="true" />
      </div>
    </section>
  </main>;
}
