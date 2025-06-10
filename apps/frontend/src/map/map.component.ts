// map.component.ts
import { Component, ElementRef, OnDestroy, ViewChild, AfterViewInit, input, effect, inject } from '@angular/core';
import { Map as MapLibreMap, NavigationControl, ScaleControl, GeolocateControl, Popup, Marker } from 'maplibre-gl';
import { ApiService, Vessel, VesselTelemetry } from '../app/api.service';

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
  private apiService = inject(ApiService);
  
  // Convert @Input properties to signals
  initialCenter = input<[number, number]>([30, 90]);
  initialZoom = input<number>(3);
  
  private map?: MapLibreMap;
  private vesselMarkers = new Map<number, Marker>();

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
    // Clean up markers
    this.vesselMarkers.forEach((marker: Marker) => marker.remove());
    this.vesselMarkers.clear();
    this.map?.remove();
  }

  private initializeMap(): void {
    const mapContainer = this.mapContainer.nativeElement;

    this.map = new MapLibreMap({
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
      this.loadVessels();
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

  public zoomToVessel(vessel: { id: number; name: string; latitude?: number; longitude?: number }) {
    if (!this.map || !vessel.latitude || !vessel.longitude) {
      console.warn('Cannot zoom to vessel: map not ready or vessel location not available');
      return;
    }

    // Zoom to vessel location
    this.map.flyTo({
      center: [vessel.longitude, vessel.latitude],
      zoom: 14,
      speed: 1.5,
      curve: 1.2
    });

    // Highlight the vessel marker
    const marker = this.vesselMarkers.get(vessel.id);
    if (marker) {
      // Flash the marker to indicate selection
      const element = marker.getElement();
      element.style.transform = 'scale(1.5)';
      element.style.transition = 'transform 0.3s ease';
      
      setTimeout(() => {
        element.style.transform = 'scale(1)';
      }, 1000);
    }
  }

  private loadVessels() {
    this.apiService.getActiveVessels().subscribe({
      next: (vessels) => {
        vessels.forEach(vessel => {
          this.loadVesselLocation(vessel);
        });
      },
      error: (error) => {
        console.error('Error loading vessels:', error);
      }
    });
  }

  private loadVesselLocation(vessel: Vessel) {
    this.apiService.getVesselTracking(vessel.id, 1).subscribe({
      next: (trackingPoints) => {
        if (trackingPoints.length > 0) {
          const point = trackingPoints[0];
          this.addVesselMarker(vessel, point);
        }
      },
      error: (error) => {
        console.error(`Error loading tracking for vessel ${vessel.id}:`, error);
      }
    });
  }

  private addVesselMarker(vessel: Vessel, vesselTelemetry: VesselTelemetry) {
    if (!this.map) return;

    // Remove existing marker if present
    const existingMarker = this.vesselMarkers.get(vessel.id);
    if (existingMarker) {
      existingMarker.remove();
    }

    // Create vessel marker element
    const el = document.createElement('div');
    el.className = 'vessel-marker';
    el.style.cssText = `
      width: 20px;
      height: 20px;
      background-color: #1e3c72;
      border: 2px solid white;
      border-radius: 50%;
      cursor: pointer;
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      transition: transform 0.2s ease;
    `;

    // Add hover effect
    el.addEventListener('mouseenter', () => {
      el.style.transform = 'scale(1.2)';
    });
    el.addEventListener('mouseleave', () => {
      el.style.transform = 'scale(1)';
    });

    // Create popup content
    const lastSeen = new Date(vesselTelemetry.timestamp).toLocaleString();
    const popupContent = `
      <div style="font-family: Arial, sans-serif; min-width: 200px;">
        <h3 style="margin: 0 0 8px 0; color: #1e3c72; font-size: 16px;">${vessel.name}</h3>
        <p style="margin: 4px 0; font-size: 14px;"><strong>Type:</strong> ${vessel.vessel_type}</p>
        ${vessel.home_port ? `<p style="margin: 4px 0; font-size: 14px;"><strong>Home Port:</strong> ${vessel.home_port}</p>` : ''}
        <p style="margin: 4px 0; font-size: 14px;"><strong>Position:</strong> ${vesselTelemetry.position.coordinates[1].toFixed(4)}°, ${vesselTelemetry.position.coordinates[0].toFixed(4)}°</p>
        ${vesselTelemetry.speed_knots ? `<p style="margin: 4px 0; font-size: 14px;"><strong>Speed:</strong> ${vesselTelemetry.speed_knots} knots</p>` : ''}
        ${vesselTelemetry.heading_degrees ? `<p style="margin: 4px 0; font-size: 14px;"><strong>Heading:</strong> ${vesselTelemetry.heading_degrees}°</p>` : ''}
        <p style="margin: 8px 0 0 0; font-size: 12px; color: #666;"><strong>Last seen:</strong> ${lastSeen}</p>
      </div>
    `;

    const popup = new Popup({ offset: 25 }).setHTML(popupContent);

    // Create and add marker
    const marker = new Marker(el)
      .setLngLat([vesselTelemetry.position.coordinates[0], vesselTelemetry.position.coordinates[1]])
      .setPopup(popup)
      .addTo(this.map);

    // Store marker reference
    this.vesselMarkers.set(vessel.id, marker);
  }
}