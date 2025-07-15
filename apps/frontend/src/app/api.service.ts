import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';

export interface Vessel {
  id: number;
  name: string;
  vessel_type: string | { id: number; name: string; color: string; };
  length_meters?: number;
  owner_name?: string;
  owner_contact?: string;
  home_port?: string;
  created: Date;
  last_updated: Date;
  // Position fields when includeLatestPosition=true
  latest_position_coordinates?: {
    type: 'Point';
    coordinates: [number, number];
  };
  latest_position_timestamp?: string;
  latest_position_speed?: string;
  latest_position_heading?: string;
}

export interface VesselTelemetry {
  id: number;
  vessel_id: number;
  position: {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
  };
  speed_knots?: number;
  heading_degrees?: number;
  timestamp: Date;
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl || 'http://localhost:3000/api';

  getVessels(): Observable<Vessel[]> {
    return this.http.get<Vessel[]>(`${this.apiUrl}/vessels`);
  }

  getActiveVessels(): Observable<Vessel[]> {
    return this.http.get<Vessel[]>(`${this.apiUrl}/vessels?includeLatestPosition=true`);
  }

  getVesselTelemetry(vesselId: number, limit: number = 1): Observable<VesselTelemetry[]> {
    return this.http.get<VesselTelemetry[]>(`${this.apiUrl}/vessels/${vesselId}/telemetry?limit=${limit}`);
  }
}
