import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';
import { VesselResponse, VesselTelemetryResponse } from '@ghanawaters/shared-models';

// Use shared models from the library
export type Vessel = VesselResponse;
export type VesselTelemetry = VesselTelemetryResponse;

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
