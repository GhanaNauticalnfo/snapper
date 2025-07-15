// libs/map/src/lib/components/map/map.component.ts
import { Component, OnInit, AfterViewInit, OnDestroy, OnChanges, SimpleChanges, ElementRef, ViewChild, inject, signal, Input, Output, EventEmitter, TemplateRef, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MapService } from '../../core/map.service';
import { LayerManagerService } from '../../core/layer-manager.service';
import { Map, LngLatLike, NavigationControl, Popup } from 'maplibre-gl';
import { MapConfig, DEFAULT_MAP_CONFIG } from '../../models/map-config.model';
import { SearchDropdownComponent, SearchDropdownConfig } from '@ghanawaters/shared';
import { AisShipLayerService } from '../../layers/ais/ais-ships-layer.service';
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
  selector: 'lib-map',
  standalone: true,
  imports: [CommonModule, SearchDropdownComponent],
  template: `
    <div class="map-container" [class.fullscreen]="isFullscreen()" [class.clickable]="clickable" [style.height]="_config.height">
      <div #mapElement class="map-canvas"></div>
      
      <div class="map-controls" *ngIf="_config.showFullscreenControl">
        <div class="control-button fullscreen-button" (click)="toggleFullscreen()">
          <svg *ngIf="!isFullscreen()" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
            <path fill="currentColor" d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/>
          </svg>
          <svg *ngIf="isFullscreen()" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
            <path fill="currentColor" d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/>
          </svg>
        </div>
      </div>
      
      <div class="layer-controls" *ngIf="_config.showControls">
        <h3>Map Layers</h3>
        <div class="layer-button" *ngFor="let layerId of _config.availableLayers">
          <button 
            [class.active]="layerManager.getLayerStatus(layerId)"
            (click)="toggleLayer(layerId)">
            {{ getLayerName(layerId) }}
          </button>
        </div>
        <div *ngIf="layerManager.activeLayerIds().length > 0" class="update-control">
          <button (click)="layerManager.updateAllLayers()">
            Refresh All Layers
          </button>
        </div>
      </div>
      
      <div class="coordinate-display" *ngIf="_config.showCoordinateDisplay">
        <div class="coordinate-text">
          <div class="coord-line">{{ getLatitudeDMS() }}</div>
          <div class="coord-line">{{ getLongitudeDMS() }}</div>
          <div class="coord-decimal">({{ getLatitudeDD() }}, {{ getLongitudeDD() }})</div>
        </div>
        <div class="zoom-controls">
          <button class="zoom-btn" (click)="zoomIn()">+</button>
          <div class="zoom-level">{{ currentZoom().toFixed(0) }}</div>
          <button class="zoom-btn" (click)="zoomOut()">−</button>
        </div>
      </div>
      
      <!-- Vessel Search Overlay -->
      <div class="map-overlay" *ngIf="showVesselSearch">
        <lib-search-dropdown
          [items]="vesselList()"
          [config]="searchConfig"
          [isLoading]="vesselSearchLoading()"
          [itemTemplate]="vesselItemTemplate"
          (itemSelected)="onVesselSelected($event)"
          class="vessel-search-overlay">
        </lib-search-dropdown>
      </div>
      
      <!-- Vessel Item Template -->
      <ng-template #vesselItemTemplate let-vessel let-selected="selected">
        <div class="vessel-header">
          <span class="vessel-name">{{ vessel.name }}</span>
          <span class="live-indicator" *ngIf="isVesselLive(vessel)">LIVE</span>
        </div>
        <div class="vessel-details">
          <span class="type">{{ vessel.vessel_type }}</span>
          <span class="separator" *ngIf="vessel.home_port">•</span>
          <span class="port" *ngIf="vessel.home_port">{{ vessel.home_port }}</span>
        </div>
        <div class="location-info" *ngIf="vessel.latitude && vessel.longitude">
          <span class="coordinates">{{ formatVesselLocation(vessel.latitude, vessel.longitude) }}</span>
          <span class="timestamp" *ngIf="vessel.lastSeen">{{ formatTimestamp(vessel.lastSeen) }}</span>
        </div>
        <div class="movement-info" *ngIf="vessel.speed !== null && vessel.speed !== undefined">
          <span class="speed">{{ vessel.speed.toFixed(1) }} kts</span>
          <span class="separator" *ngIf="vessel.heading !== null && vessel.heading !== undefined">•</span>
          <span class="heading" *ngIf="vessel.heading !== null && vessel.heading !== undefined">{{ vessel.heading.toFixed(0) }}°</span>
        </div>
      </ng-template>
      
      <ng-content></ng-content>
    </div>
  `,
  styles: [`
  .map-container {
    position: relative;
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    transition: all 0.3s ease;
  }
  .map-container.fullscreen {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw; /* Use viewport width to ensure full width */
    height: 100vh !important; /* Use viewport height to ensure full height */
    z-index: 9999; /* High z-index to be above everything else */
    border-radius: 0;
    margin: 0;
    padding: 0;
  }
  /* Add styles to ensure the map canvas fills the container */
  .map-canvas {
    height: 100%;
    width: 100%;
  }
  .map-container.clickable .map-canvas {
    cursor: crosshair;
  }
    .map-controls {
      position: absolute;
      top: 10px;
      left: 10px;
      z-index: 2;
    }
    .control-button {
      background: white;
      border-radius: 4px;
      padding: 6px;
      cursor: pointer;
      box-shadow: 0 0 10px rgba(0,0,0,0.1);
      display: flex;
      align-items: center;
      justify-content: center;
      color: #555;
      transition: all 0.2s;
      margin-bottom: 8px;
    }
    .control-button:hover {
      background: #f0f0f0;
      color: #000;
    }
    .layer-controls {
      position: absolute;
      top: 10px;
      right: 10px;
      background: white;
      padding: 10px;
      border-radius: 4px;
      box-shadow: 0 0 10px rgba(0,0,0,0.1);
      z-index: 1;
    }
    h3 {
      margin-top: 0;
      margin-bottom: 10px;
      font-size: 16px;
    }
    .layer-button {
      margin-bottom: 8px;
    }
    button {
      width: 100%;
      padding: 8px 12px;
      border: none;
      border-radius: 4px;
      background: #f0f0f0;
      cursor: pointer;
      transition: all 0.2s;
    }
    button:hover {
      background: #e0e0e0;
    }
    button.active {
      background: #3887BE;
      color: white;
    }
    .update-control {
      margin-top: 15px;
      padding-top: 10px;
      border-top: 1px solid #e0e0e0;
    }
    .coordinate-display {
      position: absolute;
      bottom: 60px;
      right: 10px;
      display: flex;
      align-items: flex-end;
      gap: 8px;
      z-index: 10000;
      pointer-events: auto;
    }
    .coordinate-text {
      background: rgba(255, 255, 255, 0.9);
      color: #333;
      padding: 8px 12px;
      border-radius: 4px;
      border: 1px solid rgba(0, 0, 0, 0.1);
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      font-family: 'Courier New', monospace;
      font-size: 13px;
      line-height: 1.3;
      text-align: center;
      min-width: 140px;
      pointer-events: none;
    }
    .coord-line {
      font-weight: 500;
    }
    .coord-decimal {
      font-size: 11px;
      color: #666;
      margin-top: 2px;
    }
    .zoom-controls {
      display: flex;
      flex-direction: column;
      background: rgba(255, 255, 255, 0.9);
      border: 1px solid rgba(0, 0, 0, 0.1);
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      border-radius: 4px;
      overflow: hidden;
      pointer-events: auto;
    }
    .zoom-btn {
      width: 32px;
      height: 32px;
      background: transparent;
      border: none;
      color: #333;
      font-size: 18px;
      font-weight: bold;
      cursor: pointer;
      transition: background-color 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .zoom-btn:hover {
      background: rgba(0, 0, 0, 0.05);
    }
    .zoom-level {
      width: 32px;
      height: 24px;
      background: transparent;
      color: #333;
      font-size: 12px;
      font-weight: bold;
      display: flex;
      align-items: center;
      justify-content: center;
      border-top: 1px solid rgba(0, 0, 0, 0.1);
      border-bottom: 1px solid rgba(0, 0, 0, 0.1);
    }
    
    /* Vessel Search Styles */
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
  `]
})
export class MapComponent implements OnInit, AfterViewInit, OnDestroy, OnChanges {
  @ViewChild('mapElement') mapElement!: ElementRef;
  @ViewChild('vesselItemTemplate') vesselItemTemplate!: TemplateRef<any>;
  
