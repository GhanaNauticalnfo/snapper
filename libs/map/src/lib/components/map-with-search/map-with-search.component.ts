import { Component, Input, Output, EventEmitter, ViewChild, inject, AfterViewInit, OnDestroy, TemplateRef, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MapComponent } from '../map/map.component';
import { SearchDropdownComponent, SearchDropdownConfig } from '@ghanawaters/shared';
import { AisShipLayerService } from '../../layers/ais/ais-ships-layer.service';
import { LayerManagerService } from '../../core/layer-manager.service';
import { MapConfig } from '../../models/map-config.model';
import { Subject, takeUntil, map } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';

export interface VesselWithLocation {
  id: number;
  name: string;
  vessel_type: string;
  vessel_type_id?: number;
  latitude?: number;
  longitude?: number;
  lastSeen?: Date;
  speed?: number;
  heading?: number;
  home_port?: string;
}

@Component({
  selector: 'lib-map-with-search',
  standalone: true,
  imports: [CommonModule, MapComponent, SearchDropdownComponent],
  template: `
    <div class="map-container">
      <lib-map 
        #mapComponent 
        [config]="config"
        [vesselFilter]="selectedVesselId"
        (mapLoad)="onMapLoad($event)">
        <div class="map-overlay">
          <lib-search-dropdown
            [items]="vesselList()"
            [config]="searchConfig"
            [isLoading]="isLoading()"
            [itemTemplate]="vesselItemTemplate"
            (itemSelected)="onVesselSelected($event)"
            class="vessel-search-overlay">
          </lib-search-dropdown>
        </div>
      </lib-map>
    </div>

    <ng-template #vesselItemTemplate let-vessel let-selected="selected">
      <div class="vessel-header">
        <span class="vessel-name">{{ vessel.name }}</span>
        @if (isVesselLive(vessel)) {
          <span class="live-indicator">LIVE</span>
        }
      </div>
      <div class="vessel-details">
        <span class="type">{{ vessel.vessel_type }}</span>
        @if (vessel.home_port) {
          <span class="separator">•</span>
          <span class="port">{{ vessel.home_port }}</span>
        }
      </div>
      @if (vessel.latitude && vessel.longitude) {
        <div class="location-info">
          <span class="coordinates">{{ formatLocation(vessel.latitude, vessel.longitude) }}</span>
          @if (vessel.lastSeen) {
            <span class="timestamp">{{ formatTimestamp(vessel.lastSeen) }}</span>
          }
        </div>
        @if (vessel.speed !== null && vessel.speed !== undefined) {
          <div class="movement-info">
            <span class="speed">{{ vessel.speed.toFixed(1) }} kts</span>
            @if (vessel.heading !== null && vessel.heading !== undefined) {
              <span class="separator">•</span>
              <span class="heading">{{ vessel.heading.toFixed(0) }}°</span>
            }
          </div>
        }
      }
    </ng-template>
  `,
  styles: [`
    :host {
      display: block;
      height: 100%;
      width: 100%;
    }

    .map-container {
      height: 100%;
      width: 100%;
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
      width: 320px;
    }

    .vessel-header {
      margin-bottom: 4px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .vessel-name {
      font-weight: 600;
      color: #1e3c72;
      font-size: 14px;
    }

    .live-indicator {
      background: #10b981;
      color: white;
      font-size: 10px;
      padding: 2px 6px;
      border-radius: 3px;
      font-weight: 600;
      animation: pulse 2s infinite;
    }

    @keyframes pulse {
      0% { opacity: 1; }
      50% { opacity: 0.6; }
      100% { opacity: 1; }
    }

    .vessel-details {
      display: flex;
      gap: 8px;
      margin-bottom: 4px;
      font-size: 12px;
      color: #666;
    }

    .separator {
      color: #d1d5db;
    }

    .location-info {
      font-size: 11px;
      color: #059669;
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2px;
    }

    .movement-info {
      font-size: 11px;
      color: #6366f1;
      display: flex;
      gap: 8px;
    }

    .coordinates {
      font-family: monospace;
    }

    .timestamp {
      color: #9ca3af;
      font-size: 10px;
    }

    @media (max-width: 768px) {
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
  providers: [AisShipLayerService]
})
export class MapWithSearchComponent implements AfterViewInit, OnDestroy {
  @ViewChild('mapComponent') mapComponent!: MapComponent;
  @ViewChild('vesselItemTemplate') vesselItemTemplate!: TemplateRef<any>;
  
  @Input() config: Partial<MapConfig> = {};
  @Output() vesselSelected = new EventEmitter<VesselWithLocation>();
  @Output() mapLoad = new EventEmitter<any>();
  
  private destroy$ = new Subject<void>();
  private layerManager = inject(LayerManagerService);
  private aisLayerService: AisShipLayerService | null = null;
  
  // Use signals for reactive state
  private vesselPositions = signal<VesselWithLocation[]>([]);
  isLoading = signal(false);
  selectedVesselId: number | null = null;
  
  // Highlight tracking
  private highlightedVesselId: number | null = null;
  private highlightIntervals: any[] = [];
  
  // Computed signal for vessel list
  vesselList = computed(() => {
    const positions = this.vesselPositions();
    // Sort by last seen timestamp (most recent first)
    return positions.sort((a, b) => {
      if (!a.lastSeen) return 1;
      if (!b.lastSeen) return -1;
      return new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime();
    });
  });
  
  searchConfig: SearchDropdownConfig = {
    placeholder: 'Search vessels by name...',
    searchFields: ['name'],
    maxResults: 10,
    showKeyboardHints: true,
    noResultsText: 'No vessels found matching',
    loadingText: 'Loading vessels...'
  };
  
  ngAfterViewInit() {
    // Register the AIS layer if needed
    if (!this.layerManager.getLayer('ais-ships')) {
      this.layerManager.registerLayer('ais-ships', AisShipLayerService);
    }
  }
  
  onMapLoad(map: any) {
    this.mapLoad.emit(map);
    
    // Get the AIS layer service instance
    const aisLayer = this.layerManager.getLayer('ais-ships');
    if (aisLayer && aisLayer instanceof AisShipLayerService) {
      this.aisLayerService = aisLayer;
      
      // Subscribe to vessel position updates
      this.subscribeToVesselUpdates();
    }
  }
  
  private subscribeToVesselUpdates() {
    if (!this.aisLayerService) return;
    
    // Subscribe to vessel position updates from the AIS layer
    this.aisLayerService.vesselPositionsObservable$
      .pipe(
        takeUntil(this.destroy$),
        map(positions => positions.map(pos => ({
          id: pos.vesselId,
          name: pos.vesselName,
          vessel_type: pos.vesselType,
          vessel_type_id: pos.vesselTypeId,
          latitude: pos.lat,
          longitude: pos.lng,
          lastSeen: pos.timestamp ? new Date(pos.timestamp) : undefined,
          speed: pos.speed ?? undefined,
          heading: pos.heading ?? undefined,
          home_port: undefined // Will be added when we fetch vessel details
        })))
      )
      .subscribe(vessels => {
        this.vesselPositions.set(vessels);
        
        // Update highlight position if the highlighted vessel moved
        if (this.highlightedVesselId !== null) {
          const highlightedVessel = vessels.find(v => v.id === this.highlightedVesselId);
          if (highlightedVessel && highlightedVessel.latitude && highlightedVessel.longitude) {
            this.updateHighlightPosition(highlightedVessel.longitude, highlightedVessel.latitude);
          }
        }
      });
  }
  
  onVesselSelected(vessel: VesselWithLocation) {
    this.selectedVesselId = vessel.id;
    this.vesselSelected.emit(vessel);
    
    // Zoom to vessel location
    if (vessel.latitude && vessel.longitude && this.mapComponent) {
      const map = this.mapComponent['map'];
      if (map) {
        map.flyTo({
          center: [vessel.longitude, vessel.latitude],
          zoom: 14,
          speed: 1.5,
          curve: 1.2
        });
        
        // Create highlight effect
        this.createHighlightEffect(vessel.id, vessel.longitude, vessel.latitude);
      }
    }
  }
  
  isVesselLive(vessel: VesselWithLocation): boolean {
    if (!vessel.lastSeen) return false;
    const now = new Date();
    const lastSeen = new Date(vessel.lastSeen);
    const diffMinutes = (now.getTime() - lastSeen.getTime()) / 60000;
    return diffMinutes < 5; // Consider "live" if updated in last 5 minutes
  }
  
  formatLocation(lat: number, lng: number): string {
    return `${lat.toFixed(4)}°, ${lng.toFixed(4)}°`;
  }
  
  formatTimestamp(date: Date): string {
    const now = new Date();
    const lastSeen = new Date(date);
    const diff = now.getTime() - lastSeen.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  }
  
  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    this.clearHighlight();
  }
  
  private createHighlightEffect(vesselId: number, lng: number, lat: number) {
    const map = this.mapComponent?.['map'];
    if (!map) return;
    
    // Clear any existing highlight
    this.clearHighlight();
    
    // Store the highlighted vessel ID
    this.highlightedVesselId = vesselId;
    
    // Add a temporary pulsing circle to highlight the vessel
    const highlightId = 'vessel-highlight';
    
    // Add highlight source and layer
    map.addSource(highlightId, {
      type: 'geojson',
      data: {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [lng, lat]
        },
        properties: {}
      }
    });
    
    map.addLayer({
      id: highlightId,
      type: 'circle',
      source: highlightId,
      paint: {
        'circle-radius': [
          'interpolate',
          ['linear'],
          ['zoom'],
          8, 20,
          16, 50
        ],
        'circle-color': '#3b82f6',
        'circle-opacity': 0.6,
        'circle-stroke-width': 3,
        'circle-stroke-color': '#1d4ed8',
        'circle-stroke-opacity': 0.8
      }
    });
    
    // Animate the highlight with a pulsing effect
    let opacity = 0.6;
    let increasing = false;
    let pulseCount = 0;
    
    const pulseInterval = setInterval(() => {
      if (increasing) {
        opacity += 0.05;
        if (opacity >= 0.8) {
          increasing = false;
          pulseCount++;
        }
      } else {
        opacity -= 0.05;
        if (opacity <= 0.2) {
          increasing = true;
        }
      }
      
      if (map && map.getLayer(highlightId)) {
        map.setPaintProperty(highlightId, 'circle-opacity', opacity);
      }
      
      // Stop after 3 pulses (about 3 seconds)
      if (pulseCount >= 3 && !increasing) {
        clearInterval(pulseInterval);
        
        // Fade out and remove
        const fadeInterval = setInterval(() => {
          opacity -= 0.1;
          if (map && map.getLayer(highlightId)) {
            map.setPaintProperty(highlightId, 'circle-opacity', opacity);
            map.setPaintProperty(highlightId, 'circle-stroke-opacity', opacity);
          }
          
          if (opacity <= 0) {
            clearInterval(fadeInterval);
            this.removeHighlightLayer();
          }
        }, 50);
        
        this.highlightIntervals.push(fadeInterval);
      }
    }, 100);
    
    this.highlightIntervals.push(pulseInterval);
  }
  
  private clearHighlight() {
    // Clear all intervals
    this.highlightIntervals.forEach(interval => clearInterval(interval));
    this.highlightIntervals = [];
    
    // Remove the highlight layer
    this.removeHighlightLayer();
    
    // Clear the tracked vessel ID
    this.highlightedVesselId = null;
  }
  
  private removeHighlightLayer() {
    const map = this.mapComponent?.['map'];
    if (!map) return;
    
    const highlightId = 'vessel-highlight';
    
    if (map.getLayer(highlightId)) {
      map.removeLayer(highlightId);
    }
    if (map.getSource(highlightId)) {
      map.removeSource(highlightId);
    }
  }
  
  private updateHighlightPosition(lng: number, lat: number) {
    const map = this.mapComponent?.['map'];
    if (!map) return;
    
    const highlightId = 'vessel-highlight';
    const source = map.getSource(highlightId);
    
    if (source && source.type === 'geojson') {
      (source as any).setData({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [lng, lat]
        },
        properties: {}
      });
    }
  }
}