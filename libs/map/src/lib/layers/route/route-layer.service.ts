import { Injectable, inject } from '@angular/core';
import { Map as MaplibreMap, LngLatBounds, Marker } from 'maplibre-gl';
import { BaseLayerService } from '../base-layer.service';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { SETTING_KEYS, SETTING_DEFAULTS } from '@snapper/shared-models';

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
  description?: string;
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
  private routeColor = new BehaviorSubject<string>(SETTING_DEFAULTS[SETTING_KEYS.ROUTE_COLOR]);
  private http = inject(HttpClient);
  private apiUrl: string | null = null;

  constructor() {
    super();
  }

  initialize(map: MaplibreMap): void {
    this.map = map;
    this.updateDisplay();
  }

  /**
   * Configure the service with API URL
   */
  configureApiUrl(apiUrl: string): void {
    this.apiUrl = apiUrl;
    this.loadRouteColor();
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
      this.updateDisplay();
    }
  }

  /**
   * Load route color from settings API
   */
  private loadRouteColor(): void {
    if (!this.apiUrl) {
      return; // Skip if API URL not configured
    }
    
    this.http.get<{value: string}>(`${this.apiUrl}/settings/${SETTING_KEYS.ROUTE_COLOR}`).subscribe({
      next: (setting) => {
        this.routeColor.next(setting.value);
        this.updateDisplay();
      },
      error: () => {
        // Use default color on error
        this.routeColor.next(SETTING_DEFAULTS[SETTING_KEYS.ROUTE_COLOR]);
      }
    });
  }

  /**
   * Get current route color as Observable
   */
  getRouteColor(): Observable<string> {
    return this.routeColor.asObservable();
  }

  /**
   * Set the route color and update display
   */
  setRouteColor(color: string): void {
    this.routeColor.next(color);
    this.updateDisplay();
  }

  /**
   * Refresh route color from settings API
   */
  refreshRouteColor(): void {
    this.loadRouteColor();
  }

  /**
   * Fit the map to show the entire route
   */
  fitToRoute(): void {
    if (!this.map || !this.routeData?.waypoints.length) return;

    const bounds = new LngLatBounds();
    this.routeData.waypoints.forEach(waypoint => {
      bounds.extend([waypoint.lng, waypoint.lat]);
    });

    this.map.fitBounds(bounds, { padding: 50 });
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
      el.style.backgroundColor = this.routeColor.value;
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
        'line-color': this.routeColor.value,
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