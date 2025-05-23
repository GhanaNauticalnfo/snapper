// libs/map/src/lib/layers/nwnm/nw-nm.models.ts
import {
    Feature,
    // FeatureCollection, // Removed unused import
    Geometry,
    GeoJsonProperties // Still needed for type definition below if desired, or remove if not extending
} from 'geojson';

export interface NwNmMessagePart {
  // Allow geometry to be a standard Feature containing Geometry|null, OR just a Geometry object itself
  geometry?: Feature<Geometry | null, GeoJsonProperties> | Geometry;
  // Note: GeoJsonProperties here allows null for the properties object in the Feature definition
}

export interface NwNmMessage {
  id: number | string;
  mainType: 'NW' | 'NM';
  parts?: NwNmMessagePart[];
}

/**
 * Defines the properties specific to NW-NM features.
 * We define it directly instead of extending GeoJsonProperties to avoid TS2312.
 */
export interface NwNmFeatureProperties {
    messageId: number | string;
    mainType: 'NW' | 'NM';
    // Add other known specific properties here if applicable

    // Use 'unknown' instead of 'any' for better type safety
    // Allows merging with properties from the original GeoJSON feature
    [key: string]: unknown;
}


/**
 * Type alias for a GeoJSON Feature specific to NW-NM data.
 * Uses a type alias instead of an empty interface extending Feature.
 */
export type NwNmFeature = Feature<Geometry | null, NwNmFeatureProperties>;