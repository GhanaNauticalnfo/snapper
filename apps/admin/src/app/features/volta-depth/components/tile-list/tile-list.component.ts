// src/app/features/volta-depth/components/tile-list/tile-list.component.ts

import { Component, ChangeDetectionStrategy, computed, effect, inject, signal, DestroyRef } from '@angular/core';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common'; // Keep imports
import { RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, switchMap, tap, catchError, of, startWith, finalize } from 'rxjs';

// PrimeNG Imports
import { TableModule } from 'primeng/table';
import { SortEvent } from 'primeng/api'; // Removed unused SortMeta
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { TagModule } from 'primeng/tag';
import { SkeletonModule } from 'primeng/skeleton';

// Models/Service
import { TileInfo } from '../../models/tile-info.model';
import { VoltaDepthService } from '../../volta-depth.service';

@Component({
    selector: 'app-tile-list',
    standalone: true,
    imports: [
        CommonModule, RouterModule, DatePipe, DecimalPipe, // Pipes are used
        TableModule, ButtonModule, MessageModule, TagModule, SkeletonModule
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <div class="tile-list-container">
        <div class="flex justify-content-between align-items-center mb-3">
            <h4>Existing Tiles</h4>
            <p-button
                icon="pi pi-refresh"
                [label]="loading() ? 'Loading...' : 'Refresh'"
                (onClick)="triggerRefresh()"
                [disabled]="loading()"
                styleClass="p-button-sm p-button-outlined"
            ></p-button>
        </div>

        <!-- Error Message -->
        @if (error(); as errorMsg) {
          <p-message severity="error" [text]="errorMsg" styleClass="mb-3"></p-message>
        }

        <!-- Table -->
        <p-table
          #tileTable
          [value]="displayedTiles() ?? []"
          [loading]="loading() && displayedTiles() === null"
          styleClass="p-datatable-sm p-datatable-striped"
          [tableStyle]="{'min-width': '50rem'}"
          dataKey="id"
          [customSort]="true"
          (onSort)="onSort($event)"
          [sortField]="$sortState().field"
          [sortOrder]="$sortState().order"
        > <!-- <<< FIX: Ensured opening tag is closed -->
          <ng-template pTemplate="header">
            <tr>
              <th pSortableColumn="id" style="width: 10%">ID <p-sortIcon field="id"></p-sortIcon></th>
              <th pSortableColumn="version" style="width: 10%">Ver <p-sortIcon field="version"></p-sortIcon></th>
              <th pSortableColumn="numberOfFeatures" style="width: 15%">#Features <p-sortIcon field="numberOfFeatures"></p-sortIcon></th>
              <th pSortableColumn="lastUpdated" style="width: 35%">Updated <p-sortIcon field="lastUpdated"></p-sortIcon></th>
              <th style="width: 20%">Actions</th>
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-tile>
              <tr>
                  <td><span class="font-mono">{{ tile.id }}</span></td>
                  <td><p-tag [value]="tile.version" severity="info"></p-tag></td>
                  <td>{{ tile.numberOfFeatures | number }}</td> <!-- DecimalPipe usage -->
                  <td>{{ tile.lastUpdated | date:'yyyy-MM-dd HH:mm:ss' }}</td> <!-- DatePipe usage -->
                  <td><p-button label="Details" icon="pi pi-search" styleClass="p-button-text p-button-sm" [routerLink]="['/volta-depth', tile.id]"></p-button></td>
              </tr>
          </ng-template>
          <ng-template pTemplate="emptymessage">
            <tr>
              <td colspan="5" class="text-center p-4">
                @if (!loading() && !error()) {
                  No tiles found.
                } @else if (loading()) {
                  <span>Loading data...</span>
                }
              </td>
            </tr>
          </ng-template>
          <ng-template pTemplate="loadingbody" let-columns>
              <!-- Corrected @for syntax -->
              @for (item of [1, 2, 3]; track $index) {
                  <tr>
                      <td><p-skeleton></p-skeleton></td>
                      <td><p-skeleton></p-skeleton></td>
                      <td><p-skeleton></p-skeleton></td>
                      <td><p-skeleton></p-skeleton></td>
                      <td><p-skeleton></p-skeleton></td>
                  </tr>
              } <!-- Ensure @for has closing brace if inside another block, though it's standalone here -->
          </ng-template>
        </p-table> <!-- <<< FIX: Ensure closing tag exists and matches -->
    </div>
  `,
    // Styles remain the same
    styles: [`
    :host { display: block; }
    .tile-list-container { margin-top: 1rem; }
    .font-mono { font-family: monospace; background-color: var(--surface-100); padding: 0.1rem 0.3rem; border-radius: 3px; }
    :host ::ng-deep .p-datatable-sm .p-datatable-tbody > tr > td { padding: 0.6rem 0.8rem; vertical-align: middle; }
    :host ::ng-deep .p-datatable .p-datatable-thead > tr > th {
      text-align: left;
      background-color: var(--surface-100) !important;
      font-size: 0.85rem;
      padding: 0.6rem 0.8rem;
      white-space: nowrap;
      cursor: pointer;
    }
    :host ::ng-deep .p-datatable .p-sortable-column:not(.p-highlight):hover {
      background-color: var(--surface-200) !important;
      color: var(--text-color);
    }
    :host ::ng-deep .p-datatable .p-sortable-column.p-highlight {
      background-color: var(--surface-100) !important;
      color: var(--text-color);
    }
    :host ::ng-deep .p-tag { font-size: 0.8rem; }
    :host ::ng-deep .p-sortable-column .p-sortable-column-icon { margin-left: 0.5em; vertical-align: middle; }
    p-message { margin-bottom: 1rem; }
    .text-center { text-align: center; }
  `]
})
export class TileListComponent {
    private voltaDepthService = inject(VoltaDepthService);
    private destroyRef = inject(DestroyRef);

    // --- State Signals ---
    readonly loading = signal<boolean>(false);
    readonly error = signal<string | null>(null);
    readonly #tiles = signal<TileInfo[] | null>(null);
    readonly $sortState = signal<{ field: keyof TileInfo | null, order: number }>({ field: null, order: 1 });

    /** Trigger for initiating data fetch */
    private readonly refreshTrigger = new Subject<void>();

    // --- Computed Signal for Display ---
    readonly displayedTiles = computed(() => {
        const data = this.#tiles();
        const { field, order } = this.$sortState();

        if (!data) return null;
        if (!field) return data;

        return [...data].sort((a, b) => {
            const valueA = this.resolveFieldData(a, field);
            const valueB = this.resolveFieldData(b, field);
            let result = 0;

            // --- FIX: Type checks for comparing 'unknown' values ---
            if (valueA == null && valueB != null) result = -1;
            else if (valueA != null && valueB == null) result = 1;
            else if (valueA == null && valueB == null) result = 0;
            // Specific type comparisons
            else if (valueA instanceof Date && valueB instanceof Date) {
                result = valueA.getTime() - valueB.getTime();
            } else if (typeof valueA === 'string' && typeof valueB === 'string') {
                result = valueA.localeCompare(valueB);
            } else if (typeof valueA === 'number' && typeof valueB === 'number') {
                result = valueA - valueB;
            }
            // Add more specific type checks if needed (e.g., boolean)
            // Fallback comparison (less reliable for mixed types)
            else if (valueA !== null && valueB !== null && valueA !== undefined && valueB !== undefined) {
                 // Basic comparison if types are unknown but comparable (use with caution)
                 result = (valueA < valueB) ? -1 : (valueA > valueB) ? 1 : 0;
            }
            // --- End of Type Checks ---

            return result * order;
        });
    });

    constructor() {
        // --- Effect to Fetch Data ---
        effect(() => {
            this.refreshTrigger.pipe(
                startWith(undefined),
                takeUntilDestroyed(this.destroyRef),
                tap(() => {
                    this.loading.set(true);
                    this.error.set(null);
                }),
                switchMap(() => this.voltaDepthService.listTiles().pipe(
                    tap((data) => {
                        const processedData = data.map(t => ({
                            ...t,
                            created: t.created ? new Date(t.created) : null,
                            lastUpdated: t.lastUpdated ? new Date(t.lastUpdated) : null,
                            numberOfFeatures: typeof t.numberOfFeatures === 'string' ? parseInt(t.numberOfFeatures, 10) : t.numberOfFeatures ?? 0 // Ensure number, default 0 if null/undefined
                        }) as TileInfo);
                        this.#tiles.set(processedData);
                    }),
                    catchError((err: Error) => {
                        console.error("Error fetching tiles:", err);
                        this.error.set(err.message || 'Failed to load tiles');
                        this.#tiles.set([]);
                        return of(null);
                    }),
                    finalize(() => {
                        this.loading.set(false);
                    })
                ))
            ).subscribe();
        });
    }

    /** Handles the PrimeNG sort event */
    onSort(event: SortEvent): void {
        console.log('Sort Event:', event);
        if (event.field) {
            this.$sortState.set({
                field: event.field as keyof TileInfo,
                order: event.order ?? 1
            });
        }
    }

    /** Internal method to trigger refresh from the button */
    triggerRefresh(): void {
        console.log("TileListComponent: Refresh button clicked.");
        this.refreshTrigger.next();
    }

    /** Public method to trigger a refresh from outside */
    refreshTiles(): void {
        console.log("TileListComponent: Refresh triggered externally.");
        this.refreshTrigger.next();
    }


    /** Helper to safely access field data */
    private resolveFieldData(data: TileInfo, field: keyof TileInfo): unknown {
        // Add specific handling if a field might be missing or needs transformation
        return data[field];
    }
}