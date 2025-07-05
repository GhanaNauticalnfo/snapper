// apps/admin/src/app/features/volta-depth/models/tile-info.model.ts

/**
 * Represents the metadata for a single tile stored in the backend.
 * Mirrors the backend TileInfoDto.
 */
export interface TileInfo {
    /**
     * The unique identifier of the tile (e.g., 'AA', 'BD').
     */
    id: string;
  
    /**
     * The number of features currently stored for this tile.
     */
    numberOfFeatures: number;
  
    /**
     * The timestamp when this tile metadata record was first created.
     * Can be received as a string from JSON, often converted to Date object.
     */
    created: Date | string;
  
    /**
     * The timestamp when this tile metadata record was last updated.
     * Can be received as a string from JSON, often converted to Date object.
     */
    lastUpdated: Date | string;
  
    /**
     * The current version number of the tile data.
     */
    version: number;
  }