// libs/map/src/lib/layers/niord/niord-layer.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Map, GeoJSONSource } from 'maplibre-gl';
import { BaseLayerService } from '../base-layer.service';
import { lastValueFrom } from 'rxjs';
// Import from shared models library
import { NiordMessage, NiordResponse } from '@ghanawaters/shared-models';

@Injectable({
  providedIn: 'root'
})
export class NiordLayerService extends BaseLayerService {
  readonly layerId = 'niord';
  private map: Map | null = null;
  private updateInterval: any;
  
  constructor(private http: HttpClient) {
    super();
  }
  
  initialize(map: Map): void {
    this.map = map;
    
    // Add source for Niord data
    map.addSource(this.layerId, {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] }
    });
    
    // Add symbol layer for Niord messages
    map.addLayer({
      id: this.layerId,
      type: 'circle',
      source: this.layerId,
      paint: {
        'circle-radius': 8,
        'circle-color': '#FF8C00',
        'circle-stroke-width': 1,
        'circle-stroke-color': '#fff'
      }
    });
    
    // Start periodic updates
    this.beginUpdates();
  }
  
  async update(): Promise<void> {
    if (!this.map) return;
    
    try {
      // Example API call to get Niord messages
      const response = await lastValueFrom(this.http.get<NiordResponse>('/api/messages'));
      
      const source = this.map.getSource(this.layerId) as GeoJSONSource;
      if (response && response.data) {
        // Convert Niord messages to GeoJSON
        const features = this.convertMessagesToGeoJSON(response.data);
        source.setData({
          type: 'FeatureCollection',
          features
        });
      } else {
        // Use mock data as fallback
        source.setData(this.generateMockNiordData());
      }
    } catch (error) {
      console.error('Failed to update Niord data:', error);
      
      // Use mock data as fallback
      const source = this.map.getSource(this.layerId) as GeoJSONSource;
      source.setData(this.generateMockNiordData());
    }
  }
  
  private convertMessagesToGeoJSON(messages: NiordMessage[]): GeoJSON.Feature[] {
    // This would normally convert Niord messages to GeoJSON features
    // For simplicity, we'll return mock data
    return this.generateMockNiordData().features;
  }
  
  private generateMockNiordData(): GeoJSON.FeatureCollection {
    const center = this.map?.getCenter() || { lng: -74.5, lat: 40 };
    const features: GeoJSON.Feature[] = [];
    
    // Generate 10 random Niord message points
    for (let i = 0; i < 10; i++) {
      const lng = center.lng + (Math.random() - 0.5) * 2;
      const lat = center.lat + (Math.random() - 0.5) * 2;
      
      features.push({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [lng, lat]
        },
        properties: {
          id: `niord-msg-${i}`,
          title: `Navigation Warning ${i}`,
          type: Math.random() > 0.5 ? 'WARNING' : 'NOTICE',
          created: Date.now() - Math.floor(Math.random() * 86400000) // Random time in last 24 hours
        }
      });
    }
    
    return {
      type: 'FeatureCollection',
      features
    };
  }
  
  toggleVisibility(visible: boolean): void {
    if (!this.map) return;
    this.map.setLayoutProperty(this.layerId, 'visibility', visible ? 'visible' : 'none');
  }
  
  private beginUpdates(): void {
    // Initial update
    this.update();
    
    // Set up interval for regular updates
    this.updateInterval = setInterval(() => {
      this.update();
    }, 60000); // Update every minute
  }
  
  destroy(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
    
    if (this.map) {
      if (this.map.getLayer(this.layerId)) {
        this.map.removeLayer(this.layerId);
      }
      if (this.map.getSource(this.layerId)) {
        this.map.removeSource(this.layerId);
      }
    }
  }
}