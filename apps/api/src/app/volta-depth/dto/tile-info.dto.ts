// apps/api/src/app/volta-depth/dto/tile-info.dto.ts

export class TileInfoDto {
    /**
     * The unique identifier of the tile (e.g., 'AA', 'BD').
     */
    id: string;
  
    /**
     * The number of features currently stored for this tile.
     */
    numberOfFeatures: number;
  
    /**
     * The timestamp when this tile metadata record was first created in the database.
     */
    created: Date;
  
    /**
     * The timestamp when this tile metadata record was last updated (usually when new features were committed).
     */
    lastUpdated: Date;
  
    /**
     * The current version number of the tile data. Increments on each successful commit.
     */
    version: number;
  }