  // Allow for full configuration object input
  @Input() set config(config: Partial<MapConfig>) {
    this._config = { ...DEFAULT_MAP_CONFIG, ...config };
  }
  
  // Individual property inputs for backward compatibility and simplicity
  @Input() set mapStyle(value: string | any) {
    this._config.mapStyle = value;
  }
  
  @Input() set center(value: LngLatLike) {
    this._config.center = value;
  }
  
  @Input() set zoom(value: number) {
    this._config.zoom = value;
  }
  
  @Input() set height(value: string) {
    this._config.height = value;
  }
  
  @Input() set showControls(value: boolean) {
    this._config.showControls = value;
  }
  
  @Input() set showFullscreenControl(value: boolean) {
    this._config.showFullscreenControl = value;
  }
  
  @Input() set availableLayers(value: string[]) {
    this._config.availableLayers = value;
  }
  
  @Input() set showCoordinateDisplay(value: boolean) {
    this._config.showCoordinateDisplay = value;
  }
  
  @Input() set initialActiveLayers(value: string[]) {
    this._config.initialActiveLayers = value;
  }
  
  // Vessel filtering for AIS layer
  @Input() set vesselFilter(value: number | null) {
    console.log('Map Component: vesselFilter set to', value);
    this._vesselFilter = value;
    this.applyVesselFilter();
  }
  
