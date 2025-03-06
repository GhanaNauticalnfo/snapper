// map.component.ts
import { Component, ElementRef, OnDestroy, ViewChild, AfterViewInit, Input } from '@angular/core';
import { Map, NavigationControl, ScaleControl } from 'maplibre-gl';

@Component({
  selector: 'app-map',
  standalone: true,
  template: `
    <div #mapContainer class="map-container"></div>
  `,
  styles: [`
    .map-container {
      width: 100%;
      height: 100%;
      min-height: 400px;
    }
  `]
})
export class MapComponent implements AfterViewInit, OnDestroy {
  @ViewChild('mapContainer') private mapContainer!: ElementRef;
  
  @Input() initialCenter: [number, number] = [0, 0];
  @Input() initialZoom = 2;
  
  private map?: Map;

  ngAfterViewInit(): void {
    this.initializeMap();
  }

  ngOnDestroy(): void {
    this.map?.remove();
  }

  private initializeMap(): void {
    const mapContainer = this.mapContainer.nativeElement;

    this.map = new Map({
      container: mapContainer,
      style: {
        version: 8,
        sources: {
          'osm-tiles': {
            type: 'raster',
            tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution: '© OpenStreetMap contributors'
          }
        },
        layers: [
          {
            id: 'osm-tiles',
            type: 'raster',
            source: 'osm-tiles',
            minzoom: 0,
            maxzoom: 19
          }
        ]
      },
      center: this.initialCenter,
      zoom: this.initialZoom
    });

    // Add navigation controls (zoom in/out, rotation)
    this.map.addControl(new NavigationControl(), 'top-right');
    
    // Add scale control
    this.map.addControl(new ScaleControl({
      maxWidth: 100,
      unit: 'metric'
    }), 'bottom-left');

    // Handle map load event
    this.map.on('load', () => {
      console.log('Map loaded successfully');
    });
  }
}