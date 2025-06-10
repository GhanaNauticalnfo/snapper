// libs/map/src/lib/core/map.service.ts
import { Injectable, signal } from '@angular/core';
import { Map, LngLatLike } from 'maplibre-gl';

@Injectable({
  providedIn: 'root'
})
export class MapService {
  private maps: Map[] = [];
  readonly mapInitialized = signal<boolean>(false);

  constructor() {
    //
  }

  initializeMap(container: HTMLElement, options: {
    style?: string | any;
    center?: LngLatLike;
    zoom?: number;
    minZoom?: number;
    maxZoom?: number;
    [key: string]: any;
  }): Map | null {
    // Create a new map instance for each container with consistent zoom behavior
    const map = new Map({
      container,
      style: options.style, // This will accept either a URL string or our style object
      center: options.center || [-74.5, 40] as LngLatLike,
      zoom: options.zoom !== undefined ? options.zoom : 9,
      // Add zoom constraints for consistent behavior across all maps
      minZoom: options.minZoom !== undefined ? options.minZoom : 1,
      maxZoom: options.maxZoom !== undefined ? options.maxZoom : 18,
      ...options
    });

    // Add to maps array for tracking
    this.maps.push(map);

    map.on('load', () => {
      this.mapInitialized.set(true);
    });
    
    return map;
  }

  getMap(): Map | null {
    // Return the most recently created map, or null if none exist
    return this.maps.length > 0 ? this.maps[this.maps.length - 1] : null;
  }

  removeMap(mapToRemove?: Map): void {
    if (mapToRemove) {
      // Remove specific map
      const index = this.maps.indexOf(mapToRemove);
      if (index > -1) {
        this.maps.splice(index, 1);
        mapToRemove.remove();
      }
    } else {
      // Remove all maps (legacy behavior)
      this.maps.forEach(map => map.remove());
      this.maps = [];
      this.mapInitialized.set(false);
    }
  }
}