  // Click functionality
  @Input() clickable = false;
  
  // Vessel search functionality
  @Input() showVesselSearch = false;
  @Output() vesselSelected = new EventEmitter<VesselWithLocation>();
  
  // Events
  @Output() mapClick = new EventEmitter<{longitude: number, latitude: number}>();
  @Output() mapLoad = new EventEmitter<Map>();
  
  // Default configuration
  _config: MapConfig = { ...DEFAULT_MAP_CONFIG };
  private _vesselFilter: number | null = null;
  private destroy$ = new Subject<void>();
  
  private mapService = inject(MapService);
  public layerManager = inject(LayerManagerService);
  
  // Fullscreen state
  isFullscreen = signal<boolean>(false);
  
  // Coordinate display state
  currentCoordinates = signal<{lng: number, lat: number}>({lng: 0, lat: 0});
  currentZoom = signal<number>(9);
  
  // Vessel search state
  private vesselPositions = signal<VesselWithLocation[]>([]);
  vesselSearchLoading = signal(false);
  selectedVesselId: number | null = null;
  
  // Highlight tracking
  private highlightedVesselId: number | null = null;
  private highlightIntervals: any[] = [];
  private aisLayerService: AisShipLayerService | null = null;
  
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
  
  // Search configuration
  searchConfig: SearchDropdownConfig = {
    placeholder: 'Search vessels by name...',
    searchFields: ['name'],
    maxResults: 10,
    showKeyboardHints: true,
    noResultsText: 'No vessels found matching',
    loadingText: 'Loading vessels...'
  };
  
  // Map instance for public access
  private _map: Map | null = null;
  get map(): Map | null {
    return this._map;
  }
  
  // Public method to trigger map resize
  public resize(): void {
    if (this._map) {
      this._map.resize();
    }
  }
  
