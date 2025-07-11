// In your component (e.g., LiveComponent)
import { Component, OnInit, inject, ViewChild, AfterViewInit } from '@angular/core';
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
} from '@ghanawaters/map';
import { VesselSearchComponent, VesselWithLocation } from './components/vessel-search.component';
import { VesselSearchService } from './services/vessel-search.service';

@Component({
  selector: 'app-live',
  standalone: true,
  imports: [CommonModule, MapComponent, VesselSearchComponent],
  template: `
    <div class="live-container">
      <div class="page-header">
        <h2>Live</h2>
      </div>
      <div class="map-container">
        <lib-map #mapComponent [config]="mapConfig">
          <div class="map-overlay">
            <app-vessel-search 
              (vesselSelected)="onVesselSelected($event)"
              class="vessel-search-overlay">
            </app-vessel-search>
          </div>
        </lib-map>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      padding: 0;
      height: 100%;
    }
    
    .live-container {
      padding: 0 20px 20px 20px;
      height: 100%;
      display: flex;
      flex-direction: column;
    }
    
    .map-container {
      flex: 1;
      min-height: 0;
      position: relative;
    }
    
    .map-overlay {
      position: absolute;
      top: 10px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 1;
      pointer-events: none;
    }
    
    .vessel-search-overlay {
      pointer-events: auto;
      background: white;
      border-radius: 4px;
      box-shadow: 0 0 10px rgba(0,0,0,0.1);
      padding: 0;
      overflow: hidden;
    }
    
    .map-container .map-container {
      height: 100%;
      min-height: 500px;
    }
    
    @media (max-width: 768px) {
      .header-content {
        justify-content: center;
      }
      
      h2 {
        text-align: center;
        font-size: 20px;
      }
      
      .map-overlay {
        top: 10px;
        left: 10px;
        right: 10px;
        transform: none;
      }
      
      .vessel-search-overlay {
        width: 100%;
        box-sizing: border-box;
      }
    }
  `],
  providers: [
    DepthLayerService,
    AisShipLayerService,
    WeatherLayerService,
    NiordLayerService
  ]
})
export class LiveComponent implements OnInit, AfterViewInit {
  @ViewChild('mapComponent') mapComponent!: MapComponent;
  
  private layerManager = inject(LayerManagerService);
  private debugLog = inject(DebugLogService);
  private vesselSearchService = inject(VesselSearchService);
  
  // Define a comprehensive map configuration for Lake Volta, Ghana
  mapConfig: Partial<MapConfig> = {
    mapStyle: OSM_STYLE, // Using the OSM style
    center: [-0.25, 7.6], // Center of Lake Volta (longitude, latitude)
    zoom: 7.5, // Adjusted zoom to show the full lake area
    height: '600px',
    showFullscreenControl: true,
    showControls: false, // Hide the map layers panel
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
  
  ngAfterViewInit() {
    // Set up the vessel search service with the map when it's ready
    setTimeout(() => {
      if (this.mapComponent?.map) {
        this.vesselSearchService.setMap(this.mapComponent.map);
        this.debugLog.info('Live Component', 'Vessel search service initialized with map');
      }
    }, 500);
  }
  
  onVesselSelected(vessel: VesselWithLocation) {
    this.debugLog.info('Live Component', `Vessel selected: ${vessel.name}`);
    this.vesselSearchService.zoomToVessel(vessel);
  }
}