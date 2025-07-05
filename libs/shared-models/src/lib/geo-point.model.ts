/**
 * Geographic coordinate types and utilities for the Snapper system.
 * 
 * This module provides a unified approach to handling geographic coordinates
 * across the entire codebase, ensuring type safety and consistency.
 */

/**
 * Named tuple for coordinates in GeoJSON order: [longitude, latitude]
 * This follows the GeoJSON specification and PostGIS convention.
 */
export type Coordinates = [lon: number, lat: number];

/**
 * Standard GeoJSON Point type used for API responses and PostGIS storage.
 * Coordinates are in [longitude, latitude] order as per GeoJSON spec.
 */
export interface GeoPoint {
  type: 'Point';
  coordinates: Coordinates;
}

/**
 * Alternative coordinate format using lat/lng properties.
 * Used in some frontend libraries and for compatibility.
 */
export interface LatLng {
  lat: number;
  lng: number;
}

/**
 * Extended GeoPoint with optional metadata for tracking points.
 */
export interface GeoPointWithMetadata extends GeoPoint {
  accuracy?: number;  // GPS accuracy in meters
  altitude?: number;  // Altitude in meters
  heading?: number;   // Direction in degrees (0-360)
  speed?: number;     // Speed in knots
}

/**
 * Waypoint type for routes (moved from route.entity.ts for reusability)
 */
export interface Waypoint {
  id?: string;
  lat: number;
  lng: number;
  name?: string;
  order: number;
}

/**
 * Utility functions for working with geographic coordinates
 */
export class GeoPointUtils {
  /**
   * Convert LatLng to GeoPoint format
   */
  static toGeoPoint(latLng: LatLng): GeoPoint {
    return {
      type: 'Point',
      coordinates: [latLng.lng, latLng.lat]
    };
  }

  /**
   * Convert GeoPoint to LatLng format
   */
  static toLatLng(geoPoint: GeoPoint): LatLng {
    return {
      lat: geoPoint.coordinates[1],
      lng: geoPoint.coordinates[0]
    };
  }

  /**
   * Create a GeoPoint from longitude and latitude values
   */
  static createGeoPoint(longitude: number, latitude: number): GeoPoint {
    return {
      type: 'Point',
      coordinates: [longitude, latitude]
    };
  }

  /**
   * Validate if coordinates are within valid ranges
   */
  static isValidCoordinate(lon: number, lat: number): boolean {
    return lon >= -180 && lon <= 180 && lat >= -90 && lat <= 90;
  }

  /**
   * Validate if a point is within Ghana's maritime boundaries (approximate)
   */
  static isWithinGhanaBounds(point: GeoPoint): boolean {
    const [lon, lat] = point.coordinates;
    // Approximate bounds for Ghana's maritime area
    return lon >= -3.5 && lon <= 1.5 && lat >= 4.0 && lat <= 11.5;
  }

  /**
   * Calculate distance between two points in nautical miles
   * Uses Haversine formula
   */
  static distanceInNauticalMiles(point1: GeoPoint, point2: GeoPoint): number {
    const R = 3440.065; // Earth's radius in nautical miles
    const [lon1, lat1] = point1.coordinates;
    const [lon2, lat2] = point2.coordinates;
    
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    
    return R * c;
  }

  private static toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
}

/**
 * Type guards for runtime type checking
 */
export function isGeoPoint(obj: any): obj is GeoPoint {
  return obj && 
         obj.type === 'Point' && 
         Array.isArray(obj.coordinates) && 
         obj.coordinates.length === 2 &&
         typeof obj.coordinates[0] === 'number' &&
         typeof obj.coordinates[1] === 'number';
}

export function isLatLng(obj: any): obj is LatLng {
  return obj && 
         typeof obj.lat === 'number' && 
         typeof obj.lng === 'number';
}

/**
 * Constants for Ghana maritime boundaries
 */
export const GHANA_MARITIME_BOUNDS = {
  minLon: -3.5,
  maxLon: 1.5,
  minLat: 4.0,
  maxLat: 11.5,
  center: GeoPointUtils.createGeoPoint(-1.0, 5.5)
};