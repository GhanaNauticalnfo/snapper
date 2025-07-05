// apps/api/src/app/volta-depth/dto/upload-response.dto.ts

export class UploadResponseDto {
    /**
     * A unique identifier for this specific upload session.
     * Used by the client to commit the upload later.
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
     * Helps the frontend decide whether to show a "Create" or "Update" dialog.
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
     * The current version number of the tile in the database, if it exists (isUpdate is true).
     * Undefined if the tile is new.
     */
    currentVersion?: number;
  }