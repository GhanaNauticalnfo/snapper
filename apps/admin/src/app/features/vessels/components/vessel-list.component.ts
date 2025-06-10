// features/vessels/components/vessel-list.component.ts
import { Component, OnInit, OnDestroy, inject, signal, computed, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { VesselDatasetService } from '../services/vessel-dataset.service';
import { VesselDataset } from '../models/vessel-dataset.model';
import { AisShipLayerService, LayerManagerService } from '@snapper/map';
import { TimeAgoPipe, VesselIdPipe } from '@snapper/shared';

// Tab components
import { VesselTabInfoComponent } from './vessel-tab-info.component';
import { VesselTabDeviceComponent } from './vessel-tab-device.component';
import { VesselTabTrackingComponent } from './vessel-tab-tracking.component';
import { VesselTabDangerZoneComponent } from './vessel-tab-danger-zone.component';
import { VesselTabTelemetryDownloadComponent } from './vessel-tab-telemetry-download.component';

// PrimeNG imports
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ToastModule } from 'primeng/toast';
import { DialogModule } from 'primeng/dialog';
import { MessageService } from 'primeng/api';
import { SkeletonModule } from 'primeng/skeleton';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { TabsModule } from 'primeng/tabs';

@Component({
  selector: 'app-vessel-list',
  standalone: true,
  host: { class: 'vessel-list-host' },
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    TableModule,
    ButtonModule,
    ProgressSpinnerModule,
    ToastModule,
    DialogModule,
    SkeletonModule,
    IconFieldModule,
    InputIconModule,
    TabsModule,
    TimeAgoPipe,
    VesselIdPipe,
    VesselTabInfoComponent,
    VesselTabDeviceComponent,
    VesselTabTrackingComponent,
    VesselTabDangerZoneComponent,
    VesselTabTelemetryDownloadComponent
  ],
  providers: [MessageService, AisShipLayerService],
  template: `
    <p-toast></p-toast>

    <!-- Vessel List View -->
    @if (!vesselDialogVisible) {
      <div class="vessel-list-container">
        <div class="flex justify-content-between align-items-center mb-3">
          <h4>Vessels</h4>
        <div class="flex gap-2 align-items-center">
          <p-iconField iconPosition="left">
            <p-inputIcon>
              <i class="pi pi-search"></i>
            </p-inputIcon>
            <input 
              type="text" 
              pInputText 
              placeholder="Search by vessel name..." 
              [ngModel]="searchTerm()"
              (ngModelChange)="onSearchChange($event)"
              class="search-input"
            />
          </p-iconField>
          <p-button 
            label="Add New Vessel" 
            icon="pi pi-plus" 
            styleClass="p-button-success" 
            (onClick)="openNewDialog()">
          </p-button>
        </div>
      </div>

      @if (loading() && datasets().length === 0) {
        <div class="loading-container">
          <p-progressSpinner></p-progressSpinner>
        </div>
      }

      <p-table
        [value]="filteredDatasets()"
        [tableStyle]="{ 'min-width': '50rem' }"
        [paginator]="filteredDatasets().length > 10"
        [rows]="10"
        styleClass="p-datatable-sm p-datatable-striped"
        [rowHover]="true"
        [loading]="loading()"
      >
        <ng-template pTemplate="header">
          <tr>
            <th pSortableColumn="id" style="width: 10%">ID <p-sortIcon field="id"></p-sortIcon></th>
            <th pSortableColumn="name" style="width: 30%">Name <p-sortIcon field="name"></p-sortIcon></th>
            <th pSortableColumn="type" style="width: 15%">Type <p-sortIcon field="type"></p-sortIcon></th>
            <th pSortableColumn="last_seen" style="width: 30%">Last Seen <p-sortIcon field="last_seen"></p-sortIcon></th>
          </tr>
        </ng-template>

        <ng-template pTemplate="body" let-vessel>
          <tr class="clickable-row" (click)="openViewDialog(vessel)">
            <td><span class="font-mono">{{ vessel.id | vesselId }}</span></td>
            <td>{{ vessel.name }}</td>
            <td>
              <span [class]="'type-badge ' + getVesselTypeClass(vessel.type)">
                {{ vessel.type }}
              </span>
            </td>
            <td>
              @if (vessel.last_seen) {
                {{ vessel.last_seen | date:'dd/MM/yyyy HH:mm:ss' }}
                <span class="text-muted"> ({{ vessel.last_seen | timeAgo }})</span>
              } @else {
                <span class="text-muted">Never</span>
              }
            </td>
          </tr>
        </ng-template>

        <ng-template pTemplate="emptymessage">
          <tr>
            <td colspan="5" class="text-center p-4">
              @if (!loading() && !error() && searchTerm()) {
                No vessels found matching "{{ searchTerm() }}".
              } @else if (!loading() && !error()) {
                No vessels found.
              } @else if (error()) {
                <div class="p-error">{{ error() }}</div>
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
      </div>
    }

    <!-- Vessel Details View -->
    @if (vesselDialogVisible && selectedVessel()) {
      <div class="vessel-details-container">
        <!-- Header with Back Button -->
        <div class="vessel-details-header">
          <div class="mb-3">
            <p-button 
              label="Back to Vessels" 
              icon="pi pi-arrow-left" 
              styleClass="p-button-secondary" 
              (onClick)="closeVesselDialog()">
            </p-button>
          </div>
          <h4 class="mb-3">
            {{ selectedVessel()?.name }} 
            <span [class]="'type-badge ' + getVesselTypeClass(selectedVessel()?.type || '')">
              {{ selectedVessel()?.type }}
            </span>
          </h4>
        </div>
      @if (selectedVessel()) {
        <p-tabs [value]="activeTabIndex.toString()" (onChange)="onTabChange($event)" styleClass="vessel-tabs">
          <p-tablist>
            <p-tab value="0">
              <i class="pi pi-info-circle"></i>
              <span class="ml-2">Info</span>
            </p-tab>
            <p-tab value="1">
              <i class="pi pi-mobile"></i>
              <span class="ml-2">Device</span>
            </p-tab>
            <p-tab value="2">
              <i class="pi pi-map-marker"></i>
              <span class="ml-2">Track</span>
            </p-tab>
            <p-tab value="3">
              <i class="pi pi-chart-line"></i>
              <span class="ml-2">Telemetry</span>
            </p-tab>
            <p-tab value="4">
              <i class="pi pi-exclamation-triangle"></i>
              <span class="ml-2">Danger Zone</span>
            </p-tab>
          </p-tablist>
          <p-tabpanels>
            <p-tabpanel value="0">
              <app-vessel-tab-info 
                [vessel]="selectedVessel()" 
                (vesselUpdated)="onVesselUpdated($event)">
              </app-vessel-tab-info>
            </p-tabpanel>
            
            <p-tabpanel value="1">
              <app-vessel-tab-device 
                [vessel]="selectedVessel()" 
                (deviceUpdated)="onDeviceUpdated()">
              </app-vessel-tab-device>
            </p-tabpanel>
            
            <p-tabpanel value="2">
              <app-vessel-tab-tracking 
                [vessel]="selectedVessel()"
                [allVessels]="datasets()">
              </app-vessel-tab-tracking>
            </p-tabpanel>
            
            <p-tabpanel value="3">
              <app-vessel-tab-telemetry-download 
                [vessel]="selectedVessel()"
                [allVessels]="datasets()">
              </app-vessel-tab-telemetry-download>
            </p-tabpanel>
            
            <p-tabpanel value="4">
              <app-vessel-tab-danger-zone 
                [vessel]="selectedVessel()" 
                (vesselDeleted)="onVesselDeleted($event)">
              </app-vessel-tab-danger-zone>
            </p-tabpanel>
          </p-tabpanels>
        </p-tabs>
      }
      </div>
    }

    <!-- Create Dialog (for new vessels only) -->
    <p-dialog
      [(visible)]="formDialogVisible"
      [style]="{width: '70vw', 'max-width': '800px'}"
      [modal]="true"
      [draggable]="false"
      [resizable]="false"
      [closeOnEscape]="true"
      [closable]="true"
      header="Create New Vessel"
      (onHide)="closeFormDialog()"
      (onShow)="onCreateDialogShow()"
    >
      <app-vessel-tab-info 
        #vesselInfoComponent
        [vessel]="null"
        (vesselCreated)="onVesselCreated($event)"
        (createCancelled)="closeFormDialog()">
      </app-vessel-tab-info>
    </p-dialog>
  `,
  styles: [`
    :host { display: block; }
    .vessel-list-container { margin-top: 0; }
    .vessel-details-container { 
      margin-top: 0; 
      height: 100vh; 
      display: flex; 
      flex-direction: column; 
      overflow-x: hidden;
      overflow-y: auto;
      position: relative;
    }
    .vessel-details-header { margin-top: 0; }
    .font-mono { 
      font-family: 'Courier New', monospace; 
      background-color: var(--surface-100); 
      padding: 0.25rem 0.5rem; 
      border-radius: 3px; 
      font-size: 0.875rem;
      font-weight: 400;
      color: var(--text-color);
      border: 1px solid var(--surface-300);
    }
    
    p-message { margin-bottom: 1rem; }
    .text-center { text-align: center; }
    
    .loading-container {
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 2rem;
      min-height: 200px;
    }

    .type-badge {
      border-radius: 4px;
      padding: 0.25rem 0.5rem;
      text-transform: uppercase;
      font-weight: 700;
      font-size: 0.75rem;
      letter-spacing: 0.3px;
      display: inline-block;
    }

    .type-canoe {
      background-color: var(--blue-100, #BBDEFB);
      color: var(--blue-700, #1565C0);
    }

    .type-cargo {
      background-color: var(--indigo-100, #C5CAE9);
      color: var(--indigo-700, #303F9F);
    }

    .type-tanker {
      background-color: var(--purple-100, #E1BEE7);
      color: var(--purple-700, #7B1FA2);
    }

    .type-passenger {
      background-color: var(--teal-100, #B2DFDB);
      color: var(--teal-700, #00796B);
    }

    .type-fishing {
      background-color: var(--cyan-100, #B2EBF2);
      color: var(--cyan-700, #0097A7);
    }

    .type-military {
      background-color: var(--gray-200, #E0E0E0);
      color: var(--gray-700, #616161);
    }

    .type-sailing {
      background-color: var(--green-100, #C8E6C9);
      color: var(--green-700, #388E3C);
    }

    .type-pleasure {
      background-color: var(--pink-100, #F8BBD0);
      color: var(--pink-700, #C2185B);
    }

    .type-tug {
      background-color: var(--orange-100, #FFE0B2);
      color: var(--orange-700, #E65100);
    }

    .type-other {
      background-color: var(--yellow-100, #FFF9C4);
      color: var(--yellow-800, #F57F17);
    }

    .type-unspecified {
      background-color: var(--gray-100, #F5F5F5);
      color: var(--gray-600, #757575);
    }

    /* Utility classes */
    .w-full { width: 100%; }
    .mr-2 { margin-right: 0.5rem; }
    .ml-2 { margin-left: 0.5rem; }
    .mt-1 { margin-top: 0.25rem; }
    .block { display: block; }
    .flex { display: flex; }
    .justify-content-between { justify-content: space-between; }
    .align-items-center { align-items: center; }
    .mb-3 { margin-bottom: 1rem; }
    .gap-2 { gap: 0.5rem; }
    
    .search-input {
      width: 300px;
    }

    .text-muted {
      color: var(--text-color-secondary, #6c757d);
      font-size: 0.9em;
      white-space: nowrap;
    }
    
    /* Clickable row styles */
    .clickable-row {
      cursor: pointer !important;
      transition: background-color 0.2s ease;
    }
    
    .clickable-row:hover {
      background-color: var(--surface-100) !important;
    }
    
    /* Tab Styles */
    .vessel-tabs {
      flex: 1;
      display: flex;
      flex-direction: column;
    }
    
    /* Tab content padding */
    .vessel-tabs .view-dialog-content {
      padding: 1.5rem;
      height: 100%;
      overflow: auto;
    }
    
    /* Track tab special handling */
    .vessel-tabs .tracking-dialog-content {
      height: 100%;
      overflow: hidden;
      padding: 0;
    }
  `]
})
export class VesselListComponent implements OnInit, OnDestroy {
  private vesselDatasetService = inject(VesselDatasetService);
  private messageService = inject(MessageService);
  private layerManager = inject(LayerManagerService);

