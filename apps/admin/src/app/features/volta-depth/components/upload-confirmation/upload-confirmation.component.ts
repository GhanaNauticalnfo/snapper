import { Component, ViewChild, ElementRef, signal, inject, computed, ChangeDetectionStrategy, OnDestroy, AfterViewInit, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DecimalPipe } from '@angular/common'; // Need for | number pipe

// PrimeNG Imports
import { ButtonModule } from 'primeng/button';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { MessageModule } from 'primeng/message';

// GeoJSON/MapLibre types
import type { FeatureCollection } from 'geojson';
// Import Map type from MapLibre GL JS
import type { Map } from 'maplibre-gl';
import type * as maplibregl from 'maplibre-gl'; // Import namespace for type assertion

// Inject the PARENT component
import { VoltaDepthComponent } from '../../volta-depth.component';

// Assume maplibre-gl is loaded globally

@Component({
    selector: 'app-upload-confirmation',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CommonModule, DecimalPipe, ButtonModule, ProgressSpinnerModule, MessageModule],
    template: `
   <div class="confirmation-content">
      @if (parentState(); as staged) {
        <div class="details p-mb-3">
          <p><strong>Tile ID:</strong> <span class="font-mono">{{ staged.response.deducedTileId }}</span></p>
          <p><strong>Features Found:</strong> {{ staged.response.featureCount | number }}</p>
          <p><strong>Backend Message:</strong> {{ staged.response.message }}</p>
          @if (staged.response.isUpdate) {
            <p class="p-text-warning font-medium"> Replace existing v{{ staged.response.currentVersion }}?</p>
          } @else {
            <p>Create new data for tile {{ staged.response.deducedTileId }}?</p>
          }
        </div>

        <div class="map-section">
          <h5>Data Preview</h5>
          <div #mapContainer class="map-preview border border-surface-300">
            @if (mapError(); as errorMsg) {
              <div class="map-overlay map-error"><i class="pi pi-exclamation-triangle p-mr-2"></i> {{ errorMsg }}</div>
            } @else if (!isMapInitialized()) {
              <div class="map-overlay map-placeholder">Initializing Map...</div>
            } @else if (isReadingFile()) {
              <div class="map-overlay map-placeholder"><p-progressSpinner strokeWidth="6" styleClass="w-4 h-4"></p-progressSpinner><span class="p-ml-2">Reading file...</span></div>
            }
          </div>
        </div>

         @if(parentCommitError(); as errorMsg) {
            <p-message severity="error" [text]="errorMsg" styleClass="commit-error-message"></p-message>
         }

        <div class="actions p-dialog-footer">
           <p-button type="button" label="Cancel" icon="pi pi-times" (click)="cancel()" [disabled]="parentIsLoading()" severity="secondary" [outlined]="true"></p-button>
           <p-button type="button"
              [label]="staged.response.isUpdate ? 'Confirm Update' : 'Confirm Create'"
              [icon]="parentIsLoading() ? 'pi pi-spin pi-spinner' : 'pi pi-check'"
              (click)="commit()"
              [disabled]="parentIsLoading() || !!mapError()"
              severity="success" [loading]="parentIsLoading()"></p-button>
        </div>

      } @else { <p class="p-text-secondary"><i>Upload details not available.</i></p> }
   </div>
  `,
    styles: [
        `:host { display: block; } 
        .confirmation-content { padding: 0.5rem 0; } 
        .details p { margin: 0.5rem 0; font-size: 0.95em; line-height: 1.5; } 
        .font-mono { font-family: monospace; background-color: var(--surface-100); padding: 0.1rem 0.3rem; border-radius: 3px; } 
        .font-medium { font-weight: 500; } 
        .font-bold { font-weight: 700; } 
        .p-text-warning { color: var(--yellow-600); } 
        .map-section { margin-top: 1.5rem; } 
        h5 { margin-top: 0; margin-bottom: 0.75rem; font-size: 1rem; color: var(--text-color-secondary); } 
        .map-preview { height: 35vh; min-height: 280px; width: 100%; background-color: var(--surface-ground); position: relative; overflow: hidden; border-radius: var(--border-radius); } 
        .map-overlay { position: absolute; top: 0; left: 0; width: 100%; height: 100%; display: flex; flex-direction: row; align-items: center; justify-content: center; background-color: rgba(255, 255, 255, 0.8); color: var(--text-color-secondary); font-style: italic; text-align: center; padding: 1rem; z-index: 10; } 
        .map-error { color: var(--red-600); background-color: rgba(255, 235, 238, 0.9); font-weight: 500; } 
        .map-error .pi { font-size: 1.2rem; margin-right: 0.5rem; } 
        .map-placeholder .p-ml-2 { margin-left: 0.5rem; } 
        .actions { display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 1.5rem; padding-top: 1rem; border-top: 1px solid var(--surface-d);} 
        .commit-error-message { margin-top: 1rem; font-size: 0.9em;}`
    ]
})
export class UploadConfirmationComponent implements AfterViewInit, OnDestroy {
    private parent = inject(VoltaDepthComponent);

