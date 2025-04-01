import { Component, ViewChild, ElementRef, signal, inject, computed, ChangeDetectionStrategy, OnDestroy, AfterViewInit, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DecimalPipe } from '@angular/common'; // Need for | number pipe

// PrimeNG Imports
import { ButtonModule } from 'primeng/button';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { MessageModule } from 'primeng/message';

// GeoJSON/MapLibre types
import type { FeatureCollection } from 'geojson';
// Import Map type and MapLibre GL JS namespace type if @types/maplibre-gl is installed
import type { Map, MapOptions } from 'maplibre-gl';
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
    styles: [ // Styles remain the same
        `:host { display: block; } .confirmation-content { padding: 0.5rem 0; } .details p { margin: 0.5rem 0; font-size: 0.95em; line-height: 1.5; } .font-mono { font-family: monospace; background-color: var(--surface-100); padding: 0.1rem 0.3rem; border-radius: 3px; } .font-medium { font-weight: 500; } .font-bold { font-weight: 700; } .p-text-warning { color: var(--yellow-600); } .map-section { margin-top: 1.5rem; } h5 { margin-top: 0; margin-bottom: 0.75rem; font-size: 1rem; color: var(--text-color-secondary); } .map-preview { height: 35vh; min-height: 280px; width: 100%; background-color: var(--surface-ground); position: relative; overflow: hidden; border-radius: var(--border-radius); } .map-overlay { position: absolute; top: 0; left: 0; width: 100%; height: 100%; display: flex; flex-direction: row; align-items: center; justify-content: center; background-color: rgba(255, 255, 255, 0.8); color: var(--text-color-secondary); font-style: italic; text-align: center; padding: 1rem; z-index: 10; } .map-error { color: var(--red-600); background-color: rgba(255, 235, 238, 0.9); font-weight: 500; } .map-error .pi { font-size: 1.2rem; margin-right: 0.5rem; } .map-placeholder .p-ml-2 { margin-left: 0.5rem; } .actions { display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 1.5rem; padding-top: 1rem; border-top: 1px solid var(--surface-d);} .commit-error-message { margin-top: 1rem; font-size: 0.9em;} :host ::ng-deep .p-message-wrapper { margin-bottom: 1rem; }`
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    }, { allowSignalWrites: true });

    ngAfterViewInit(): void {
        if (!this.mapLibreGl) { this.mapError.set('MapLibre GL JS not found.'); return; }
        setTimeout(() => this.initializeMap(), 50);
    }

    ngOnDestroy(): void {
        this.map?.remove();
        if (this.mapRetryTimeout) clearTimeout(this.mapRetryTimeout);
    }

    initializeMap(): void {
        if (this.map || !this.mapContainer?.nativeElement || !this.mapLibreGl) return;
        this.mapError.set(null); this.isMapInitialized.set(false);
        try {
            // Use type assertion if @types/maplibre-gl is installed and maplibregl is imported
            const MapConstructor = (this.mapLibreGl as typeof maplibregl).Map;
            const mapOptions: MapOptions = {
                container: this.mapContainer.nativeElement,
                style: 'https://demotiles.maplibre.org/style.json',
                center: [-0.5, 7.5],
                zoom: 7,
                attributionControl: false
            };
            this.map = new MapConstructor(mapOptions);

            this.map?.once('load', () => {
                 this.isMapInitialized.set(true);
                 const file = this.parentState()?.file;
                 if (file) this.loadGeoJsonAndDisplay(file);
            });
            this.map?.on('error', (e: { error?: Error }) => {
                const msg = e.error?.message || 'Unknown map error';
                this.mapError.set(`Map failed: ${msg}`); this.isMapInitialized.set(false);
            });
        } catch (e: unknown) {
            this.mapError.set(`Map init error: ${e instanceof Error ? e.message : String(e)}`);
            this.isMapInitialized.set(false);
        }
    }

    loadGeoJsonAndDisplay(file: File | null): void {
        if (!file) { this.mapError.set("No file."); this.removeGeoJsonFromMap(); return; }
        if (!this.isMapInitialized() || !this.map?.loaded()) { this.mapError.set("Map loading..."); if (this.mapRetryTimeout) clearTimeout(this.mapRetryTimeout); this.mapRetryTimeout = setTimeout(() => this.loadGeoJsonAndDisplay(file), 300); return; }
        this.mapError.set(null); this.isReadingFile.set(true); const reader = new FileReader();
        reader.onload = (event) => {
             this.isReadingFile.set(false);
             try {
                 if (!event.target?.result) throw new Error('Read error.');
                 this.geoJsonData = JSON.parse(event.target.result as string);
                 if (this.geoJsonData?.type !== 'FeatureCollection' || !Array.isArray(this.geoJsonData?.features)) throw new Error('Invalid GeoJSON.');
                 this.addGeoJsonToMap();
            } catch (e: unknown) { this.mapError.set(`Parse error: ${e instanceof Error ? e.message : String(e)}`); this.geoJsonData = null; this.removeGeoJsonFromMap(); }
        };
        reader.onerror = (event) => {
             this.isReadingFile.set(false);
             const msg = event.target?.error?.message || 'read error';
             this.mapError.set(`File read error: ${msg}`); this.geoJsonData = null; this.removeGeoJsonFromMap();
        };
        reader.readAsText(file);
    }

    addGeoJsonToMap(): void {
         if (!this.map || !this.geoJsonData || !this.map.loaded()) return; this.removeGeoJsonFromMap(); try { this.map.addSource(this.MAP_SOURCE_ID, { type: 'geojson', data: this.geoJsonData }); this.map.addLayer({ id: this.MAP_LAYER_FILL_ID, type: 'fill', source: this.MAP_SOURCE_ID, paint: { 'fill-color': '#0d47a1', 'fill-opacity': 0.3 } }); this.map.addLayer({ id: this.MAP_LAYER_LINE_ID, type: 'line', source: this.MAP_SOURCE_ID, paint: { 'line-color': '#000', 'line-width': 0.8 } }); this.fitMapToBounds(); } catch (e: unknown) { this.mapError.set(`Display error: ${e instanceof Error ? e.message : String(e)}`); }
    }

    removeGeoJsonFromMap(): void {
         if (!this.map) return;
         if (this.map.getLayer(this.MAP_LAYER_FILL_ID)) this.map.removeLayer(this.MAP_LAYER_FILL_ID);
         if (this.map.getLayer(this.MAP_LAYER_LINE_ID)) this.map.removeLayer(this.MAP_LAYER_LINE_ID);
         if (this.map.getSource(this.MAP_SOURCE_ID)) this.map.removeSource(this.MAP_SOURCE_ID);
    }

    fitMapToBounds(): void {
         if (!this.map || !this.geoJsonData || this.geoJsonData.features.length === 0) return; console.warn("FitBounds using Turf is recommended."); this.map.flyTo({ center: [-0.5, 7.5], zoom: 8 });
    }

    // --- Actions call parent methods ---
    commit(): void { this.parent.triggerCommit(); }
    cancel(): void { this.parent.cancelCommit(); }
}