  ngOnInit(): void {
    //
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['center'] && this._map && this._map.isStyleLoaded()) {
      this.updateMapCenter();
    }
  }

  private updateMapCenter(): void {
    if (this._map && this._config.center) {
      this._map.flyTo({
        center: this._config.center,
        zoom: this._map.getZoom() // Maintain current zoom level
      });
    }
  }

  // Public method to center map on specific coordinates
  public centerOnCoordinates(lng: number, lat: number, zoom?: number): void {
    if (this._map && this._map.isStyleLoaded()) {
      this._map.flyTo({
        center: [lng, lat],
        zoom: zoom || this._map.getZoom()
      });
    }
  }

  // Public zoom methods for template use
  public zoomIn(): void {
    if (this._map) {
      try {
        this._map.zoomIn();
        console.log('Map zoomed in, new zoom level:', this._map.getZoom());
      } catch (error) {
        console.error('Error zooming in:', error);
      }
    } else {
      console.warn('Map not initialized, cannot zoom in');
    }
  }

  public zoomOut(): void {
    if (this._map) {
      try {
        this._map.zoomOut();
        console.log('Map zoomed out, new zoom level:', this._map.getZoom());
      } catch (error) {
        console.error('Error zooming out:', error);
      }
    } else {
      console.warn('Map not initialized, cannot zoom out');
    }
  }

  ngAfterViewInit(): void {
    // Initialize the map with the OSM style from the config
    this._map = this.mapService.initializeMap(this.mapElement.nativeElement, {
      style: this._config.mapStyle,
      center: this._config.center,
      zoom: this._config.zoom,
      minZoom: this._config.minZoom,
      maxZoom: this._config.maxZoom
    });
    
    if (this._map) {
      // Navigation control removed - using custom controls only
      
      this._map.on('load', () => {
        this.layerManager.initializeMap(this._map!);
        
        // Activate initial layers if specified
        if (this._config.initialActiveLayers && this._config.initialActiveLayers.length > 0) {
          this._config.initialActiveLayers.forEach(layerId => {
            this.layerManager.activateLayer(layerId);
            // Apply vessel filter if this is the AIS layer
            if (layerId === 'ais-ships') {
              this.applyVesselFilter();
            }
          });
        }
        
        // Emit map load event
        this.mapLoad.emit(this._map!);
        
        // Initialize vessel search if enabled
        if (this.showVesselSearch) {
          this.initializeVesselSearch();
        }
      });

      // Add click event listener for coordinate selection
      this._map.on('click', (e) => {
        if (this.clickable) {
          this.mapClick.emit({
            longitude: e.lngLat.lng,
            latitude: e.lngLat.lat
          });
        }
      });

      // Add right-click event listener for coordinate popup
      this._map.on('contextmenu', (e) => {
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
          .addTo(this._map!);
        
        // Auto-close popup after 5 seconds
        setTimeout(() => {
          popup.remove();
        }, 5000);
      });

      // Add mouse move event listener for coordinate display
      this._map.on('mousemove', (e) => {
        if (this._config.showCoordinateDisplay) {
          this.currentCoordinates.set({
            lng: e.lngLat.lng,
            lat: e.lngLat.lat
          });
        }
      });

      // Add zoom event listeners to update zoom level display
      this._map.on('zoom', () => {
        if (this._map) {
          this.currentZoom.set(this._map.getZoom());
        }
      });

      // Set initial zoom level
      this.currentZoom.set(this._map.getZoom());
    }
  }
  
  toggleLayer(layerId: string): void {
    if (this.layerManager.getLayerStatus(layerId)) {
      this.layerManager.deactivateLayer(layerId);
    } else {
      this.layerManager.activateLayer(layerId);
      // Apply vessel filter if this is the AIS layer
      if (layerId === 'ais-ships') {
        this.applyVesselFilter();
      }
    }
  }
  
  private applyVesselFilter(): void {
    console.log('Map Component: applyVesselFilter called with', this._vesselFilter);
    // Get the AIS layer and apply vessel filter
    const aisLayer = this.layerManager.getLayer('ais-ships');
    console.log('Map Component: AIS layer found:', !!aisLayer);
    if (aisLayer && 'setVesselFilter' in aisLayer) {
      (aisLayer as any).setVesselFilter(this._vesselFilter);
    } else {
      console.log('Map Component: AIS layer not available for filtering');
    }
  }
  
  getLayerName(layerId: string): string {
    return this._config.layerNames?.[layerId] || layerId;
  }
  
  getLatitudeDMS(): string {
    const coords = this.currentCoordinates();
    return this.decimalToDMS(coords.lat, 'lat');
  }
  
  getLongitudeDMS(): string {
    const coords = this.currentCoordinates();
    return this.decimalToDMS(coords.lng, 'lng');
  }
  
  getLatitudeDD(): string {
    const coords = this.currentCoordinates();
    return coords.lat.toFixed(4);
  }
  
  getLongitudeDD(): string {
    const coords = this.currentCoordinates();
    return coords.lng.toFixed(4);
  }
  
  private decimalToDMS(decimal: number, type: 'lat' | 'lng'): string {
    const abs = Math.abs(decimal);
    const degrees = Math.floor(abs);
    const minutes = Math.floor((abs - degrees) * 60);
    const seconds = ((abs - degrees) * 60 - minutes) * 60;
    
    const direction = type === 'lat' 
      ? (decimal >= 0 ? 'N' : 'S')
      : (decimal >= 0 ? 'E' : 'W');
    
    return `${direction}${degrees.toString().padStart(2, '0')}°${minutes.toString().padStart(2, '0')}'${seconds.toFixed(2).padStart(5, '0')}"`;
  }
  
  toggleFullscreen(): void {
    const mapContainer = this.mapElement.nativeElement.parentElement as HTMLElement;
    const newState = !this.isFullscreen();
    
    if (newState) {
      // Enter fullscreen mode
      if (mapContainer.requestFullscreen) {
        mapContainer.requestFullscreen();
      } else if ((mapContainer as any).mozRequestFullScreen) { /* Firefox */
        (mapContainer as any).mozRequestFullScreen();
      } else if ((mapContainer as any).webkitRequestFullscreen) { /* Chrome, Safari & Opera */
        (mapContainer as any).webkitRequestFullscreen();
      } else if ((mapContainer as any).msRequestFullscreen) { /* IE/Edge */
        (mapContainer as any).msRequestFullscreen();
      }
      
      // Update state
      this.isFullscreen.set(true);
      
      // Add listener for fullscreen change events
      document.addEventListener('fullscreenchange', this.handleFullscreenChange);
      document.addEventListener('webkitfullscreenchange', this.handleFullscreenChange);
      document.addEventListener('mozfullscreenchange', this.handleFullscreenChange);
      document.addEventListener('MSFullscreenChange', this.handleFullscreenChange);
      
    } else {
      // Exit fullscreen mode
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if ((document as any).mozCancelFullScreen) { /* Firefox */
        (document as any).mozCancelFullScreen();
      } else if ((document as any).webkitExitFullscreen) { /* Chrome, Safari & Opera */
        (document as any).webkitExitFullscreen();
      } else if ((document as any).msExitFullscreen) { /* IE/Edge */
        (document as any).msExitFullscreen();
      }
      
      // Update state
      this.isFullscreen.set(false);
    }
    
    // Resize the map after toggling fullscreen
    setTimeout(() => {
      if (this._map) {
        this._map.resize();
      }
    }, 100);
  }
  
  // Add this method to handle fullscreen change events
  private handleFullscreenChange = () => {
    const isInFullScreen = !!(
      document.fullscreenElement ||
      (document as any).webkitFullscreenElement ||
      (document as any).mozFullScreenElement ||
      (document as any).msFullscreenElement
    );
    
    this.isFullscreen.set(isInFullScreen);
    
    // Resize the map to fit the new container size
    if (this._map) {
      this._map.resize();
    }
    
    // Remove listeners if we're no longer in fullscreen
    if (!isInFullScreen) {
      document.removeEventListener('fullscreenchange', this.handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', this.handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', this.handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', this.handleFullscreenChange);
    }
  }
  
  // Vessel search methods
  private initializeVesselSearch(): void {
    // Register the AIS layer if needed
    if (!this.layerManager.getLayer('ais-ships')) {
      this.layerManager.registerLayer('ais-ships', AisShipLayerService);
    }
    
    // Get the AIS layer service instance
    const aisLayer = this.layerManager.getLayer('ais-ships');
    if (aisLayer && aisLayer instanceof AisShipLayerService) {
      this.aisLayerService = aisLayer;
      
      // Subscribe to vessel position updates
      this.subscribeToVesselUpdates();
    }
  }
  
  private subscribeToVesselUpdates(): void {
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
  
  onVesselSelected(vessel: VesselWithLocation): void {
    this.selectedVesselId = vessel.id;
    this.vesselSelected.emit(vessel);
    
    // Update vessel filter
    this._vesselFilter = vessel.id;
    this.applyVesselFilter();
    
    // Zoom to vessel location
    if (vessel.latitude && vessel.longitude && this._map) {
      this._map.flyTo({
        center: [vessel.longitude, vessel.latitude],
        zoom: 14,
        speed: 1.5,
        curve: 1.2
      });
      
      // Create highlight effect
      this.createHighlightEffect(vessel.id, vessel.longitude, vessel.latitude);
    }
  }
  
  isVesselLive(vessel: VesselWithLocation): boolean {
    if (!vessel.lastSeen) return false;
    const now = new Date();
    const lastSeen = new Date(vessel.lastSeen);
    const diffMinutes = (now.getTime() - lastSeen.getTime()) / 60000;
    return diffMinutes < 5; // Consider "live" if updated in last 5 minutes
  }
  
  formatVesselLocation(lat: number, lng: number): string {
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
  
  private createHighlightEffect(vesselId: number, lng: number, lat: number): void {
    if (!this._map) return;
    
    // Clear any existing highlight
    this.clearHighlight();
    
    // Store the highlighted vessel ID
    this.highlightedVesselId = vesselId;
    
    // Add a temporary pulsing circle to highlight the vessel
    const highlightId = 'vessel-highlight';
    
    // Add highlight source and layer
    this._map.addSource(highlightId, {
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
    
    this._map.addLayer({
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
      
      if (this._map && this._map.getLayer(highlightId)) {
        this._map.setPaintProperty(highlightId, 'circle-opacity', opacity);
      }
      
      // Stop after 3 pulses (about 3 seconds)
      if (pulseCount >= 3 && !increasing) {
        clearInterval(pulseInterval);
        
        // Fade out and remove
        const fadeInterval = setInterval(() => {
          opacity -= 0.1;
          if (this._map && this._map.getLayer(highlightId)) {
            this._map.setPaintProperty(highlightId, 'circle-opacity', opacity);
            this._map.setPaintProperty(highlightId, 'circle-stroke-opacity', opacity);
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
  
  private clearHighlight(): void {
    // Clear all intervals
    this.highlightIntervals.forEach(interval => clearInterval(interval));
    this.highlightIntervals = [];
    
    // Remove the highlight layer
    this.removeHighlightLayer();
    
    // Clear the tracked vessel ID
    this.highlightedVesselId = null;
  }
  
  private removeHighlightLayer(): void {
    if (!this._map) return;
    
    const highlightId = 'vessel-highlight';
    
    if (this._map.getLayer(highlightId)) {
      this._map.removeLayer(highlightId);
    }
    if (this._map.getSource(highlightId)) {
      this._map.removeSource(highlightId);
    }
  }
  
  private updateHighlightPosition(lng: number, lat: number): void {
    if (!this._map) return;
    
    const highlightId = 'vessel-highlight';
    const source = this._map.getSource(highlightId);
    
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
  
  // Don't forget to clean up when the component is destroyed
  ngOnDestroy(): void {
    // Clean up vessel search
    this.destroy$.next();
    this.destroy$.complete();
    this.clearHighlight();
    
    // Remove fullscreen change listeners
    document.removeEventListener('fullscreenchange', this.handleFullscreenChange);
    document.removeEventListener('webkitfullscreenchange', this.handleFullscreenChange);
    document.removeEventListener('mozfullscreenchange', this.handleFullscreenChange);
    document.removeEventListener('MSFullscreenChange', this.handleFullscreenChange);
    
    // Rest of your cleanup code
    this.layerManager.destroy();
    
    // Remove this specific map instance
    if (this._map) {
      this.mapService.removeMap(this._map);
      this._map = null;
    }
  }
}