    // Access Parent State Signals
    readonly parentState = computed(() => this.parent.currentUploadData());
    readonly parentIsLoading = computed(() => this.parent.commitLoading());
    readonly parentCommitError = computed(() => this.parent.commitError());

    @ViewChild('mapContainer') mapContainer!: ElementRef<HTMLDivElement>;

    // Internal Map State Signals
    readonly mapError = signal<string | null>(null);
    readonly isMapInitialized = signal(false);
    readonly isReadingFile = signal(false);

    private map?: Map;
    private geoJsonData: FeatureCollection | null = null;
    private mapRetryTimeout: ReturnType<typeof setTimeout> | null = null;
    // Use unknown for global library access, cast when needed
    private mapLibreGl: unknown = (typeof window !== 'undefined' ? (window as any)['maplibregl'] : undefined);
    private readonly MAP_SOURCE_ID = 'upload-preview-source';
    private readonly MAP_LAYER_FILL_ID = 'upload-preview-fill';
    private readonly MAP_LAYER_LINE_ID = 'upload-preview-line';

    // Effect to load/clear map data based on parent state
    private loadMapDataEffect = effect(() => {
        const currentFile = this.parentState()?.file;
        if (this.isMapInitialized()) {
             if (currentFile) { this.loadGeoJsonAndDisplay(currentFile); }
             else { this.removeGeoJsonFromMap(); }
        }
    });

    ngAfterViewInit(): void {
        console.log('UploadConfirmationComponent.ngAfterViewInit - MapLibre available:', !!this.mapLibreGl);
        
        if (!this.mapLibreGl) { 
            console.error('MapLibre GL JS not found on window object.');
            this.mapError.set('MapLibre GL JS not found. Check script loading.'); 
            return; 
        }
        
        // Small timeout to allow DOM to settle
        setTimeout(() => this.initializeMap(), 50);
    }

    ngOnDestroy(): void {
        this.map?.remove();
        if (this.mapRetryTimeout) clearTimeout(this.mapRetryTimeout);
    }

    // Initialize map with OSM
    initializeMap(): void {
        console.log('Initializing map with OSM...');
        
        if (this.map) {
            console.log('Map already initialized, skipping');
            return;
        }
        
        if (!this.mapContainer?.nativeElement) {
            console.error('Map container element not found');
            this.mapError.set('Map container not found');
            return;
        }
        
        if (!this.mapLibreGl) {
            console.error('MapLibre GL not available');
            this.mapError.set('MapLibre GL JS not found');
            return;
        }
        
        this.mapError.set(null);
        this.isMapInitialized.set(false);
        
        try {
            // Use type assertion if @types/maplibre-gl is installed and maplibregl is imported
            const MapConstructor = (this.mapLibreGl as typeof maplibregl).Map;
            
            if (!MapConstructor) {
                throw new Error('MapLibre Map constructor not found');
            }
            
            // Import the utility function for map options
            import('../../utils/map-utils').then(({ createOsmMapOptions }) => {
                try {
                    // Create map with OSM
                    const mapOptions = createOsmMapOptions(this.mapContainer.nativeElement);
                    
                    console.log('Creating map with OSM style');
                    this.map = new MapConstructor(mapOptions);
                    
                    this.map.once('load', () => {
                        console.log('OSM Map loaded successfully');
                        this.isMapInitialized.set(true);
                        const file = this.parentState()?.file;
                        if (file) {
                            console.log('File available, loading to map:', file.name);
                            this.loadGeoJsonAndDisplay(file);
                        }
                    });
                    
                    this.map.on('error', (e: { error?: Error }) => {
                        const msg = e.error?.message || 'Unknown map error';
                        console.error('Map error:', msg);
                        this.mapError.set(`Map failed: ${msg}`);
                        this.isMapInitialized.set(false);
                    });
                    
                } catch (err) {
                    console.error('Error creating map with options:', err);
                    this.mapError.set(`Error creating map: ${err}`);
                }
            }).catch(err => {
                console.error('Error importing map utils:', err);
                this.mapError.set(`Error loading map utilities: ${err}`);
            });
            
        } catch (e: unknown) {
            const errorMsg = e instanceof Error ? e.message : String(e);
            console.error('Map initialization error:', errorMsg);
            this.mapError.set(`Map init error: ${errorMsg}`);
            this.isMapInitialized.set(false);
        }
    }

