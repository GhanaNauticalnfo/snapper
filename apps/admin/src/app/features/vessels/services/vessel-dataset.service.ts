// features/vessels/services/vessel-dataset.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { VesselDataset } from '../models/vessel-dataset.model';

interface ApiVessel {
  id: number;
  name: string;
  registration_number: string;
  vessel_type: string;
  length_meters: number;
  owner_name: string;
  owner_contact: string;
  home_port: string;
  active: boolean;
  created: string;
  last_updated: string;
  tracking_points?: Array<{
    id: number;
    created: string;
    timestamp: string;
    vessel_id: number;
    position: {
      type: 'Point';
      coordinates: [number, number]; // [longitude, latitude]
    };
    speed_knots: string;
    heading_degrees: string;
    battery_level: string | null;
    signal_strength: string | null;
    device_id: string | null;
    status: string | null;
  }>;
}

@Injectable({
  providedIn: 'root'
})
export class VesselDatasetService {
  private apiUrl = '/api/vessels';

  constructor(private http: HttpClient) {}

  private mapApiVesselToVesselDataset(apiVessel: ApiVessel): VesselDataset {
    // Get latest tracking point if available
    const latestTrackingPoint = apiVessel.tracking_points && apiVessel.tracking_points.length > 0 
      ? apiVessel.tracking_points[0] // API should return latest first
      : null;
    
    const lastPosition = latestTrackingPoint 
      ? {
          latitude: latestTrackingPoint.position.coordinates[1], // latitude is second in GeoJSON
          longitude: latestTrackingPoint.position.coordinates[0] // longitude is first in GeoJSON
        }
      : { latitude: 0, longitude: 0 }; // Default when no tracking data
    
    return {
      id: apiVessel.id,
      name: apiVessel.name,
      type: apiVessel.vessel_type === 'Fishing' ? 'Canoe' : 'Vessel',
      last_seen: latestTrackingPoint ? new Date(latestTrackingPoint.timestamp) : new Date(apiVessel.last_updated),
      last_position: lastPosition,
      created: new Date(apiVessel.created),
      last_updated: new Date(apiVessel.last_updated),
      enabled: apiVessel.active
    };
  }

  getAll(): Observable<VesselDataset[]> {
    return this.http.get<ApiVessel[]>(this.apiUrl).pipe(
      map(vessels => vessels.map(vessel => this.mapApiVesselToVesselDataset(vessel)))
    );
  }

  getOne(id: number): Observable<VesselDataset> {
    return this.http.get<ApiVessel>(`${this.apiUrl}/${id}`).pipe(
      map(vessel => this.mapApiVesselToVesselDataset(vessel))
    );
  }

  getEnabled(): Observable<{ id: number; last_updated: Date }[]> {
    return this.http.get<ApiVessel[]>(this.apiUrl).pipe(
      map(vessels => 
        vessels
          .filter(v => v.active)
          .map(v => ({ id: v.id, last_updated: new Date(v.last_updated) }))
      )
    );
  }

  create(data: { name: string, type: 'Canoe' | 'Vessel', last_seen?: Date, last_position?: { latitude: number, longitude: number }, enabled?: boolean }): Observable<VesselDataset> {
    const createData = {
      name: data.name,
      registration_number: `GH-${Date.now()}`, // Generate a unique registration number
      vessel_type: data.type === 'Canoe' ? 'Fishing' : 'Passenger',
      length_meters: 15.0,
      owner_name: 'Unknown',
      owner_contact: '',
      home_port: 'Unknown',
      active: data.enabled !== undefined ? data.enabled : true
    };
    
    return this.http.post<ApiVessel>(this.apiUrl, createData).pipe(
      map(vessel => this.mapApiVesselToVesselDataset(vessel))
    );
  }

  update(id: number, data: { name?: string, type?: 'Canoe' | 'Vessel', last_seen?: Date, last_position?: { latitude: number, longitude: number }, enabled?: boolean }): Observable<VesselDataset> {
    const updateData: any = {};
    if (data.name) updateData.name = data.name;
    if (data.type) updateData.vessel_type = data.type === 'Canoe' ? 'Fishing' : 'Passenger';
    if (data.enabled !== undefined) updateData.active = data.enabled;
    
    return this.http.patch<ApiVessel>(`${this.apiUrl}/${id}`, updateData).pipe(
      map(vessel => this.mapApiVesselToVesselDataset(vessel))
    );
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}