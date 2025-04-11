// libs/map/src/lib/core/map.service.ts
import { Injectable, signal } from '@angular/core';
import { Map, LngLatLike } from 'maplibre-gl';

@Injectable({
  providedIn: 'root'
})
export class MapService {
  private map: Map | null = null;
  readonly mapInitialized = signal<boolean>(false);

  constructor() {
    //
  }

  initializeMap(container: HTMLElement, options: {
    style?: string | any;
    center?: LngLatLike;
    zoom?: number;
    [key: string]: any;
  }): Map | null {
    if (this.map) return this.map;

    this.map = new Map({
      container,
      style: options.style, // This will accept either a URL string or our style object
      center: options.center || [-74.5, 40] as LngLatLike,
      zoom: options.zoom !== undefined ? options.zoom : 9,
      ...options
    });

    this.map.on('load', () => {
      this.mapInitialized.set(true);
    });
    
    return this.map;
  }

  getMap(): Map | null {
    return this.map;
  }

  removeMap(): void {
    if (this.map) {
      this.map.remove();
      this.map = null;
      this.mapInitialized.set(false);
    }
  }
}