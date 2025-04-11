// libs/map/src/lib/layers/ais/ais-ships-layer.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Map, GeoJSONSource } from 'maplibre-gl';
import { BaseLayerService } from '../base-layer.service';
import { lastValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AisShipLayerService extends BaseLayerService {
  readonly layerId = 'ais-ships';
  private map: Map | null = null;
  private updateInterval: any;
  
  constructor(private http: HttpClient) {
    super();
  }
  
  initialize(map: Map): void {
    this.map = map;
    
    // Add image for ship icon if not already added
    if (!map.hasImage('ship-icon')) {
      // Use the Promise-based loadImage API
      map.loadImage('/assets/sprites/ship.png')
        .then(response => {
          if (this.map) {
            this.map.addImage('ship-icon', response.data);
            this.initializeLayers();
          }
        })
        .catch(error => {
          console.error('Failed to load ship icon:', error);
          // Use a circle as fallback
          this.initializeWithFallbackIcon();
        });
    } else {
      this.initializeLayers();
    }
  }
  
  private initializeWithFallbackIcon(): void {
    if (!this.map) return;
    
    // Use a simple circle as fallback
    this.map.addSource(this.layerId, {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] }
    });
    
    // Use a circle layer instead of symbol layer
    this.map.addLayer({
      id: this.layerId,
      type: 'circle',
      source: this.layerId,
      paint: {
        'circle-radius': 5,
        'circle-color': '#007cbf',
        'circle-stroke-width': 1,
        'circle-stroke-color': '#fff'
      }
    });
    
    // Start periodic updates
    this.beginUpdates();
  }
  
  private initializeLayers(): void {
    if (!this.map) return;
    
    // Add source for ships
    this.map.addSource(this.layerId, {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] }
    });
    
    // Add layer for ships
    this.map.addLayer({
      id: this.layerId,
      type: 'symbol',
      source: this.layerId,
      layout: {
        'icon-image': 'ship-icon',
        'icon-rotate': ['get', 'heading'],
        'icon-size': 0.75,
        'icon-allow-overlap': true
      }
    });
    
    // Start periodic updates
    this.beginUpdates();
  }
  
  async update(): Promise<void> {
    if (!this.map) return;
    
    try {
      // For testing, we'll skip the API call and generate mock data directly
      // In production, you would uncomment this code to fetch real data
      // const response = await lastValueFrom(this.http.get<any>('/api/ais-data'));
      
      const source = this.map.getSource(this.layerId) as GeoJSONSource;
      
      // Generate mock data for demo purposes
      const mockData = this.generateMockShipData();
      
      // Update the source with the mock data
      source.setData(mockData);
    } catch (error) {
      console.error('Failed to update AIS data:', error);
      
      // Use mock data as fallback
      const source = this.map.getSource(this.layerId) as GeoJSONSource;
      source.setData(this.generateMockShipData());
    }
  }
  
  private generateMockShipData(): GeoJSON.FeatureCollection {
    // If map is not available, use default center coordinates
    const center = this.map?.getCenter() || { lng: -74.5, lat: 40 };
    const features: GeoJSON.Feature[] = [];
    
    // Generate 25 random ships around the current map center
    for (let i = 0; i < 25; i++) {
      // Spread ships within roughly a 50km radius
      const lng = center.lng + (Math.random() - 0.5) * 0.5;
      const lat = center.lat + (Math.random() - 0.5) * 0.5;
      const heading = Math.random() * 360;
      
      features.push({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [lng, lat]
        },
        properties: {
          id: `ship-${i}`,
          name: `Vessel ${i}`,
          heading: heading,
          speed: Math.random() * 20,
          type: ['Cargo', 'Tanker', 'Passenger', 'Fishing'][Math.floor(Math.random() * 4)]
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
    }, 10000); // Update every 10 seconds
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