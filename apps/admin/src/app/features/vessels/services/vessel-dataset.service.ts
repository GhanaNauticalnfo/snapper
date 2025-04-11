// features/vessels/services/vessel-dataset.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { VesselDataset } from '../models/vessel-dataset.model';
import { MOCK_VESSELS } from '../mock-vessel-data';

@Injectable({
  providedIn: 'root'
})
export class VesselDatasetService {
  private apiUrl = '/api/vessel-datasets'; // Keep this for future API implementation
  private mockData = MOCK_VESSELS;
  private nextId = 26; // Start after the last mock vessel ID

  constructor(private http: HttpClient) {}

  getAll(): Observable<VesselDataset[]> {
    // Return mock data instead of HTTP request
    return of([...this.mockData]);
  }

  getOne(id: number): Observable<VesselDataset> {
    // Find vessel by ID in mock data
    const vessel = this.mockData.find(v => v.id === id);
    if (!vessel) {
      throw new Error(`Vessel with ID ${id} not found`);
    }
    return of({...vessel});
  }

  getEnabled(): Observable<{ id: number; last_updated: Date }[]> {
    // Return only enabled vessels IDs and last_updated dates
    const enabledVessels = this.mockData
      .filter(v => v.enabled)
      .map(v => ({ id: v.id, last_updated: v.last_updated }));
    return of(enabledVessels);
  }

  create(data: { name: string, type: 'Canoe' | 'Vessel', last_seen?: Date, last_position?: { latitude: number, longitude: number }, enabled?: boolean }): Observable<VesselDataset> {
    // Create a new vessel with mock data
    const newVessel: VesselDataset = {
      id: this.nextId++,
      name: data.name,
      type: data.type,
      last_seen: data.last_seen || new Date(),
      last_position: data.last_position || { latitude: 0, longitude: 0 },
      enabled: data.enabled !== undefined ? data.enabled : true,
      created: new Date(),
      last_updated: new Date()
    };
    
    // Add to mock data array
    this.mockData.push(newVessel);
    
    return of({...newVessel});
  }

  update(id: number, data: { name?: string, type?: 'Canoe' | 'Vessel', last_seen?: Date, last_position?: { latitude: number, longitude: number }, enabled?: boolean }): Observable<VesselDataset> {
    // Find vessel by ID
    const index = this.mockData.findIndex(v => v.id === id);
    if (index === -1) {
      throw new Error(`Vessel with ID ${id} not found`);
    }
    
    // Update vessel data
    const updatedVessel: VesselDataset = {
      ...this.mockData[index],
      ...data,
      last_updated: new Date()
    };
    
    // Update in mock data array
    this.mockData[index] = updatedVessel;
    
    return of({...updatedVessel});
  }

  delete(id: number): Observable<void> {
    // Find vessel by ID
    const index = this.mockData.findIndex(v => v.id === id);
    if (index === -1) {
      throw new Error(`Vessel with ID ${id} not found`);
    }
    
    // Remove from mock data array
    this.mockData.splice(index, 1);
    
    return of(void 0);
  }
}