/**
 * Base vessel type interface
 */
export interface VesselType {
  id: number;
  name: string;
  color: string;
  created_at: Date;
  updated_at: Date;
}

/**
 * Input DTO for creating/updating vessel types
 */
export interface VesselTypeInput {
  name: string;
  color?: string;
}

/**
 * Response DTO for vessel type data from API
 */
export interface VesselTypeResponse {
  id: number;
  name: string;
  color: string;
  created_at: string;
  updated_at: string;
  vessel_count?: number;
  settings?: Record<string, string>;
}