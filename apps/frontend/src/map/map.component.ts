// map.component.ts
import { Component, ElementRef, OnDestroy, ViewChild, AfterViewInit, input, effect } from '@angular/core';
import { Map, NavigationControl, ScaleControl, GeolocateControl, Popup } from 'maplibre-gl';

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
  
  // Convert @Input properties to signals
  initialCenter = input<[number, number]>([30, 90]);
  initialZoom = input<number>(3);
  
  private map?: Map;

  constructor() {
    // Use effect to react to input signal changes if needed
    effect(() => {
      // This will run when initialCenter or initialZoom signals change
      if (this.map) {
        this.map.setCenter(this.initialCenter());
        this.map.setZoom(this.initialZoom());
      }
    });
  }

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
            maxzoom: 18
          }
        ]
      },
      center: this.initialCenter(),
      zoom: this.initialZoom()
    });

    // Add navigation controls (zoom in/out, rotation)
    this.map.addControl(new NavigationControl(), 'top-right');
    
    this.map.addControl(
      new GeolocateControl({
          positionOptions: {
              enableHighAccuracy: true
          },
          trackUserLocation: true
      })
  );

    // Add scale control
    this.map.addControl(new ScaleControl({
      maxWidth: 100,
      unit: 'metric'
    }), 'bottom-left');

    // Handle map load event
    this.map.on('load', () => {
      console.log('Map loaded successfully');
    });

    // Add right-click event listener for coordinate popup
    this.map.on('contextmenu', (e) => {
      const coordinates = e.lngLat;
      const popup = new Popup()
        .setLngLat(coordinates)
        .setHTML(`
          <div style="font-family: monospace; font-size: 12px;">
            <strong>Coordinates:</strong><br>
            Longitude: ${coordinates.lng.toFixed(6)}°<br>
            Latitude: ${coordinates.lat.toFixed(6)}°
          </div>
        `)
        .addTo(this.map!);
      
      // Auto-close popup after 5 seconds
      setTimeout(() => {
        popup.remove();
      }, 5000);
    });
  }
}