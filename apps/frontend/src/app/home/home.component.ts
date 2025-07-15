import { Component, ViewChild, inject, AfterViewInit } from '@angular/core';
import { MapWithSearchComponent, MapConfig, OSM_STYLE, LayerManagerService, AisShipLayerService, VesselWithLocation } from '@ghanawaters/map';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [MapWithSearchComponent],
  providers: [AisShipLayerService],
  template: `
    <div class="container">
      <div class="header">
        <h1>Ghana Maritime Authority - Vessel Tracking</h1>
      </div>
      <div class="map-wrapper">
        <lib-map-with-search 
          #mapComponent
          [config]="mapConfig"
          (vesselSelected)="onVesselSelected($event)">
        </lib-map-with-search>
      </div>
    </div>
  `,
  styles: [`
    .container {
      padding: 0px;
      height: 100vh;
      display: flex;
      flex-direction: column;
    }
    .header {
      background: #1e3c72;
      color: white;
      padding: 1rem;
      text-align: center;
    }
    h1 {
      margin: 0;
      font-size: 1.5rem;
    }
    .map-wrapper {
      flex: 1;
      width: 100%;
    }
    
    @media (max-width: 768px) {
      h1 {
        font-size: 1.2rem;
      }
    }
  `]
})
export class HomeComponent implements AfterViewInit {
  @ViewChild('mapComponent') mapComponent!: MapWithSearchComponent;
  private layerManager = inject(LayerManagerService);

  mapConfig: Partial<MapConfig> = {
    mapStyle: OSM_STYLE,
    center: [-1.0, 6.5], // Ghana coordinates
    zoom: 7,
    height: '100%',
    showCoordinateDisplay: true, // Enable coordinate display
    showFullscreenControl: true,
    showControls: false, // Disable layer controls for simpler view
    availableLayers: ['ais-ships'], // Make vessel tracking layer available
    initialActiveLayers: ['ais-ships'] // Automatically activate vessel tracking on load
  };

  ngAfterViewInit() {
    // Register the AIS ships layer to display vessel tracking
    this.layerManager.registerLayer('ais-ships', AisShipLayerService);
  }

  onVesselSelected(vessel: VesselWithLocation) {
    console.log('Vessel selected:', vessel);
    // Zooming and filtering is now handled by the MapWithSearch component
  }
}