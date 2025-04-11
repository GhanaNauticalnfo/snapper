// apps/admin/src/app/features/volta-depth/utils/map-utils.ts

import type { MapOptions, AttributionControlOptions, LngLatBoundsLike } from 'maplibre-gl';

/**
 * Bounds for the entire Volta Lake tile grid
 * Determined from the lake_volta_tiles.geojson file
 */
export const VOLTA_LAKE_BOUNDS: LngLatBoundsLike = [
  [-1.501092, 6.222649], // Southwest corner [lng, lat]
  [0.332523, 8.98927]    // Northeast corner [lng, lat]
];

/**
 * Center point of the Volta Lake region
 */
export const VOLTA_LAKE_CENTER: [number, number] = [-0.584, 7.606];

/**
 * Creates a standard OpenStreetMap configuration for MapLibre
 * that can be used consistently across the application.
 * 
 * @param container The HTML element to contain the map
 * @param center Initial center coordinates [longitude, latitude]
 * @param zoom Initial zoom level
 * @returns MapOptions object for MapLibre initialization
 */
export function createOsmMapOptions(
  container: HTMLElement,
  center: [number, number] = VOLTA_LAKE_CENTER,
  zoom = 8,
): MapOptions {
  return {
    container,
    style: {
      version: 8,
      sources: {
        'osm-tiles': {
          type: 'raster',
          tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
          tileSize: 256,
          attribution: '© OpenStreetMap contributors'
        }
      },
      layers: [
        {
          id: 'osm-tiles',
          type: 'raster',
          source: 'osm-tiles',
          minzoom: 0,
          maxzoom: 19
        }
      ]
    },
    center,
    zoom,
    attributionControl: {
      compact: false
    } as AttributionControlOptions
  };
}

/**
 * Default style for GeoJSON features displayed on the map
 */
export const defaultGeoJsonStyle = {
  fill: {
    paint: { 
      'fill-color': '#0d47a1', 
      'fill-opacity': 0.3 
    }
  },
  line: {
    paint: { 
      'line-color': '#000', 
      'line-width': 0.8 
    }
  }
};

/**
 * Utility to safely check if MapLibre is available in the global scope
 */
export function getMapLibreGl(): any {
  return typeof window !== 'undefined' ? (window as any)['maplibregl'] : undefined;
}

/**
 * Helper function to fit a map to the entire Volta Lake grid
 * with optional padding
 * 
 * @param map The MapLibre GL map instance
 * @param padding Optional padding in pixels
 */
export function fitMapToVoltaLakeBounds(map: any, padding = 50): void {
  if (!map) return;
  
  map.fitBounds(VOLTA_LAKE_BOUNDS, { 
    padding,
    maxZoom: 9 // Prevent zooming in too far
  });
}