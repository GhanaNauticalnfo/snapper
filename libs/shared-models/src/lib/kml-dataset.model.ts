/**
 * Base KML dataset interface
 */
export interface KmlDataset {
  id: number;
  created: Date;
  last_updated: Date;
  kml?: string;
  name?: string;
  enabled: boolean;
}

/**
 * Input DTO for creating/updating KML datasets
 */
export interface KmlDatasetInput {
  kml?: string;
  name?: string;
  enabled: boolean;
}

/**
 * Response DTO for KML dataset data from API
 */
export interface KmlDatasetResponse {
  id: number;
  created: string;
  last_updated: string;
  kml?: string;
  name?: string;
  enabled: boolean;
}