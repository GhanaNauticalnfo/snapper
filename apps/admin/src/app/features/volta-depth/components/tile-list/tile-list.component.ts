import { Component, ChangeDetectionStrategy, computed, effect, inject, signal, DestroyRef } from '@angular/core';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, switchMap, tap, catchError, of, startWith, finalize } from 'rxjs';

// PrimeNG Imports
import { TableModule } from 'primeng/table';
import { SortEvent } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { TagModule } from 'primeng/tag';
import { SkeletonModule } from 'primeng/skeleton';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';

// Models/Service
import { TileInfo } from '../../models/tile-info.model';
import { VoltaDepthService } from '../../volta-depth.service';

@Component({
    selector: 'app-tile-list',
    standalone: true,
    imports: [
        CommonModule, RouterModule, DatePipe, DecimalPipe,
        TableModule, ButtonModule, MessageModule, TagModule, SkeletonModule,
        ConfirmDialogModule, ToastModule
    ],
    providers: [ConfirmationService, MessageService],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <div class="tile-list-container">
        <div class="flex items-center mb-3">
        </div>

        <p-toast key="tileListToast"></p-toast>
        <p-confirmDialog 
            header="Confirm Deletion" 
            icon="pi pi-exclamation-triangle" 
            acceptButtonStyleClass="p-button-danger" 
            acceptIcon="pi pi-trash"
            rejectButtonStyleClass="p-button-secondary">
        </p-confirmDialog>

        @if (error(); as errorMsg) {
          <p-message severity="error" [text]="errorMsg" styleClass="mb-3"></p-message>
        }

        <!-- Show block skeleton only on initial load -->
        @if (showInitialSkeleton()) {
            <p-skeleton height="150px" styleClass="mb-2"></p-skeleton>
        } @else {
            <!-- Render table once initial load attempt is done -->
            <p-table
              #tileTable
              [value]="$tableData() ?? []"
              [loading]="loading()"
              styleClass="p-datatable-sm p-datatable-striped"
              [tableStyle]="{'min-width': '50rem'}"
              dataKey="id"
              (onSort)="onPrimeNgSort($event)"
            >
              <ng-template pTemplate="header">
                <tr>
                  <th pSortableColumn="id" style="width: 10%">ID <p-sortIcon field="id"></p-sortIcon></th>
                  <th pSortableColumn="version" style="width: 10%">Ver <p-sortIcon field="version"></p-sortIcon></th>
                  <th pSortableColumn="numberOfFeatures" style="width: 15%">#Features <p-sortIcon field="numberOfFeatures"></p-sortIcon></th>
                  <th pSortableColumn="lastUpdated" style="width: 35%">Updated <p-sortIcon field="lastUpdated"></p-sortIcon></th>
                  <th style="width: 30%">Actions</th>
                </tr>
              </ng-template>
              <ng-template pTemplate="body" let-tile>
                  <tr>
                      <td><span class="font-mono">{{ tile.id }}</span></td>
                      <td><p-tag [value]="tile.version" severity="info"></p-tag></td>
                      <td>{{ tile.numberOfFeatures | number }}</td>
                      <td>{{ tile.lastUpdated | date:'yyyy-MM-dd HH:mm:ss' }}</td>
                      <td class="actions-cell">
                          <p-button 
                              label="Details" 
                              icon="pi pi-search" 
                              styleClass="p-button-text p-button-sm"
                              [routerLink]="['/volta-depth', tile.id]">
                          </p-button>
                          <p-button 
                              label="Delete" 
                              icon="pi pi-trash" 
                              styleClass="p-button-text p-button-sm p-button-danger"
                              [loading]="(deletingTileId() === tile.id)"
                              [disabled]="isDeleting()"
                              (onClick)="confirmDeleteTile(tile)">
                          </p-button>
                      </td>
                  </tr>
              </ng-template>
              <ng-template pTemplate="emptymessage">
                <tr>
                  <td colspan="5" class="text-center p-4">
                    @if (!loading() && !error()) {
                      No tiles found.
                    } @else {
                      <span></span>
                    }
                  </td>
                </tr>
              </ng-template>
              <ng-template pTemplate="loadingbody">
                  @for (item of [1, 2, 3]; track $index) {
                      <tr>
                          <td><p-skeleton></p-skeleton></td>
                          <td><p-skeleton></p-skeleton></td>
                          <td><p-skeleton></p-skeleton></td>
                          <td><p-skeleton></p-skeleton></td>
                          <td><p-skeleton></p-skeleton></td>
                      </tr>
                  }
              </ng-template>
            </p-table>
        }
    </div>
  `,
    styles: [`
    :host { display: block; }
    .tile-list-container { margin-top: 1rem; }
    .font-mono { font-family: monospace; background-color: var(--surface-100); padding: 0.1rem 0.3rem; border-radius: 3px; }
    p-message { margin-bottom: 1rem; }
    .text-center { text-align: center; }
    .actions-cell { display: flex; gap: 0.5rem; }
  `],
  host: {
    'class': 'tile-list-host'
  }
})
export class TileListComponent {
    private voltaDepthService = inject(VoltaDepthService);
    private destroyRef = inject(DestroyRef);
    private confirmationService = inject(ConfirmationService);
    private messageService = inject(MessageService);

    // --- State Signals ---
    readonly loading = signal<boolean>(true);
    readonly error = signal<string | null>(null);
    readonly $tableData = signal<TileInfo[] | null>(null);
    readonly #initialLoadCompleted = signal<boolean>(false);
    readonly deletingTileId = signal<string | null>(null);

    private readonly refreshTrigger = new Subject<void>();

    /** Computed signal to determine if the initial skeleton block should show */
    readonly showInitialSkeleton = computed(() => {
        return this.loading() && !this.#initialLoadCompleted();
    });

    /** Computed signal to check if any deletion is in progress */
    readonly isDeleting = computed(() => {
        return this.deletingTileId() !== null;
    });

    constructor() {
        console.log('TileListComponent Initializing...');

        // --- Effect to Fetch Data ---
        effect(() => {
            this.refreshTrigger.pipe(
                startWith(undefined),
                takeUntilDestroyed(this.destroyRef),
                tap(() => {
                    console.log('>>> Starting data fetch...');
                    this.loading.set(true);
                    this.error.set(null);
                }),
                switchMap(() => {
                    console.log('>>> Calling voltaDepthService.listTiles()');
                    return this.voltaDepthService.listTiles().pipe(
                        tap((data) => {
                            console.log('>>> Fetch SUCCESS. Raw data:', data);
                            const processedData = this.processTileData(data);
                            console.log('>>> Processed data:', processedData);
                            this.$tableData.set(processedData);
                        }),
                        catchError((err: Error) => {
                            console.error('>>> Fetch ERROR:', err);
                            this.error.set(err.message || 'Failed to load tiles');
                            this.$tableData.set([]);
                            return of(null);
                        }),
                        finalize(() => {
                            console.log('>>> Fetch FINALIZED. Setting loading=false, initialLoadCompleted=true');
                            this.loading.set(false);
                            this.#initialLoadCompleted.set(true);
                        })
                    );
                })
            ).subscribe({
                 next: () => { /* Handled in tap */ },
                 error: (err) => console.error('>>> Outer stream error (should not happen due to catchError):', err),
                 complete: () => console.log('>>> Outer stream completed (likely on destroy)')
            });
        });
    }

    /** Processes raw data into TileInfo[] with Date objects */
    private processTileData(data: unknown): TileInfo[] {
        if (!Array.isArray(data)) {
            console.warn('processTileData received non-array or null:', data);
            return [];
        }
        
        return data.map((t: any) => ({
            id: t?.id ?? '',
            version: t?.version ?? '',
            numberOfFeatures: typeof t?.numberOfFeatures === 'string'
                ? parseInt(t.numberOfFeatures, 10)
                : (typeof t?.numberOfFeatures === 'number' ? t.numberOfFeatures : 0),
            created: t?.created ? new Date(t.created) : null,
            lastUpdated: t?.lastUpdated ? new Date(t.lastUpdated) : null,
        }) as TileInfo);
    }

    /** Handles the PrimeNG sort event when customSort=false. */
    onPrimeNgSort(event: SortEvent): void {
        console.log('>>> PrimeNG Default Sort Event. event.data:', event.data);
        if (event.data) {
            this.$tableData.set([...event.data]);
            console.log('>>> $tableData updated after sort.');
        } else {
             console.warn('>>> PrimeNG Sort Event received no data!');
        }
    }

    /** Public method to trigger a refresh from outside */
    refreshTiles(): void {
        console.log(">>> TileListComponent: Refresh triggered externally.");
        this.refreshTrigger.next();
    }

    /** Shows confirmation dialog before deleting a tile */
    confirmDeleteTile(tile: TileInfo): void {
        console.log(`Confirming deletion of tile: ${tile.id}`);
        
        this.confirmationService.confirm({
            message: `Are you sure you want to delete tile <strong>${tile.id}</strong>? <br><br>
                     This will permanently remove the tile and all its <strong>${tile.numberOfFeatures}</strong> features. 
                     <br>This action cannot be undone.`,
            accept: () => {
                this.deleteTile(tile.id);
            }
        });
    }

    /** Performs the actual tile deletion after confirmation */
    private deleteTile(tileId: string): void {
        console.log(`Deleting tile: ${tileId}`);
        this.deletingTileId.set(tileId);

        this.voltaDepthService.deleteTile(tileId)
            .pipe(
                takeUntilDestroyed(this.destroyRef),
                finalize(() => this.deletingTileId.set(null))
            )
            .subscribe({
                next: (response) => {
                    console.log('Delete successful:', response);
                    this.messageService.add({
                        key: 'tileListToast',
                        severity: 'success',
                        summary: 'Tile Deleted',
                        detail: `Tile ${tileId} has been successfully deleted.`
                    });
                    // Refresh the tile list
                    this.refreshTiles();
                },
                error: (err: Error) => {
                    console.error('Delete error:', err);
                    this.messageService.add({
                        key: 'tileListToast',
                        severity: 'error',
                        summary: 'Delete Failed',
                        detail: err.message || 'Failed to delete tile',
                        life: 5000
                    });
                }
            });
    }
}