  // ViewChild reference to vessel info component for form reset
  @ViewChild('vesselInfoComponent') vesselInfoComponent?: VesselTabInfoComponent;

  // Data signals
  datasets = signal<VesselDataset[]>([]);
  loading = signal<boolean>(false);
  error = signal<string | null>(null);
  searchTerm = signal<string>('');
  
  // Computed signal for filtered datasets
  filteredDatasets = computed(() => {
    const term = this.searchTerm().toLowerCase().trim();
    const allVessels = this.datasets();
    
    if (!term) {
      return allVessels;
    }
    
    return allVessels.filter(vessel => 
      vessel.name?.toLowerCase().includes(term)
    );
  });

  // Dialog control properties
  vesselDialogVisible = false;
  formDialogVisible = false;
  activeTabIndex = 0; // 0 for info, 1 for device, 2 for track, 3 for download, 4 for danger zone

  // Other signals
  selectedVessel = signal<VesselDataset | null>(null);

  constructor() {}

  ngOnInit(): void {
    // Register the AIS ships layer
    this.layerManager.registerLayer('ais-ships', AisShipLayerService);
    this.loadVessels();
  }

  onSearchChange(value: string): void {
    this.searchTerm.set(value);
  }

  onVesselUpdated(updatedVessel: VesselDataset): void {
    // Update the vessel in the datasets list
    const vessels = this.datasets();
    const index = vessels.findIndex(v => v.id === updatedVessel.id);
    if (index !== -1) {
      vessels[index] = updatedVessel;
      this.datasets.set([...vessels]);
    }
    
    // Update selected vessel if it's the same one
    if (this.selectedVessel()?.id === updatedVessel.id) {
      this.selectedVessel.set(updatedVessel);
    }
  }

