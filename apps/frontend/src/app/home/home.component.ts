import { Component, ViewChild, inject, AfterViewInit } from '@angular/core';
import { MapComponent as SharedMapComponent, MapConfig, OSM_STYLE, LayerManagerService, AisShipLayerService } from '@ghanawaters/map';
import { VesselSearchComponent, VesselWithLocation } from '../vessel-search/vessel-search.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [SharedMapComponent, VesselSearchComponent],
  providers: [AisShipLayerService],
  template: `
    <div class="container">
      <div class="header">
        <h1>Ghana Maritime Authority - Vessel Tracking</h1>
        <app-vessel-search 
          (vesselSelected)="onVesselSelected($event)"
          class="search-component">
        </app-vessel-search>
      </div>
      <div class="map-wrapper">
        <lib-map 
          #mapComponent
          [config]="mapConfig"
          [vesselFilter]="selectedVesselId">
        </lib-map>
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
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
    }
    h1 {
      margin: 0;
      font-size: 1.5rem;
      flex: 1;
    }
    .search-component {
      flex-shrink: 0;
    }
    .map-wrapper {
      flex: 1;
      width: 100%;
    }
    
    @media (max-width: 768px) {
      .header {
        flex-direction: column;
        align-items: stretch;
        gap: 0.5rem;
      }
      h1 {
        text-align: center;
        margin-bottom: 0.5rem;
      }
    }
  `]
})
export class HomeComponent implements AfterViewInit {
  @ViewChild('mapComponent') mapComponent!: SharedMapComponent;
  private layerManager = inject(LayerManagerService);
  selectedVesselId: number | null = null;

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
    
    // Set the vessel filter to highlight the selected vessel
    this.selectedVesselId = vessel.id;
    
    // Zoom to vessel location if coordinates are available
    if (vessel.latitude && vessel.longitude && this.mapComponent) {
      // Access the map instance through the map component
      const map = this.mapComponent['map'];
      if (map) {
        map.flyTo({
          center: [vessel.longitude, vessel.latitude],
          zoom: 14,
          speed: 1.5,
          curve: 1.2
        });
      }
    }
  }
}