// libs/map/src/lib/models/map-config.model.ts
import { LngLatLike } from 'maplibre-gl';
import { OSM_STYLE } from '../styles/osm-style';

export interface MapConfig {
  // Map initialization options
  mapStyle?: string | any; // Allow object style definitions
  center?: LngLatLike;
  zoom?: number;
  minZoom?: number;
  maxZoom?: number;
  height?: string;
  
  // Feature flags
  showControls?: boolean;
  showFullscreenControl?: boolean;
  showCoordinateDisplay?: boolean;
  
  // Layer options
  availableLayers?: string[];
  initialActiveLayers?: string[];
  
  // Custom layer name mappings
  layerNames?: Record<string, string>;
}

export const DEFAULT_MAP_CONFIG: MapConfig = {
  mapStyle: OSM_STYLE, // Use our OSM style definition
  center: [-74.5, 40],
  zoom: 9,
  height: '500px',
  showControls: true,
  showFullscreenControl: true,
  showCoordinateDisplay: true,
  availableLayers: [],
  initialActiveLayers: [],
  layerNames: {
    'ais-ships': 'AIS Ships',
    'niord': 'Niord',
    'depth': 'Depths',
    'nw-nm-layer': 'NW/NM',
    'nw-nm': 'NW/NM',
  }
};