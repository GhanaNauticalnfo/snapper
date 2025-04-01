import { Component, ChangeDetectionStrategy, computed, inject, signal, DestroyRef, effect } from '@angular/core'; // Import signal, DestroyRef
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop'; // Import takeUntilDestroyed
import { Subject, Observable, switchMap, startWith, tap, map, catchError, of, finalize } from 'rxjs'; // Import finalize

// PrimeNG Imports
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { SkeletonModule } from 'primeng/skeleton';
import { MessageModule } from 'primeng/message';
import { TagModule } from 'primeng/tag';

// Models/Service
import { TileInfo } from '../../models/tile-info.model';
import { VoltaDepthService } from '../../volta-depth.service';

// Type for derived status signal
type TileListStatus = 'loading' | 'error' | 'success' | 'empty';

@Component({
    selector: 'app-tile-list',
    standalone: true,
    imports: [
        CommonModule, RouterModule, DatePipe, DecimalPipe,
        TableModule, ButtonModule, SkeletonModule, MessageModule, TagModule
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <div class="tile-list-container">
        <div class="flex justify-content-between align-items-center mb-3">
            <h4>Existing Tiles</h4>
            <p-button
                icon="pi pi-refresh"
                [label]="loading() ? 'Loading...' : 'Refresh'"
                (onClick)="refreshTrigger.next()"
                [disabled]="loading()"
                styleClass="p-button-sm p-button-outlined"
            ></p-button>
        </div>

        <!-- Switch on the derived status signal -->
        @switch (status()) {
          @case ('loading') {
            <p-skeleton height="150px" styleClass="mb-2"></p-skeleton>
          }
          @case ('error') {
            <!-- Access error signal directly -->
            <p-message severity="error" [text]="error()!"></p-message>
          }
          @case ('empty') {
             <p class="no-tiles-message text-center p-text-secondary">No tiles have been uploaded yet.</p>
          }
          @case ('success') {
            <!-- Access tiles signal directly -->
            <div class="table-container">
              <p-table [value]="tiles()!" styleClass="p-datatable-sm p-datatable-striped" [tableStyle]="{'min-width': '50rem'}">
                <ng-template pTemplate="header"><tr><th pSortableColumn="id" style="width: 10%">ID <p-sortIcon field="id"></p-sortIcon></th><th pSortableColumn="version" style="width: 10%">Ver <p-sortIcon field="version"></p-sortIcon></th><th pSortableColumn="numberOfFeatures" style="width: 15%">Feat <p-sortIcon field="numberOfFeatures"></p-sortIcon></th><th pSortableColumn="lastUpdated" style="width: 35%">Updated <p-sortIcon field="lastUpdated"></p-sortIcon></th><th style="width: 20%">Actions</th></tr></ng-template>
                <ng-template pTemplate="body" let-tile let-i="$index"> <!-- Correct index syntax -->
                    <tr [class.alt-row]="i % 2 !== 0">
                        <td><span class="font-mono">{{ tile.id }}</span></td>
                        <td><p-tag [value]="tile.version" severity="info"></p-tag></td>
                        <td>{{ tile.numberOfFeatures | number }}</td>
                        <td>{{ tile.lastUpdated | date:'yyyy-MM-dd HH:mm:ss' }}</td>
                        <td><p-button label="Details" icon="pi pi-search" styleClass="p-button-text p-button-sm" [routerLink]="['/volta-depth', tile.id]"></p-button></td>
                    </tr>
                </ng-template>
                 <ng-template pTemplate="emptymessage"><tr><td colspan="5" class="text-center p-4">No tiles found.</td></tr></ng-template>
              </p-table>
            </div>
          }
        }
    </div>
  `,
    styles: [`
    :host { display: block; } .tile-list-container { margin-top: 1rem; }
    .font-mono { font-family: monospace; background-color: var(--surface-100); padding: 0.1rem 0.3rem; border-radius: 3px; }
    :host ::ng-deep .p-datatable-sm .p-datatable-tbody > tr > td { padding: 0.6rem 0.8rem; vertical-align: middle; }
    :host ::ng-deep .p-datatable .p-datatable-thead > tr > th { text-align: left; background-color: var(--surface-100); font-size: 0.85rem; padding: 0.6rem 0.8rem; }
    :host ::ng-deep .p-tag { font-size: 0.8rem; }
     .no-tiles-message { margin-top: 1rem; padding: 1rem; text-align: center; color: var(--text-color-secondary); }
    .refresh-button { /* Add styles */ } p-skeleton { /* ... */ } p-message { margin-bottom: 1rem; }
    .loading-inline { font-style: italic; color: var(--text-color-secondary); padding: 0.5rem; text-align: center; }
  `]
})
export class TileListComponent {
    private voltaDepthService = inject(VoltaDepthService);
    private destroyRef = inject(DestroyRef);
    readonly refreshTrigger = new Subject<void>();

    // --- Separate Signals for State ---
    readonly loading = signal<boolean>(true);
    readonly error = signal<string | null>(null);
    readonly tiles = signal<TileInfo[] | undefined>(undefined);

    // Effect to fetch data and update signals
    private fetchDataEffect = effect(() => {
        this.refreshTrigger.pipe(
            startWith(undefined),
            takeUntilDestroyed(this.destroyRef),
            tap(() => {
                this.loading.set(true); this.error.set(null);
                // Don't clear tiles immediately on refresh for better UX
                // if (this.tiles() === undefined) this.tiles.set(undefined); // Reset only if undefined?
            }),
            switchMap(() => this.voltaDepthService.listTiles().pipe(
                tap((data) => {
                    this.tiles.set(data.map(t => ({ ...t, created: new Date(t.created), lastUpdated: new Date(t.lastUpdated) })));
                }),
                catchError((err: Error) => {
                    this.error.set(err.message || 'Failed to load');
                    this.tiles.set(undefined); // Clear data on error
                    return of(null);
                }),
                finalize(() => { this.loading.set(false); })
            ))
        ).subscribe();
    }, { manualCleanup: true });


    // Derived status signal for the template @switch
    readonly status = computed<TileListStatus>(() => {
        if (this.loading() && !this.tiles()?.length) return 'loading';
        if (this.error()) return 'error';
        if (this.tiles()?.length === 0) return 'empty'; // Handle zero length explicitly
        if (this.tiles() && this.tiles()!.length > 0) return 'success';
        if (this.loading()) return 'loading'; // Still loading during refresh
        return 'loading'; // Fallback
    });

    /** Public method to trigger a refresh */
    refreshTiles(): void {
        console.log("TileListComponent: Refresh triggered.");
        this.refreshTrigger.next();
    }
}