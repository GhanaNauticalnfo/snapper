import { Component, ViewChild } from '@angular/core';
import { MapComponent as SharedMapComponent, MapConfig, OSM_STYLE } from '@ghanawaters/map';
import { VesselSearchComponent, VesselWithLocation } from '../vessel-search/vessel-search.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [SharedMapComponent, VesselSearchComponent],
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
          [config]="mapConfig">
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
export class HomeComponent {
  @ViewChild('mapComponent') mapComponent!: SharedMapComponent;

  mapConfig: Partial<MapConfig> = {
    mapStyle: OSM_STYLE,
    center: [-1.0, 6.5], // Ghana coordinates
    zoom: 7,
    height: '100%',
    showCoordinateDisplay: true, // Enable coordinate display
    showFullscreenControl: true,
    showControls: false // Disable layer controls for simpler view
  };

  onVesselSelected(vessel: VesselWithLocation) {
    // For now, just log the vessel selection since the shared map component
    // doesn't have the same zoomToVessel method as the custom one
    console.log('Vessel selected:', vessel);
  }
}