    loadGeoJsonAndDisplay(file: File | null): void {
        if (!file) { 
            console.warn('No file provided to loadGeoJsonAndDisplay');
            this.mapError.set("No file provided"); 
            this.removeGeoJsonFromMap(); 
            return; 
        }
        
        if (!this.isMapInitialized() || !this.map) { 
            console.warn('Map not initialized, delaying GeoJSON load');
            this.mapError.set("Map not ready. Please wait..."); 
            
            // Clear any existing timeout to prevent multiple attempts
            if (this.mapRetryTimeout) {
                clearTimeout(this.mapRetryTimeout);
            }
            
            // Try again after a short delay
            this.mapRetryTimeout = setTimeout(() => this.loadGeoJsonAndDisplay(file), 300); 
            return; 
        }
        
        // Check if map is fully loaded
        if (!this.map.loaded()) {
            console.warn('Map not fully loaded, delaying GeoJSON display');
            this.mapError.set("Map still loading...");
            
            if (this.mapRetryTimeout) {
                clearTimeout(this.mapRetryTimeout);
            }
            
            this.mapRetryTimeout = setTimeout(() => this.loadGeoJsonAndDisplay(file), 300);
            return;
        }
        
        console.log(`Reading GeoJSON file: ${file.name}, size: ${file.size} bytes`);
        this.mapError.set(null); 
        this.isReadingFile.set(true);
        
        const reader = new FileReader();
        
        reader.onload = (event) => {
            this.isReadingFile.set(false);
            try {
                if (!event.target?.result) {
                    throw new Error('File read resulted in null or undefined content');
                }
                
                const content = event.target.result as string;
                console.log(`Successfully read ${content.length} bytes from file`);
                
                try {
                    this.geoJsonData = JSON.parse(content);
                } catch (parseError) {
                    console.error('JSON parse error:', parseError);
                    throw new Error(`Invalid JSON format: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
                }
                
                if (!this.geoJsonData) {
                    throw new Error('Parsed GeoJSON is null or undefined');
                }
                
                if (this.geoJsonData.type !== 'FeatureCollection') {
                    console.error('Invalid GeoJSON type:', this.geoJsonData.type);
                    throw new Error(`Invalid GeoJSON type: expected FeatureCollection, got ${this.geoJsonData.type}`);
                }
                
                if (!Array.isArray(this.geoJsonData.features)) {
                    throw new Error('GeoJSON features property is not an array');
                }
                
                console.log(`GeoJSON contains ${this.geoJsonData.features.length} features`);
                this.addGeoJsonToMap();
                
            } catch (e: unknown) { 
                const errorMsg = e instanceof Error ? e.message : String(e);
                console.error('GeoJSON parsing error:', errorMsg);
                this.mapError.set(`GeoJSON parse error: ${errorMsg}`); 
                this.geoJsonData = null; 
                this.removeGeoJsonFromMap(); 
            }
        };
        
        reader.onerror = (event) => {
            this.isReadingFile.set(false);
            const msg = event.target?.error?.message || 'Unknown read error';
            console.error('File read error:', msg);
            this.mapError.set(`File read error: ${msg}`); 
            this.geoJsonData = null; 
            this.removeGeoJsonFromMap();
        };
        
        reader.readAsText(file);
    }

    addGeoJsonToMap(): void {
        if (!this.map) {
            console.error('Map instance not available');
            return;
        }
        
        if (!this.geoJsonData) {
            console.error('No GeoJSON data available to add to map');
            return;
        }
        
        if (!this.map.loaded()) {
            console.warn('Map not fully loaded, delaying adding GeoJSON layer');
            setTimeout(() => this.addGeoJsonToMap(), 200);
            return;
        }
        
        console.log('Adding GeoJSON to map');
        
        // Remove any existing layers and sources first
        this.removeGeoJsonFromMap();
        
        try {
            // Add the GeoJSON as a source
            this.map.addSource(this.MAP_SOURCE_ID, { 
                type: 'geojson', 
                data: this.geoJsonData 
            });
            
            console.log('Added GeoJSON source to map');
            
            // Import default styles from map utils
            import('../../utils/map-utils').then(({ defaultGeoJsonStyle }) => {
                // Add a fill layer
                this.map!.addLayer({ 
                    id: this.MAP_LAYER_FILL_ID, 
                    type: 'fill', 
                    source: this.MAP_SOURCE_ID, 
                    paint: defaultGeoJsonStyle.fill.paint
                });
                
                // Add a line layer
                this.map!.addLayer({ 
                    id: this.MAP_LAYER_LINE_ID, 
                    type: 'line', 
                    source: this.MAP_SOURCE_ID, 
                    paint: defaultGeoJsonStyle.line.paint
                });
                
                console.log('Added GeoJSON layers to map');
                
                // Fit the map to the bounds of the GeoJSON data
                this.fitMapToBounds();
            }).catch(err => {
                console.error('Error importing default styles:', err);
                // Fallback to hardcoded styles
                this.map!.addLayer({ 
                    id: this.MAP_LAYER_FILL_ID, 
                    type: 'fill', 
                    source: this.MAP_SOURCE_ID, 
                    paint: { 'fill-color': '#0d47a1', 'fill-opacity': 0.3 }
                });
                
                this.map!.addLayer({ 
                    id: this.MAP_LAYER_LINE_ID, 
                    type: 'line', 
                    source: this.MAP_SOURCE_ID, 
                    paint: { 'line-color': '#000', 'line-width': 0.8 }
                });
                
                this.fitMapToBounds();
            });
            
        } catch (e: unknown) {
            const errorMsg = e instanceof Error ? e.message : String(e);
            console.error('Error adding GeoJSON to map:', errorMsg);
            this.mapError.set(`Error displaying GeoJSON: ${errorMsg}`);
        }
    }

    removeGeoJsonFromMap(): void {
        if (!this.map) return;
        
        try {
            if (this.map.getLayer(this.MAP_LAYER_FILL_ID)) {
                this.map.removeLayer(this.MAP_LAYER_FILL_ID);
            }
            
            if (this.map.getLayer(this.MAP_LAYER_LINE_ID)) {
                this.map.removeLayer(this.MAP_LAYER_LINE_ID);
            }
            
            if (this.map.getSource(this.MAP_SOURCE_ID)) {
                this.map.removeSource(this.MAP_SOURCE_ID);
            }
            
            console.log('Removed existing GeoJSON layers and source from map');
        } catch (e) {
            console.error('Error removing GeoJSON from map:', e);
        }
    }

    fitMapToBounds(): void {
        if (!this.map || !this.geoJsonData || this.geoJsonData.features.length === 0) {
            console.warn('Cannot fit map to bounds - map or GeoJSON data not available');
            return;
        }
        
        console.log("Fitting map to Volta Lake bounds");
        
        // Import the helper function to fit the map to Volta Lake bounds
        // First try to fit to the GeoJSON features if possible
        try {
            // Calculate bounds from GeoJSON features
            let minLng = Infinity, maxLng = -Infinity, minLat = Infinity, maxLat = -Infinity;
            
            this.geoJsonData.features.forEach(feature => {
                if (!feature.geometry) return;
                
                // Handle different geometry types safely
                if (feature.geometry.type === 'MultiPolygon') {
                    // Handle MultiPolygon - coordinates is array of array of array of positions
                    feature.geometry.coordinates.forEach((polygon: number[][][]) => {
                        polygon.forEach((ring: number[][]) => {
                            ring.forEach((coord: number[]) => {
                                const [lng, lat] = coord;
                                minLng = Math.min(minLng, lng);
                                maxLng = Math.max(maxLng, lng);
                                minLat = Math.min(minLat, lat);
                                maxLat = Math.max(maxLat, lat);
                            });
                        });
                    });
                }
                else if (feature.geometry.type === 'Polygon') {
                    // Handle Polygon - coordinates is array of array of positions
                    feature.geometry.coordinates.forEach((ring: number[][]) => {
                        ring.forEach((coord: number[]) => {
                            const [lng, lat] = coord;
                            minLng = Math.min(minLng, lng);
                            maxLng = Math.max(maxLng, lng);
                            minLat = Math.min(minLat, lat);
                            maxLat = Math.max(maxLat, lat);
                        });
                    });
                }
                // Add additional geometry type handlers if needed
            });
            
            // Only proceed if we found valid bounds
            if (minLng !== Infinity && maxLng !== -Infinity && minLat !== Infinity && maxLat !== -Infinity) {
                // Add some padding to the bounds
                const paddingFactor = 0.1; // 10% padding
                const lngPadding = (maxLng - minLng) * paddingFactor;
                const latPadding = (maxLat - minLat) * paddingFactor;
                
                this.map.fitBounds(
                    [
                        [minLng - lngPadding, minLat - latPadding], // SW
                        [maxLng + lngPadding, maxLat + latPadding]  // NE
                    ],
                    { padding: 50, maxZoom: 10 }
                );
                
                console.log("Map view adjusted to GeoJSON bounds");
                return;
            } else {
                throw new Error("Could not calculate valid bounds from features");
            }
        } catch (e) {
            console.error("Error calculating GeoJSON bounds, using Volta Lake bounds instead", e);
            // Fallback to fitting to the entire Volta Lake bounds
            import('../../utils/map-utils').then(({ fitMapToVoltaLakeBounds }) => {
                fitMapToVoltaLakeBounds(this.map);
                console.log("Map view adjusted to Volta Lake bounds");
            });
        }
    }

    // --- Actions call parent methods ---
    commit(): void { 
        console.log('Committing upload...');
        this.parent.triggerCommit(); 
    }
    
    cancel(): void { 
        console.log('Cancelling upload...');
        this.parent.cancelCommit(); 
    }
}