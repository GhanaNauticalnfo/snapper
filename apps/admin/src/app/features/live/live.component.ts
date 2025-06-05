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
  DepthLayerService,
  DebugPanelComponent,
  DebugLogService
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
      padding: 0 20px 20px 20px;
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
  private debugLog = inject(DebugLogService);
  
  constructor() {
    // Add some initial debug logs to ensure panel has content
    setTimeout(() => {
      this.debugLog.info('Live Component', 'Testing debug panel visibility');
      this.debugLog.warn('Live Component', 'This is a warning message');
      this.debugLog.error('Live Component', 'This is an error message');
      this.debugLog.success('Live Component', 'Debug panel should be visible');
    }, 1000);
  }
  
  // Define a comprehensive map configuration for Lake Volta, Ghana
  mapConfig: Partial<MapConfig> = {
    mapStyle: OSM_STYLE, // Using the OSM style
    center: [-0.25, 7.6], // Center of Lake Volta (longitude, latitude)
    zoom: 7.5, // Adjusted zoom to show the full lake area
    height: '600px',
    showFullscreenControl: true,
    showZoomControls: true,
    showCompass: true,
    availableLayers: ['ais-ships', 'weather', 'niord', 'depth'],
    initialActiveLayers: ['ais-ships'], // Automatically activate this layer on load
    layerNames: {
      'ais-ships': 'Vessels',
      'weather': 'Weather',
      'niord': 'NW/NM',
      'depth': 'Depths'
    }
  };
  
  ngOnInit() {
    this.debugLog.info('Live Component', 'Initializing live vessel tracking page');
    
    // Register available layers
    this.layerManager.registerLayer('ais-ships', AisShipLayerService);
    this.layerManager.registerLayer('weather', WeatherLayerService);
    this.layerManager.registerLayer('niord', NiordLayerService);
    this.layerManager.registerLayer('depth', DepthLayerService);
    
    this.debugLog.success('Live Component', 'All layers registered successfully');
  }
}