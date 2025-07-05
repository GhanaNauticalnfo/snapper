// libs/map/src/lib/layers/weather/weather-layer.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Map, GeoJSONSource } from 'maplibre-gl';
import { BaseLayerService } from '../base-layer.service';
import { lastValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class WeatherLayerService extends BaseLayerService {
  readonly layerId = 'weather';
  private map: Map | null = null;
  private updateInterval: any;
  
  constructor(private http: HttpClient) {
    super();
  }
  
  initialize(map: Map): void {
    this.map = map;
    
    // Add source for weather data
    map.addSource(this.layerId, {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] }
    });
    
    // Add heat map layer for weather
    map.addLayer({
      id: this.layerId,
      type: 'heatmap',
      source: this.layerId,
      paint: {
        'heatmap-weight': ['get', 'intensity'],
        'heatmap-intensity': 1,
        'heatmap-color': [
          'interpolate',
          ['linear'],
          ['heatmap-density'],
          0, 'rgba(0, 0, 255, 0)',
          0.2, 'rgba(0, 0, 255, 0.5)',
          0.4, 'rgba(0, 255, 255, 0.7)',
          0.6, 'rgba(0, 255, 0, 0.7)',
          0.8, 'rgba(255, 255, 0, 0.8)',
          1, 'rgba(255, 0, 0, 1)'
        ],
        'heatmap-radius': 20,
        'heatmap-opacity': 0.7
      }
    });
    
    // Start periodic updates
    this.beginUpdates();
  }
  
  async update(): Promise<void> {
    if (!this.map) return;
    
    try {
      // Example API call to get weather data
      const response = await lastValueFrom(this.http.get<any>('/api/weather-data'));
      
      const source = this.map.getSource(this.layerId) as GeoJSONSource;
      if (response && response.features) {
        source.setData(response);
      } else {
        // Generate mock data for demo
        source.setData(this.generateMockWeatherData());
      }
    } catch (error) {
      console.error('Failed to update weather data:', error);
      
      // Use mock data as fallback
      const source = this.map.getSource(this.layerId) as GeoJSONSource;
      source.setData(this.generateMockWeatherData());
    }
  }
  
  private generateMockWeatherData(): GeoJSON.FeatureCollection {
    const center = this.map?.getCenter() || { lng: -74.5, lat: 40 };
    const features: GeoJSON.Feature[] = [];
    
    // Generate 200 random weather data points
    for (let i = 0; i < 200; i++) {
      const lng = center.lng + (Math.random() - 0.5) * 4;
      const lat = center.lat + (Math.random() - 0.5) * 4;
      const intensity = Math.random();
      
      features.push({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [lng, lat]
        },
        properties: {
          intensity: intensity,
          temperature: 15 + Math.random() * 20
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