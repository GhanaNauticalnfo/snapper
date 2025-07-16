/**
 * Volta depth tile interface
 */
export interface VoltaDepthTile {
  id: number;
  tile_x: number;
  tile_y: number;
  tile_z: number;
  min_depth: number;
  max_depth: number;
  feature_count: number;
  created_at: Date;
  updated_at: Date;
}

/**
 * Volta depth tile feature interface
 */
export interface VoltaDepthTileFeature {
  id: number;
  tile_id: number;
  depth: number;
  created_at: Date;
  updated_at: Date;
}

/**
 * Tile info for upload
 */
export interface TileInfo {
  x: number;
  y: number;
  z: number;
  features: number;
  depths: string;
}

/**
 * Upload response DTO
 */
export interface UploadResponse {
  uploadId: string;
  deducedTileId: string;
  isUpdate: boolean;
  featureCount: number;
  message: string;
  currentVersion?: number;
}

/**
 * Commit upload DTO
 */
export interface CommitUpload {
  uploadId: string;
}