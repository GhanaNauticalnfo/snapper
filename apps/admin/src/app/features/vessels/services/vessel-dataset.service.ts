// features/vessels/services/vessel-dataset.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpResponse } from '@angular/common/http';
import { Observable, map, Subject } from 'rxjs';
import { VesselDataset, VesselTelemetry } from '../models/vessel-dataset.model';
import { environment } from '../../../../environments/environment';

export interface TelemetryExportFilters {
  startDate: string;
  endDate: string;
  vesselIds?: number[];
  vesselTypeIds?: number[];
}

export interface TelemetryExportStats {
  totalRecords: number;
  dateRange: {
    min: string;
    max: string;
  };
}

interface ApiVessel {
  id: number;
  name: string;
  vessel_type: {
    id: number;
    name: string;
    created_at: string;
    updated_at: string;
    vessel_count: number;
  };
  length_meters: number;
  owner_name: string;
  owner_contact: string;
  home_port: string;
  created: string;
  last_updated: string;
  vessel_telemetry?: VesselTelemetry[];
  // New position data from API
  latest_position_timestamp?: string;
  latest_position_speed?: string;
  latest_position_heading?: string;
  latest_position_coordinates?: {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude] GeoJSON format
  };
}

@Injectable({
  providedIn: 'root'
})
export class VesselDatasetService {
  private apiUrl = `${environment.apiUrl}/vessels`;

  constructor(private http: HttpClient) {}

  private mapApiVesselToVesselDataset(apiVessel: ApiVessel): VesselDataset {
    // Initialize with nulls - only set if we have actual position data
    let lastPosition: { latitude: number; longitude: number } | null = null;
    let lastSeen: Date | null = null;
    
    if (apiVessel.latest_position_coordinates) {
      // Use new API position format - GeoJSON coordinates are [lng, lat]
      lastPosition = {
        latitude: apiVessel.latest_position_coordinates.coordinates[1],  // latitude is second
        longitude: apiVessel.latest_position_coordinates.coordinates[0]  // longitude is first
      };
      lastSeen = apiVessel.latest_position_timestamp 
        ? new Date(apiVessel.latest_position_timestamp) 
        : new Date(apiVessel.last_updated);
    } else if (apiVessel.vessel_telemetry && apiVessel.vessel_telemetry.length > 0) {
      // Fallback to legacy vessel telemetry format
      const latestTelemetry = apiVessel.vessel_telemetry.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
      
      lastPosition = {
        latitude: latestTelemetry.position.coordinates[1], // latitude is second in GeoJSON
        longitude: latestTelemetry.position.coordinates[0] // longitude is first in GeoJSON
      };
      lastSeen = new Date(latestTelemetry.timestamp);
    }
    
    return {
      id: apiVessel.id,
      name: apiVessel.name,
      type: apiVessel.vessel_type?.name || 'Unspecified', // Use vessel type name from relation
      vessel_type_id: apiVessel.vessel_type?.id || 1, // Use vessel type ID from relation, default to 1 (Unspecified)
      last_seen: lastSeen,
      last_position: lastPosition,
      created: new Date(apiVessel.created),
      last_updated: new Date(apiVessel.last_updated),
      vessel_telemetry: apiVessel.vessel_telemetry
    };
  }

  getAll(): Observable<VesselDataset[]> {
    return this.http.get<ApiVessel[]>(`${this.apiUrl}?includeLatestPosition=true`).pipe(
      map(vessels => vessels.map(vessel => this.mapApiVesselToVesselDataset(vessel)))
    );
  }

  getOne(id: number): Observable<VesselDataset> {
    return this.http.get<ApiVessel>(`${this.apiUrl}/${id}`).pipe(
      map(vessel => this.mapApiVesselToVesselDataset(vessel))
    );
  }


  create(data: { name: string, vessel_type_id: number, last_seen?: Date, last_position?: { latitude: number, longitude: number } }): Observable<VesselDataset> {
    const createData = {
      name: data.name,
      vessel_type_id: data.vessel_type_id,
      length_meters: 15.0,
      owner_name: 'Unknown',
      owner_contact: '',
      home_port: 'Unknown',
    };
    
    return this.http.post<ApiVessel>(this.apiUrl, createData).pipe(
      map(vessel => this.mapApiVesselToVesselDataset(vessel))
    );
  }

