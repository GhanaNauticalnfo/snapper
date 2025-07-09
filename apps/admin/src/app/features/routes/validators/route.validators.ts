import { ValidatorFn, Validators } from '@angular/forms';
import { Waypoint } from '../models/route.model';

export class RouteValidators {
  static routeName(): ValidatorFn[] {
    return [
      Validators.required,
      Validators.maxLength(100)
    ];
  }

  static routeNotes(): ValidatorFn[] {
    return [
      Validators.maxLength(500)
    ];
  }

  static waypointLatitude(value: number): string | null {
    if (isNaN(value)) {
      return 'Latitude must be a number';
    }
    if (value < -90 || value > 90) {
      return 'Latitude must be between -90 and 90';
    }
    return null;
  }

  static waypointLongitude(value: number): string | null {
    if (isNaN(value)) {
      return 'Longitude must be a number';
    }
    if (value < -180 || value > 180) {
      return 'Longitude must be between -180 and 180';
    }
    return null;
  }

  static validateWaypointFormat(line: string): { valid: boolean; error?: string } {
    const parts = line.split(',').map(p => p.trim());
    
    if (parts.length !== 2) {
      return { valid: false, error: 'Invalid format. Expected "lat,lon"' };
    }

    const lat = parseFloat(parts[0]);
    const lng = parseFloat(parts[1]);

    const latError = RouteValidators.waypointLatitude(lat);
    if (latError) {
      return { valid: false, error: latError };
    }

    const lngError = RouteValidators.waypointLongitude(lng);
    if (lngError) {
      return { valid: false, error: lngError };
    }

    return { valid: true };
  }

  static parseWaypointsText(text: string): { waypoints: Waypoint[]; error?: string } {
    const lines = text.trim().split('\n').filter(line => line.trim());
    
    if (lines.length < 2) {
      return { waypoints: [], error: 'At least 2 waypoints are required' };
    }

    const waypoints: Waypoint[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const validation = RouteValidators.validateWaypointFormat(line);
      
      if (!validation.valid) {
        return { waypoints: [], error: `Line ${i + 1}: ${validation.error}` };
      }

      const parts = line.split(',').map(p => p.trim());
      const lat = parseFloat(parts[0]);
      const lng = parseFloat(parts[1]);

      waypoints.push({
        id: crypto.randomUUID(),
        lat,
        lng,
        order: i,
        name: `Waypoint ${i + 1}`
      });
    }

    return { waypoints };
  }
}