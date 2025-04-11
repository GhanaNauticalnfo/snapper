// libs/map/src/lib/components/map/map.component.ts
import { Component, OnInit, AfterViewInit, OnDestroy, ElementRef, ViewChild, inject, signal, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MapService } from '../../core/map.service';
import { LayerManagerService } from '../../core/layer-manager.service';
import { Map, LngLatLike, NavigationControl } from 'maplibre-gl';
import { MapConfig, DEFAULT_MAP_CONFIG } from '../../models/map-config.model';

@Component({
  selector: 'lib-map',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="map-container" [class.fullscreen]="isFullscreen()" [style.height]="_config.height">
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
      <ng-content></ng-content>
    </div>
  `,
  styles: [`
    .map-container {
      position: relative;
      height: 500px;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
      transition: all 0.3s ease;
    }
    .map-container.fullscreen {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100% !important;
      z-index: 9999;
      border-radius: 0;
    }
    .map-canvas {
      height: 100%;
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
  `]
})
export class MapComponent implements OnInit, AfterViewInit, OnDestroy {
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
  
  // Default configuration
  _config: MapConfig = { ...DEFAULT_MAP_CONFIG };
  
  private mapService = inject(MapService);
  public layerManager = inject(LayerManagerService);
  
  // Fullscreen state
  isFullscreen = signal<boolean>(false);
  
  // Map instance for public access
  private _map: Map | null = null;
  get map(): Map | null {
    return this._map;
  }
  
  ngOnInit(): void {
    //
  }

  ngAfterViewInit(): void {
    // Initialize the map with the OSM style from the config
    this._map = this.mapService.initializeMap(this.mapElement.nativeElement, {
      style: this._config.mapStyle,
      center: this._config.center,
      zoom: this._config.zoom
    });
    
    if (this._map) {
      // Only add the navigation control if configured
      if (this._config.showZoomControls || this._config.showCompass) {
        this._map.addControl(new NavigationControl({
          showCompass: this._config.showCompass,
          showZoom: this._config.showZoomControls
        }), 'top-right');
      }
      
      this._map.on('load', () => {
        this.layerManager.initializeMap(this._map!);
        
        // Activate initial layers if specified
        if (this._config.initialActiveLayers && this._config.initialActiveLayers.length > 0) {
          this._config.initialActiveLayers.forEach(layerId => {
            this.layerManager.activateLayer(layerId);
          });
        }
      });
    }
  }
  
  toggleLayer(layerId: string): void {
    if (this.layerManager.getLayerStatus(layerId)) {
      this.layerManager.deactivateLayer(layerId);
    } else {
      this.layerManager.activateLayer(layerId);
    }
  }
  
  getLayerName(layerId: string): string {
    return this._config.layerNames?.[layerId] || layerId;
  }
  
  toggleFullscreen(): void {
    const newState = !this.isFullscreen();
    this.isFullscreen.set(newState);
    
    // Resize the map after toggling fullscreen to ensure proper rendering
    setTimeout(() => {
      if (this._map) {
        this._map.resize();
      }
    }, 100);
    
    // Optionally handle escape key to exit fullscreen
    if (newState) {
      const escapeHandler = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          this.isFullscreen.set(false);
          
          setTimeout(() => {
            if (this._map) {
              this._map.resize();
            }
          }, 100);
          
          document.removeEventListener('keydown', escapeHandler);
        }
      };
      
      document.addEventListener('keydown', escapeHandler);
    }
  }

  ngOnDestroy(): void {
    this.layerManager.destroy();
    this.mapService.removeMap();
  }
}