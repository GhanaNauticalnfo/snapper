// libs/map/src/lib/components/map/map.component.ts
import { Component, OnInit, AfterViewInit, OnDestroy, OnChanges, SimpleChanges, ElementRef, ViewChild, inject, signal, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MapService } from '../../core/map.service';
import { LayerManagerService } from '../../core/layer-manager.service';
import { Map, LngLatLike, NavigationControl, Popup } from 'maplibre-gl';
import { MapConfig, DEFAULT_MAP_CONFIG } from '../../models/map-config.model';

@Component({
  selector: 'lib-map',
  standalone: true,
  imports: [CommonModule],
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
  `]
})
export class MapComponent implements OnInit, AfterViewInit, OnDestroy, OnChanges {
  @ViewChild('mapElement') mapElement!: ElementRef;
  
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
  
  // Events
  @Output() mapClick = new EventEmitter<{longitude: number, latitude: number}>();
  @Output() mapLoad = new EventEmitter<Map>();
  
  // Default configuration
  _config: MapConfig = { ...DEFAULT_MAP_CONFIG };
  private _vesselFilter: number | null = null;
  
  private mapService = inject(MapService);
  public layerManager = inject(LayerManagerService);
  
  // Fullscreen state
  isFullscreen = signal<boolean>(false);
  
  // Coordinate display state
  currentCoordinates = signal<{lng: number, lat: number}>({lng: 0, lat: 0});
  currentZoom = signal<number>(9);
  
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
  
  // Don't forget to clean up when the component is destroyed
  ngOnDestroy(): void {
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