  update(id: number, data: { name?: string, vessel_type_id?: number, last_seen?: Date, last_position?: { latitude: number, longitude: number } }): Observable<VesselDataset> {
    const updateData: any = {};
    if (data.name) updateData.name = data.name;
    if (data.vessel_type_id !== undefined) updateData.vessel_type_id = data.vessel_type_id;
    
    return this.http.put<ApiVessel>(`${this.apiUrl}/${id}`, updateData).pipe(
      map(vessel => this.mapApiVesselToVesselDataset(vessel))
    );
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  getNearbyVessels(latitude: number, longitude: number, radiusKm: number, timeWindowDays: number): Observable<VesselDataset[]> {
    // Since there's no nearby endpoint in the API, we'll get all vessels
    // and filter them client-side (this is a temporary solution)
    return this.getAll().pipe(
      map(vessels => {
        // Filter vessels that have position data and are within rough proximity
        return vessels.filter(vessel => {
          if (!vessel.last_position?.latitude || !vessel.last_position?.longitude) {
            return false;
          }
          
          // Simple distance calculation (not perfectly accurate but sufficient for demo)
          const latDiff = Math.abs(vessel.last_position.latitude - latitude);
          const lngDiff = Math.abs(vessel.last_position.longitude - longitude);
          const approximateDistance = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff) * 111; // rough km conversion
          
          return approximateDistance <= radiusKm;
        });
      })
    );
  }

  /**
   * Get telemetry export statistics
   */
  getTelemetryExportStats(filters?: Partial<TelemetryExportFilters>): Observable<TelemetryExportStats> {
    let params: any = {};
    
    if (filters?.startDate) params.startDate = filters.startDate;
    if (filters?.endDate) params.endDate = filters.endDate;
    if (filters?.vesselIds?.length) params.vesselIds = filters.vesselIds.join(',');
    if (filters?.vesselTypeIds?.length) params.vesselTypeIds = filters.vesselTypeIds.join(',');

    return this.http.get<TelemetryExportStats>(`${this.apiUrl}/telemetry/export/stats`, { params });
  }

  /**
   * Download telemetry data as zipped CSV
   */
  downloadTelemetryExport(filters: TelemetryExportFilters): Observable<number | 'complete'> {
    const subject = new Subject<number | 'complete'>();
    
    // Build query parameters
    const params: any = {
      startDate: filters.startDate,
      endDate: filters.endDate
    };
    
    if (filters.vesselIds?.length) {
      params.vesselIds = filters.vesselIds.join(',');
    }
    
    if (filters.vesselTypeIds?.length) {
      params.vesselTypeIds = filters.vesselTypeIds.join(',');
    }

    // Build URL with query parameters
    const url = new URL(`${this.apiUrl}/telemetry/export`, window.location.origin);
    Object.keys(params).forEach(key => {
      url.searchParams.append(key, params[key]);
    });

    // Create and trigger download
    const xhr = new XMLHttpRequest();
    xhr.open('GET', url.toString(), true);
    xhr.responseType = 'blob';
    
    // Track download progress
    xhr.onprogress = (event) => {
      if (event.lengthComputable) {
        const progress = Math.round((event.loaded / event.total) * 100);
        subject.next(progress);
      }
    };
    
    xhr.onload = () => {
      if (xhr.status === 200) {
        // Create download link
        const blob = xhr.response;
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        
        // Extract filename from Content-Disposition header or use default
        const contentDisposition = xhr.getResponseHeader('Content-Disposition');
        let filename = 'telemetry-export.zip';
        if (contentDisposition) {
          const matches = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(contentDisposition);
          if (matches != null && matches[1]) {
            filename = matches[1].replace(/['"]/g, '');
          }
        }
        
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(downloadUrl);
        
        subject.next('complete');
        subject.complete();
      } else {
        subject.error(new Error(`Download failed with status ${xhr.status}`));
      }
    };
    
    xhr.onerror = () => {
      subject.error(new Error('Download failed'));
    };
    
    // Start the download
    xhr.send();
    
    return subject.asObservable();
  }
}