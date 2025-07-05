// apps/admin/src/app/features/volta-depth/models/tile-definition.model.ts
import { Feature, Polygon } from 'geojson'; // Requires: npm install --save-dev @types/geojson

/**
 * Represents the structure of a predefined Volta tile boundary.
 * Mirrors the backend TileDefinition interface used in the constant.
 */
export interface TileDefinition extends Feature<Polygon> {
  /**
   * Properties associated with the tile boundary feature.
   */
  properties: {
    /** The unique identifier of the tile (e.g., 'AA'). */
    id: string;
    /** The longitude of the left edge. */
    left: number;
    /** The latitude of the top edge. */
    top: number;
    /** The longitude of the right edge. */
    right: number;
    /** The latitude of the bottom edge. */
    bottom: number;
    /** The row index in the conceptual grid. */
    row_index: number;
    /** The column index in the conceptual grid. */
    col_index: number;
  };
  /**
   * The geometric representation (bounding box) of the tile.
   */
  geometry: Polygon;
}