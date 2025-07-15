import { GeoPoint } from './geo-point.model';
import { VesselTypeResponse } from './vessel-type.model';

/**
 * Base vessel interface used across all applications
 */
export interface Vessel {
  id: number;
  created: Date;
  last_updated: Date;
  name: string;
  vessel_type_id?: number;
}

/**
 * Input DTO for creating/updating vessels
 */
export interface VesselInput {
  name: string;
  vessel_type_id: number;
}

/**
 * Response DTO for vessel data from API
 */
export interface VesselResponse {
  id: number;
  created: Date;
  last_updated: Date;
  name: string;
  vessel_type: VesselTypeResponse;
  latest_position_coordinates?: GeoPoint;
  latest_position_timestamp?: Date;
  latest_position_speed?: number;
  latest_position_heading?: number;
  settings?: Record<string, string>;
}