  onDeviceUpdated(): void {
    // Refresh the vessel data to ensure device info is current
    if (this.selectedVessel()) {
      this.loadVessels();
    }
  }

  onTabChange(event: any): void {
    // The new p-tabs component passes the tab value in event.value
    this.activeTabIndex = parseInt(event.value || event, 10);
  }

  loadVessels(): void {
    this.loading.set(true);
    this.error.set(null);
    this.datasets.set([]);

    this.vesselDatasetService.getAll().subscribe({
      next: (data) => {
        this.datasets.set(data);
        console.log('Vessels loaded:', data.length);
      },
      error: (err) => {
        this.error.set('Failed to load vessels. Please try again later.');
        console.error('Error loading vessels:', err);
        this.messageService.add({
          severity: 'error',
          summary: 'Load Error',
          detail: 'Failed to load vessels',
          life: 3000
        });
      },
      complete: () => {
        this.loading.set(false);
      }
    });
  }

  // --- Vessel Dialog Methods ---
  openViewDialog(vessel: VesselDataset): void {
    // Initially set the vessel from list data
    this.selectedVessel.set(vessel);
    
    this.activeTabIndex = 0; // Open on vessel info tab
    this.vesselDialogVisible = true;
    
    // Fetch complete vessel data with tracking points for accurate coordinates
    this.vesselDatasetService.getOne(vessel.id).subscribe({
      next: (completeVessel) => {
        this.selectedVessel.set(completeVessel);
      },
      error: (error) => {
        console.error('Error loading complete vessel data:', error);
        // Continue with list data if fetch fails
      }
    });
  }

