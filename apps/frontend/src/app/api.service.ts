import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';

export interface Vessel {
  id: number;
  name: string;
  registration_number: string;
  vessel_type: string;
  length_meters?: number;
  owner_name?: string;
  owner_contact?: string;
  home_port?: string;
  active: boolean;
  created: Date;
  last_updated: Date;
}

export interface TrackingPoint {
  id: number;
  vessel_id: number;
  latitude: number;
  longitude: number;
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
    return this.http.get<Vessel[]>(`${this.apiUrl}/vessels?active=true`);
  }

  getVesselTracking(vesselId: number, limit: number = 1): Observable<TrackingPoint[]> {
    return this.http.get<TrackingPoint[]>(`${this.apiUrl}/vessels/${vesselId}/tracking?limit=${limit}`);
  }
}
