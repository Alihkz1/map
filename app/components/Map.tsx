'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Map as MapLibreMap,
  NavigationControl,
  setWorkerUrl,
  type StyleSpecification,
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
  const [mode, setMode] = useState<MapMode>('satellite');
  const [providerError, setProviderError] = useState<string | null>(null);

  useEffect(() => {
    if (!mapContainer.current) return;

    const map = new MapLibreMap({
      container: mapContainer.current,
      style: createMapStyle(),
      center: [51.389, 35.6892],
      zoom: 10,
      fadeDuration: 0,
    });

    map.addControl(new NavigationControl(), 'bottom-right');
    map.on('error', (event) => {
      const message = event.error?.message ?? '';

      if (message.includes('api.tomtom.com') && message.includes('401')) {
        setProviderError(
          'The configured TomTom API key was rejected. Showing the standard map instead.',
        );
      }
    });
    mapInstance.current = map;

    return () => {
      mapInstance.current = null;
      map.remove();
    };
  }, []);

  const changeMode = (nextMode: MapMode) => {
    if (nextMode === mode) return;

    setProviderError(null);
    setMode(nextMode);

    const map = mapInstance.current;
    if (!map) return;

    const satelliteVisibility =
      nextMode === 'satellite' ? 'visible' : 'none';
    const trafficVisibility = nextMode === 'traffic' ? 'visible' : 'none';

    if (map.getLayer('satellite')) {
      map.setLayoutProperty('satellite', 'visibility', satelliteVisibility);
    }

    for (const layerId of ['traffic-basemap', 'traffic-flow']) {
      if (map.getLayer(layerId)) {
        map.setLayoutProperty(layerId, 'visibility', trafficVisibility);
      }
    }
  };

  return (
    <main
      className="relative h-dvh min-h-105 w-full overflow-hidden bg-slate-200"
      style={{
        position: 'relative',
        width: '100%',
        height: '100dvh',
        minHeight: '420px',
        overflow: 'hidden',
        background: '#dce4e8',
      }}
    >
      <div
        ref={mapContainer}
        className="absolute inset-0"
        style={{ position: 'absolute', inset: 0 }}
      />

      <div className="pointer-events-none absolute top-4 left-1/2 z-10 flex w-[min(360px,calc(100%-32px))] -translate-x-1/2 flex-col items-center gap-2 max-[480px]:top-2.5 max-[480px]:w-[calc(100%-20px)]">
        <div
          className="pointer-events-auto grid w-full grid-cols-2 rounded-[14px] border border-white/40 bg-gray-900/90 p-1 shadow-xl backdrop-blur-md"
          role="group"
          aria-label="Map mode"
        >
          <button
            type="button"
            className={`min-h-10 cursor-pointer rounded-[10px] border-0 text-sm font-bold tracking-wide transition focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-sky-400 motion-reduce:transition-none ${
              mode === 'satellite'
                ? 'bg-white text-gray-900 shadow-md'
                : 'bg-transparent text-gray-300 hover:bg-white/10 hover:text-white'
            }`}
            aria-pressed={mode === 'satellite'}
            onClick={() => changeMode('satellite')}
          >
            Mode 1
          </button>
          <button
            type="button"
            className={`min-h-10 cursor-pointer rounded-[10px] border-0 text-sm font-bold tracking-wide transition focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-sky-400 motion-reduce:transition-none ${
              mode === 'traffic'
                ? 'bg-white text-gray-900 shadow-md'
                : 'bg-transparent text-gray-300 hover:bg-white/10 hover:text-white'
            }`}
            aria-pressed={mode === 'traffic'}
            onClick={() => changeMode('traffic')}
          >
            Mode 2
          </button>
        </div>

        {(providerError || !TOMTOM_API_KEY) && (
          <p
            className="pointer-events-auto m-0 rounded-lg bg-amber-900/95 px-3 py-2 text-center text-xs leading-snug text-amber-100 shadow-lg"
            role="status"
          >
            {providerError ??
              'Add NEXT_PUBLIC_TOMTOM_API_KEY for satellite imagery and live traffic.'}
          </p>
        )}
      </div>
    </main>
  );
}