  closeVesselDialog(): void {
    this.vesselDialogVisible = false;
    this.selectedVessel.set(null);
    // The lib-map component handles its own cleanup automatically
  }

  // --- Form Dialog Methods ---
  openNewDialog(): void {
    this.selectedVessel.set(null);
    this.formDialogVisible = true;
  }

  closeFormDialog(): void {
    this.formDialogVisible = false;
  }

  /**
   * Handler for when create dialog is shown
   * Ensures the form is properly reset for new vessel creation
   */
  onCreateDialogShow(): void {
    // Use setTimeout to ensure the ViewChild is available after the dialog renders
    setTimeout(() => {
      if (this.vesselInfoComponent) {
        this.vesselInfoComponent.resetToCreateMode();
      }
    }, 0);
  }

  // --- Event Handlers from Tab Components ---
  onVesselCreated(newVessel: VesselDataset): void {
    console.log('Vessel created:', newVessel);
    this.datasets.update(currentDatasets =>
      [...currentDatasets, newVessel]
    );
    this.closeFormDialog();
  }

  onVesselDeleted(id: number): void {
    this.datasets.update(currentDatasets =>
      currentDatasets.filter(vessel => vessel.id !== id)
    );
    console.log('Vessel deleted:', id);
    
    // Close the view dialog if we're currently viewing the deleted vessel
    if (this.selectedVessel()?.id === id) {
      this.selectedVessel.set(null);
      this.closeVesselDialog();
    }
  }

  // Get CSS class for vessel type badge
  getVesselTypeClass(type: string): string {
    switch (type?.toLowerCase()) {
      case 'canoe':
        return 'type-canoe';
      case 'cargo':
        return 'type-cargo';
      case 'tanker':
        return 'type-tanker';
      case 'passenger':
        return 'type-passenger';
      case 'fishing':
        return 'type-fishing';
      case 'military':
        return 'type-military';
      case 'sailing':
        return 'type-sailing';
      case 'pleasure':
        return 'type-pleasure';
      case 'tug':
        return 'type-tug';
      case 'other':
        return 'type-other';
      case 'unspecified':
      default:
        return 'type-unspecified';
    }
  }

  // Cleanup on component destroy
  ngOnDestroy(): void {
    // The lib-map component handles its own cleanup automatically
  }
}