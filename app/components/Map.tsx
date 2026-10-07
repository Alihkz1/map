'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Map as MapLibreMap,
  NavigationControl,
  setWorkerUrl,
  type StyleSpecification,
} from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import styles from './Map.module.css';

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

function createSatelliteStyle(): StyleSpecification {
  const sources: StyleSpecification['sources'] = {
    fallback: fallbackBasemap,
  };
  const layers: StyleSpecification['layers'] = [
    {
      id: 'fallback',
      type: 'raster',
      source: 'fallback',
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
    layers.push({
      id: 'satellite',
      type: 'raster',
      source: 'satellite',
    });
  }

  return {
    version: 8,
    sources,
    layers,
  };
}

function createTrafficStyle(): StyleSpecification {
  const trafficLayers: StyleSpecification['layers'] = [
    {
      id: 'fallback',
      type: 'raster',
      source: 'fallback',
    },
  ];

  const sources: StyleSpecification['sources'] = {
    fallback: fallbackBasemap,
  };

  if (TOMTOM_API_KEY) {
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

    trafficLayers.push({
      id: 'traffic-basemap',
      type: 'raster',
      source: 'traffic-basemap',
    });
    trafficLayers.push({
      id: 'traffic-flow',
      type: 'raster',
      source: 'traffic-flow',
      paint: {
        'raster-opacity': 0.9,
      },
    });
  }

  return {
    version: 8,
    sources,
    layers: trafficLayers,
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
      style: createSatelliteStyle(),
      center: [51.389, 35.6892],
      zoom: 10,
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
    mapInstance.current?.setStyle(
      nextMode === 'satellite'
        ? createSatelliteStyle()
        : createTrafficStyle(),
    );
  };

  return (
    <main className={styles.mapShell}>
      <div ref={mapContainer} className={styles.map} />

      <div className={styles.modePanel}>
        <div className={styles.modeSwitcher} role="group" aria-label="Map mode">
          <button
            type="button"
            className={mode === 'satellite' ? styles.activeMode : styles.modeButton}
            aria-pressed={mode === 'satellite'}
            onClick={() => changeMode('satellite')}
          >
            Satellite
          </button>
          <button
            type="button"
            className={mode === 'traffic' ? styles.activeMode : styles.modeButton}
            aria-pressed={mode === 'traffic'}
            onClick={() => changeMode('traffic')}
          >
            Traffic
          </button>
        </div>

        {(providerError || !TOMTOM_API_KEY) && (
          <p className={styles.keyNotice} role="status">
            {providerError ??
              'Add NEXT_PUBLIC_TOMTOM_API_KEY for satellite imagery and live traffic.'}
          </p>
        )}
      </div>
    </main>
  );
}
