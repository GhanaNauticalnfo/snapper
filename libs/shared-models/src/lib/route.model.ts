import { Waypoint } from './geo-point.model';

/**
 * Base route interface
 */
export interface Route {
  id: number;
  name: string;
  notes?: string;
  waypoints: Waypoint[];
  enabled: boolean;
  created: Date;
  last_updated: Date;
}

/**
 * Input DTO for creating/updating routes
 */
export interface RouteInput {
  name: string;
  notes?: string;
  waypoints: Waypoint[];
  enabled: boolean;
}

/**
 * Response DTO for route data from API
 */
export interface RouteResponse {
  id: number;
  name: string;
  notes?: string;
  waypoints: Waypoint[];
  enabled: boolean;
  created: string;
  last_updated: string;
  settings?: Record<string, string>;
}