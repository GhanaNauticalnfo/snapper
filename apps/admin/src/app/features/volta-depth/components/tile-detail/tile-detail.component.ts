import { Component, ChangeDetectionStrategy, computed, inject, signal, DestroyRef, effect } from '@angular/core'; // Import signal, DestroyRef, effect
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import {  toSignal, takeUntilDestroyed } from '@angular/core/rxjs-interop'; // Import takeUntilDestroyed
import {map } from 'rxjs'; // Import finalize

// PrimeNG Imports
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { SkeletonModule } from 'primeng/skeleton';
import { MessageModule } from 'primeng/message';

// Models/Service
import { TileInfo } from '../../models/tile-info.model';
import { VoltaDepthService } from '../../volta-depth.service';

// Type for derived status signal
type TileDetailStatus = 'loading' | 'error' | 'success' | 'not_found';

@Component({
    selector: 'app-tile-detail',
    standalone: true,
    imports: [
        CommonModule, RouterModule, DatePipe, DecimalPipe,
        CardModule, ButtonModule, SkeletonModule, MessageModule
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <div class="tile-detail-container p-m-2">
        <!-- Switch on the derived status signal -->
        @switch (status()) {
          @case ('loading') {
            <p-skeleton width="100%" height="300px"></p-skeleton>
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
                 <div class="p-grid p-fluid detail-grid">
                    <div class="p-field p-col-12 p-md-6"> <span class="label">Version</span> <span>{{ tile()!.version }}</span> </div>
                    <div class="p-field p-col-12 p-md-6"> <span class="label">Features</span> <span>{{ tile()!.numberOfFeatures | number }}</span> </div>
                    <div class="p-field p-col-12 p-md-6"> <span class="label">Created</span> <span>{{ tile()!.created | date:'yyyy-MM-dd HH:mm:ss' }}</span> </div>
                    <div class="p-field p-col-12 p-md-6"> <span class="label">Last Updated</span> <span>{{ tile()!.lastUpdated | date:'yyyy-MM-dd HH:mm:ss' }}</span> </div>
                 </div>
                 <h5 class="p-mt-4">Committed Data Preview (Future)</h5>
                 <div class="map-preview-committed flex align-items-center justify-content-center text-secondary border border-surface-200 bg-surface-ground"><i>Map preview needed.</i></div>
                 <ng-template pTemplate="footer">
                    <p-button label="Back to List" icon="pi pi-arrow-left" styleClass="p-button-secondary" [routerLink]="['/volta-depth']"></p-button>
                 </ng-template>
             </p-card>
          }
        }
    </div>
  `,
    styles: [`
    :host { display: block; } .tile-detail-container { max-width: 800px; margin: 1rem auto; }
    .font-mono { font-family: monospace; background-color: var(--surface-100); padding: 0.1rem 0.3rem; border-radius: 3px; }
    .detail-grid .p-field { margin-bottom: 1rem; }
    .detail-grid .label { font-weight: 600; min-width: 100px; display: inline-block; color: var(--text-color-secondary); margin-right: 0.5rem; font-size: 0.9em; }
    .detail-grid span:not(.label) { font-size: 1em; color: var(--text-color); }
    h5 { margin-top: 1.5rem; margin-bottom: 0.75rem; font-size: 1rem; color: var(--text-color-secondary); }
    .map-preview-committed { min-height: 200px; margin-bottom: 1.5rem; border-radius: var(--border-radius); padding: 1rem; }
    :host ::ng-deep .p-card .p-card-content { padding-top: 1.5rem; }
    :host ::ng-deep .p-card .p-card-footer { padding-top: 1rem; }
     :host ::ng-deep p-message .p-message-wrapper { margin-bottom: 1rem; }
     p-skeleton { /* ... */ }
  `]
})
export class TileDetailComponent {
    private route = inject(ActivatedRoute);
    private voltaDepthService = inject(VoltaDepthService);
    private destroyRef = inject(DestroyRef);

    // Signal for the Tile ID from the Route
    private tileId = toSignal(
        this.route.paramMap.pipe(map(params => params.get('tileId')))
    );

    // --- Separate Signals for State ---
    readonly loading = signal<boolean>(true);
    readonly error = signal<string | null>(null);
    readonly tile = signal<TileInfo | undefined>(undefined);

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

    // Derived signal for the template @switch status
    readonly status = computed<TileDetailStatus>(() => {
        if (this.loading()) return 'loading';
        if (this.error()?.includes('not found') || this.error()?.includes('No Tile ID')) return 'not_found';
        if (this.error()) return 'error';
        if (this.tile()) return 'success';
        // This case might be hit briefly if loading finishes but tile hasn't been set yet,
        // or if there's an unknown error state. Defaulting to 'loading' or 'error' might be safer.
        return 'loading'; // Fallback
    });
}