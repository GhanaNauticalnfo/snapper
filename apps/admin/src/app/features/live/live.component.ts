// In your component (e.g., LiveComponent)
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { 
  MapComponent, 
  LayerManagerService, 
  AisShipLayerService, 
  WeatherLayerService, 
  NiordLayerService,
  MapConfig,
  OSM_STYLE,
  DepthLayerService
} from '@snapper/map';

@Component({
  selector: 'app-live',
  standalone: true,
  imports: [CommonModule, MapComponent],
  template: `
    <lib-map [config]="mapConfig">
    </lib-map>
  `,
  styles: [`
    :host {
      display: block;
      padding: 20px;
    }
  `],
  providers: [
    DepthLayerService,
    AisShipLayerService,
    WeatherLayerService,
    NiordLayerService
  ]
})
export class LiveComponent implements OnInit {
  private layerManager = inject(LayerManagerService);
  
  // Define a comprehensive map configuration
  mapConfig: Partial<MapConfig> = {
    mapStyle: OSM_STYLE, // Using the OSM style
    center: [-74.5, 40],
    zoom: 9,
    height: '600px',
    showFullscreenControl: true,
    showZoomControls: true,
    showCompass: true,
    availableLayers: ['ais-ships', 'weather', 'niord', 'depth'],
    initialActiveLayers: ['ais-ships'], // Automatically activate this layer on load
    layerNames: {
      'ais-ships': 'Ships',
      'weather': 'Weather',
      'niord': 'NW/NM',
      'depth': 'Depths'
    }
  };
  
  ngOnInit() {
    // Register available layers
    this.layerManager.registerLayer('ais-ships', AisShipLayerService);
    this.layerManager.registerLayer('weather', WeatherLayerService);
    this.layerManager.registerLayer('niord', NiordLayerService);
    this.layerManager.registerLayer('depth', DepthLayerService);
  }
}