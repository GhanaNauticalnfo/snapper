import { Injectable } from '@angular/core';
import { Map as MaplibreMap, LngLatBounds, Marker } from 'maplibre-gl';
import { BaseLayerService } from '../base-layer.service';

export interface RouteWaypoint {
  id: string;
  lat: number;
  lng: number;
  order: number;
  name?: string;
}

export interface RouteData {
  id?: number;
  name: string;
  notes?: string;
  waypoints: RouteWaypoint[];
  enabled: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class RouteLayerService extends BaseLayerService {
  readonly layerId = 'route-layer';
  private map: MaplibreMap | null = null;
  private routeData: RouteData | null = null;
  private markers: Marker[] = [];
  private readonly routeColor = '#000000'; // Always black

  constructor() {
    super();
  }

  initialize(map: MaplibreMap): void {
    this.map = map;
    
    // Wait for style to be loaded before updating display
    if (this.map.isStyleLoaded()) {
      this.updateDisplay();
    } else {
      this.map.once('styledata', () => {
        this.updateDisplay();
      });
    }
  }

  /**
   * Configure the service with API URL
   */
  configureApiUrl(apiUrl: string): void {
    // No longer needed for route color
  }

  async update(): Promise<void> {
    this.updateDisplay();
  }

  toggleVisibility(visible: boolean): void {
    // Implementation for toggling layer visibility
    if (!this.map) return;
    
    // Toggle markers visibility
    this.markers.forEach(marker => {
      if (visible) {
        marker.getElement().style.display = 'flex';
      } else {
        marker.getElement().style.display = 'none';
      }
    });

    // Toggle route line visibility
    if (this.map.getLayer('route-line-layer')) {
      this.map.setLayoutProperty('route-line-layer', 'visibility', visible ? 'visible' : 'none');
    }
  }

  destroy(): void {
    this.clearMarkers();
    this.clearRouteLine();
    this.map = null;
  }

  /**
   * Set the route data to display
   */
  setRouteData(routeData: RouteData | null): void {
    this.routeData = routeData;
    if (this.map) {
      // Ensure style is loaded before updating display
      if (this.map.isStyleLoaded()) {
        this.updateDisplay();
      } else {
        this.map.once('styledata', () => {
          this.updateDisplay();
        });
      }
    }
  }


  /**
   * Fit the map to show the entire route
   */
  fitToRoute(): void {
    if (!this.map || !this.routeData?.waypoints.length) return;
    
    // Check if map container has valid dimensions
    const container = this.map.getContainer();
    if (!container || container.offsetWidth === 0 || container.offsetHeight === 0) {
      console.warn('Map container has no dimensions, skipping fitBounds');
      // Try again after a delay
      setTimeout(() => this.fitToRoute(), 200);
      return;
    }

    try {
      const bounds = new LngLatBounds();
      this.routeData.waypoints.forEach(waypoint => {
        bounds.extend([waypoint.lng, waypoint.lat]);
      });

      // Only fit bounds if we have a valid bounding box
      if (!bounds.isEmpty()) {
        this.map.fitBounds(bounds, { 
          padding: 50,
          maxZoom: 15 // Prevent zooming in too close
        });
      }
    } catch (error) {
      console.error('Error fitting map to route:', error);
    }
  }

  private updateDisplay(): void {
    if (!this.map || !this.routeData) return;

    this.clearMarkers();
    this.clearRouteLine();

    if (this.routeData.waypoints.length > 0) {
      this.addWaypointMarkers();
      
      if (this.routeData.waypoints.length >= 2) {
        this.addRouteLine();
      }
    }
  }

  private addWaypointMarkers(): void {
    if (!this.map || !this.routeData) return;

    this.routeData.waypoints.forEach((waypoint, index) => {
      const el = document.createElement('div');
      el.className = 'waypoint-marker';
      el.style.width = '30px';
      el.style.height = '30px';
      el.style.borderRadius = '50%';
      el.style.backgroundColor = this.routeColor;
      el.style.border = '3px solid white';
      el.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
      el.style.display = 'flex';
      el.style.alignItems = 'center';
      el.style.justifyContent = 'center';
      el.style.color = 'white';
      el.style.fontWeight = 'bold';
      el.style.fontSize = '12px';
      el.style.cursor = 'default';
      el.textContent = (index + 1).toString();

      const marker = new Marker({ element: el })
        .setLngLat([waypoint.lng, waypoint.lat])
        .addTo(this.map!);
      
      this.markers.push(marker);
    });
  }

  private addRouteLine(): void {
    if (!this.map || !this.routeData) return;
    
    // Ensure style is loaded before adding source
    if (!this.map.isStyleLoaded()) {
      console.warn('Map style not loaded, skipping route line');
      return;
    }

    const coordinates = this.routeData.waypoints.map(wp => [wp.lng, wp.lat]);
    
    this.map.addSource('route-line', {
      type: 'geojson',
      data: {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: coordinates
        }
      }
    });

    this.map.addLayer({
      id: 'route-line-layer',
      type: 'line',
      source: 'route-line',
      layout: {
        'line-join': 'round',
        'line-cap': 'round'
      },
      paint: {
        'line-color': this.routeColor,
        'line-width': 4,
        'line-opacity': 0.8
      }
    });
  }

  private clearMarkers(): void {
    this.markers.forEach(marker => marker.remove());
    this.markers = [];
  }

  private clearRouteLine(): void {
    if (!this.map) return;

    if (this.map.getLayer('route-line-layer')) {
      this.map.removeLayer('route-line-layer');
    }
    if (this.map.getSource('route-line')) {
      this.map.removeSource('route-line');
    }
  }
}