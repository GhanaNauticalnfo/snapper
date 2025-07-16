import { Component, ChangeDetectionStrategy, computed, inject, signal, DestroyRef, effect, ViewChild, ElementRef, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { ActivatedRoute, RouterModule, Router } from '@angular/router';
import { toSignal, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { map, finalize, switchMap, of, catchError } from 'rxjs';
import { HttpClient } from '@angular/common/http';

// PrimeNG Imports
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { SkeletonModule } from 'primeng/skeleton';
import { MessageModule } from 'primeng/message';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';

// Map types and utils
import type { Map } from 'maplibre-gl';
import type * as maplibregl from 'maplibre-gl';
import { createOsmMapOptions, defaultGeoJsonStyle, getMapLibreGl, fitMapToVoltaLakeBounds, VOLTA_LAKE_BOUNDS } from '../../utils/map-utils';

// Models/Service
import { TileInfo } from '../../models/tile-info.model';
import { VoltaDepthService } from '../../volta-depth.service';

// Type for derived status signal
type TileDetailStatus = 'loading' | 'error' | 'success' | 'not_found' | 'deleting';

@Component({
    selector: 'app-tile-detail',
    standalone: true,
    imports: [
        CommonModule, RouterModule, DatePipe, DecimalPipe,
        CardModule, ButtonModule, SkeletonModule, MessageModule,
        ConfirmDialogModule, ToastModule
    ],
    providers: [ConfirmationService, MessageService],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <p-toast key="tileDetailToast"></p-toast>
    <p-confirmDialog 
        header="Confirm Deletion" 
        icon="pi pi-exclamation-triangle" 
        acceptButtonStyleClass="p-button-danger" 
        acceptIcon="pi pi-trash"
        rejectButtonStyleClass="p-button-secondary">
    </p-confirmDialog>
    
    <div class="tile-detail-container p-m-2">
        <!-- Switch on the derived status signal -->
        @switch (status()) {
          @case ('loading') {
            <p-skeleton width="100%" height="300px"></p-skeleton>
          }
          @case ('deleting') {
            <p-card>
                <ng-template pTemplate="title">Deleting Tile...</ng-template>
                <div class="flex align-items-center justify-content-center p-4">
                    <i class="pi pi-spin pi-spinner mr-2 text-xl"></i>
                    <span>Deleting tile and its features...</span>
                </div>
            </p-card>
          }
          @case ('error') {
             <p-message severity="error" [text]="error()!"></p-message> <!-- Access error signal -->
             <p-button label="Back to List" icon="pi pi-arrow-left" styleClass="p-button-secondary p-mt-3" [routerLink]="['/volta-depth']"></p-button>
          }
          @case ('not_found') {
             <p-message severity="warn" [text]="error() || 'Tile not found.'"></p-message> <!-- Access error signal -->
             <p-button label="Back to List" icon="pi pi-arrow-left" styleClass="p-button-secondary p-mt-3" [routerLink]="['/volta-depth']"></p-button>
          }
          @case ('success') {
             <!-- Access tile signal directly -->
             <p-card>
                 <ng-template pTemplate="title"> Tile Details: <span class="font-mono">{{ tile()!.id }}</span> </ng-template> <!-- Use non-null assertion -->
                 <div class="p-grid p-fluid detail-grid text-sm">
                    <div class="p-field p-col-12 p-md-6"> <span class="label text-sm">Version</span> <span class="text-base">{{ tile()!.version }}</span> </div>
                    <div class="p-field p-col-12 p-md-6"> <span class="label text-sm">Features</span> <span class="text-base">{{ tile()!.numberOfFeatures | number }}</span> </div>
                    <div class="p-field p-col-12 p-md-6"> <span class="label text-sm">Created</span> <span class="text-base">{{ tile()!.created | date:'yyyy-MM-dd HH:mm:ss' }}</span> </div>
                    <div class="p-field p-col-12 p-md-6"> <span class="label text-sm">Last Updated</span> <span class="text-base">{{ tile()!.lastUpdated | date:'yyyy-MM-dd HH:mm:ss' }}</span> </div>
                 </div>
                 <h5 class="p-mt-4 text-base">Tile Area Map Preview</h5>
                 <div class="map-container">
                    <div #mapContainer class="map-preview-committed border border-surface-300">
                        @if (mapError()) {
                            <div class="map-overlay map-error">
                                <i class="pi pi-exclamation-triangle mr-2"></i>
                                {{ mapError() }}
                            </div>
                        }
                        @if (!isMapInitialized()) {
                            <div class="map-overlay map-placeholder">
                                <i class="pi pi-spin pi-spinner mr-2"></i>
                                Initializing Map...
                            </div>
                        }
                        @if (isLoadingTileBoundary()) {
                            <div class="map-overlay map-placeholder">
                                <i class="pi pi-spin pi-spinner mr-2"></i>
                                Loading Tile Boundary...
                            </div>
                        }
                    </div>
                 </div>
                 <ng-template pTemplate="footer">
                    <div class="flex justify-content-between">
                        <p-button label="Back to List" icon="pi pi-arrow-left" styleClass="p-button-secondary" [routerLink]="['/volta-depth']"></p-button>
                        <p-button label="Delete Tile" icon="pi pi-trash" styleClass="p-button-danger" (onClick)="confirmDeleteTile()"></p-button>
                    </div>
                 </ng-template>
             </p-card>
          }
        }
    </div>
  `,
    styles: [`
    :host { display: block; }
    .tile-detail-container { max-width: 800px; margin: 1rem auto; }
    .font-mono { font-family: monospace; background-color: var(--surface-100); padding: 0.1rem 0.3rem; border-radius: 3px; }
    .detail-grid .p-field { margin-bottom: 1rem; }
    .detail-grid .label { font-weight: 600; min-width: 100px; display: inline-block; color: var(--text-color-secondary); margin-right: 0.5rem; }
    .detail-grid span:not(.label) { color: var(--text-color); }
    h5 { margin-top: 1.5rem; margin-bottom: 0.75rem; color: var(--text-color-secondary); }
    .map-container { position: relative; }
    .map-preview-committed { height: 300px; margin-bottom: 1.5rem; border-radius: var(--border-radius); }
    .map-overlay { position: absolute; top: 0; left: 0; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background-color: rgba(255, 255, 255, 0.8); z-index: 10; }
    .map-error { color: var(--red-600); background-color: rgba(255, 235, 238, 0.9); font-weight: 500; }
  `]
})
export class TileDetailComponent implements AfterViewInit, OnDestroy {
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private voltaDepthService = inject(VoltaDepthService);
    private destroyRef = inject(DestroyRef);
    private confirmationService = inject(ConfirmationService);
    private messageService = inject(MessageService);
    private http = inject(HttpClient);

    @ViewChild('mapContainer') mapContainer!: ElementRef<HTMLDivElement>;

    // Signal for the Tile ID from the Route
    private tileId = toSignal(
        this.route.paramMap.pipe(map(params => params.get('tileId')))
    );

    // --- Separate Signals for State ---
    readonly loading = signal<boolean>(true);
    readonly error = signal<string | null>(null);
    readonly tile = signal<TileInfo | undefined>(undefined);
    readonly deleting = signal<boolean>(false);
    readonly mapError = signal<string | null>(null);
    readonly isMapInitialized = signal<boolean>(false);
    readonly isLoadingTileBoundary = signal<boolean>(false);
    readonly tileBoundary = signal<any>(null);

    // Map properties
    private map?: Map;
    private mapLibreGl: unknown = getMapLibreGl();
    private readonly TILE_BOUNDARY_SOURCE = 'tile-boundary-source';
    private readonly TILE_BOUNDARY_LAYER = 'tile-boundary-layer';
    private readonly VOLTA_GRID_SOURCE = 'volta-grid-source';
    private readonly VOLTA_GRID_LAYER = 'volta-grid-layer';

    // Effect to fetch data when tileId changes
    private fetchDataEffect = effect(() => {
        const id = this.tileId(); // Read the ID signal
        console.log(`TileDetailComponent: Reacting to ID: ${id}`);

        if (!id) {
             this.loading.set(false);
             this.error.set('No Tile ID specified in URL.');
             this.tile.set(undefined);
             return; // Stop if no ID
        }

        this.loading.set(true);
        this.error.set(null);
        // Don't clear previous tile data immediately for potentially smoother loading

        this.voltaDepthService.getTileInfo(id).pipe(
            takeUntilDestroyed(this.destroyRef) // Use DestroyRef here
        ).subscribe({
            next: (tileData) => {
                this.tile.set({ ...tileData, created: new Date(tileData.created), lastUpdated: new Date(tileData.lastUpdated) });
                this.error.set(null); // Clear error on success
            },
            error: (err: Error) => {
                console.error(`TileDetailComponent: Error loading tile ${id}`, err);
                this.error.set(err.message || 'Failed to load tile details');
                this.tile.set(undefined); // Clear tile data on error
            },
            complete: () => {
                this.loading.set(false); // Set loading false when done
            }
        });
    }, { allowSignalWrites: true }); // Allow writing to signals

    ngAfterViewInit(): void {
        // Initialize map after the view has been initialized and if tile data is available
        effect(() => {
            const isSuccess = this.status() === 'success';
            
            if (isSuccess && this.mapContainer?.nativeElement && !this.map) {
                setTimeout(() => this.initializeMap(), 100);
            }
        });
    }

    ngOnDestroy(): void {
        if (this.map) {
            this.map.remove();
        }
    }

    // Initialize map with OSM
    private initializeMap(): void {
        if (!this.mapContainer?.nativeElement) {
            this.mapError.set('Map container not available');
            return;
        }

        if (!this.mapLibreGl) {
            this.mapError.set('MapLibre GL JS not found');
            return;
        }

        try {
            const MapConstructor = (this.mapLibreGl as typeof maplibregl).Map;
            
            if (!MapConstructor) {
                throw new Error('MapLibre Map constructor not found');
            }
            
            // Use utility to create OSM map options
            const mapOptions = createOsmMapOptions(this.mapContainer.nativeElement);
            
            this.map = new MapConstructor(mapOptions);

            this.map.once('load', () => {
                this.isMapInitialized.set(true);
                // Add the Volta Lake grid and the specific tile boundary
                this.loadVoltaLakeGrid();
            });

            this.map.on('error', (e: { error?: Error }) => {
                const msg = e.error?.message || 'Unknown map error';
                this.mapError.set(`Map error: ${msg}`);
                this.isMapInitialized.set(false);
            });
        } catch (e: unknown) {
            const errorMsg = e instanceof Error ? e.message : String(e);
            this.mapError.set(`Map initialization error: ${errorMsg}`);
        }
    }

    // Load the full Volta Lake grid from the GeoJSON file
    private loadVoltaLakeGrid(): void {
        if (!this.map || !this.isMapInitialized()) return;
        
        const currentTileId = this.tile()?.id;
        if (!currentTileId) return;
        
        this.isLoadingTileBoundary.set(true);
        
        // Get the GeoJSON file with all tile boundaries
        this.http.get<any>('assets/data/lake_volta_tiles.geojson')
            .pipe(
                takeUntilDestroyed(this.destroyRef),
                catchError((err) => {
                    console.error('Error loading tile boundaries:', err);
                    this.mapError.set(`Could not load tile boundaries: ${err.message}`);
                    return of(null);
                })
            )
            .subscribe({
                next: (geoJson) => {
                    if (!geoJson) return;
                    
                    try {
                        // Filter to find the specific tile
                        const currentTileFeature = geoJson.features.find(
                            (f: any) => f.properties.id === currentTileId
                        );
                        
                        if (!currentTileFeature) {
                            throw new Error(`Tile boundary with ID ${currentTileId} not found`);
                        }
                        
                        this.tileBoundary.set(currentTileFeature);
                        
                        // First add the entire grid with light styling
                        this.map!.addSource(this.VOLTA_GRID_SOURCE, {
                            type: 'geojson',
                            data: {
                                type: 'FeatureCollection',
                                features: geoJson.features
                            }
                        });
                        
                        this.map!.addLayer({
                            id: this.VOLTA_GRID_LAYER,
                            type: 'line',
                            source: this.VOLTA_GRID_SOURCE,
                            paint: {
                                'line-color': '#ccc',
                                'line-width': 0.5,
                                'line-opacity': 0.7
                            }
                        });
                        
                        // Now add the specific tile with highlighting
                        this.map!.addSource(this.TILE_BOUNDARY_SOURCE, {
                            type: 'geojson',
                            data: currentTileFeature
                        });
                        
                        this.map!.addLayer({
                            id: this.TILE_BOUNDARY_LAYER,
                            type: 'fill',
                            source: this.TILE_BOUNDARY_SOURCE,
                            paint: {
                                'fill-color': '#0d47a1',
                                'fill-opacity': 0.3,
                                'fill-outline-color': '#000'
                            }
                        });
                        
                        // Fit the map to show both the current tile and some context
                        // Extract coordinates for the specific tile
                        const coords = currentTileFeature.geometry.coordinates[0];
                        let minLng = Infinity, maxLng = -Infinity, minLat = Infinity, maxLat = -Infinity;
                        
                        coords.forEach((coord: number[]) => {
                            const [lng, lat] = coord;
                            minLng = Math.min(minLng, lng);
                            maxLng = Math.max(maxLng, lng);
                            minLat = Math.min(minLat, lat);
                            maxLat = Math.max(maxLat, lat);
                        });
                        
                        // Add padding to the bounds (show context around the tile)
                        const paddingFactor = 1; // 100% padding = show an area 3x the size of the tile
                        const lngDiff = maxLng - minLng;
                        const latDiff = maxLat - minLat;
                        
                        this.map!.fitBounds(
                            [
                                [minLng - lngDiff * paddingFactor, minLat - latDiff * paddingFactor],
                                [maxLng + lngDiff * paddingFactor, maxLat + latDiff * paddingFactor]
                            ],
                            { padding: 20 }
                        );
                        
                    } catch (e: unknown) {
                        const errorMsg = e instanceof Error ? e.message : String(e);
                        console.error('Error displaying tile boundary:', errorMsg);
                        this.mapError.set(`Error displaying tile boundary: ${errorMsg}`);
                        
                        // Fallback to showing the entire lake
                        fitMapToVoltaLakeBounds(this.map!);
                    }
                },
                complete: () => {
                    this.isLoadingTileBoundary.set(false);
                }
            });
    }

    // Derived signal for the template @switch status
    readonly status = computed<TileDetailStatus>(() => {
        if (this.deleting()) return 'deleting';
        if (this.loading()) return 'loading';
        if (this.error()?.includes('not found') || this.error()?.includes('No Tile ID')) return 'not_found';
        if (this.error()) return 'error';
        if (this.tile()) return 'success';
        return 'loading'; // Fallback
    });

    /** Shows confirmation dialog before deleting a tile */
    confirmDeleteTile(): void {
        const currentTile = this.tile();
        if (!currentTile) return;
        
        console.log(`Confirming deletion of tile: ${currentTile.id}`);
        
        this.confirmationService.confirm({
            message: `Are you sure you want to delete tile <strong>${currentTile.id}</strong>? <br><br>
                    This will permanently remove the tile and all its <strong>${currentTile.numberOfFeatures}</strong> features. 
                    <br>This action cannot be undone.`,
            accept: () => {
                this.deleteTile(currentTile.id);
            }
        });
    }

    /** Performs the actual tile deletion after confirmation */
    private deleteTile(tileId: string): void {
        console.log(`Deleting tile: ${tileId}`);
        this.deleting.set(true);

        this.voltaDepthService.deleteTile(tileId)
            .pipe(
                takeUntilDestroyed(this.destroyRef),
                finalize(() => this.deleting.set(false))
            )
            .subscribe({
                next: (response) => {
                    console.log('Delete successful:', response);
                    this.messageService.add({
                        key: 'tileDetailToast',
                        severity: 'success',
                        summary: 'Tile Deleted',
                        detail: `Tile ${tileId} has been successfully deleted.`
                    });
                    
                    // Navigate back to the list page after a short delay
                    setTimeout(() => {
                        this.router.navigate(['/volta-depth']);
                    }, 1500);
                },
                error: (err: Error) => {
                    console.error('Delete error:', err);
                    this.deleting.set(false);
                    this.error.set(err.message || 'Failed to delete tile');
                    this.messageService.add({
                        key: 'tileDetailToast',
                        severity: 'error',
                        summary: 'Delete Failed',
                        detail: err.message || 'Failed to delete tile',
                        life: 5000
                    });
                }
            });
    }
}