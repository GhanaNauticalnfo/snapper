// apps/admin/src/app/features/volta-depth/models/upload-response.model.ts

/**
 * Represents the response received from the backend after uploading
 * and validating a GeoJSON file.
 * Mirrors the backend UploadResponseDto.
 */
export interface UploadResponse {
    /**
     * A unique identifier for this specific upload session.
     * Used to commit the upload later.
     * @example 'a1b2c3d4-e5f6-7890-1234-567890abcdef'
     */
    uploadId: string;
  
    /**
     * The ID of the tile boundary that the uploaded features were matched against.
     * @example 'BD'
     */
    deducedTileId: string;
  
    /**
     * Indicates if data for this tile ID already exists in the database.
     * Helps decide whether to show a "Create" or "Update" dialog/confirmation.
     */
    isUpdate: boolean;
  
    /**
     * The number of features found in the uploaded GeoJSON file.
     */
    featureCount: number;
  
    /**
     * A confirmation or status message for the user/frontend.
     * @example 'Validated successfully for Tile BD. Ready for commit.'
     */
    message: string;
  
    /**
     * The current version number of the tile in the database, if it exists
     * (i.e., if isUpdate is true). Undefined if the tile is new.
     */
    currentVersion?: number;
  }