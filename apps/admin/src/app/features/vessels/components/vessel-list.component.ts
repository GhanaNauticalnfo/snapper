import { Component, OnInit, AfterViewInit, TemplateRef, signal, viewChild, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TagModule } from 'primeng/tag';
import { MessageService } from 'primeng/api';
import { ResourceListComponent, ResourceListConfig, ResourceAction, TimeAgoPipe, VesselIdPipe } from '@ghanawaters/shared';
import { VesselService } from '../services/vessel.service';
import { VesselResponseDto, CreateVesselDto, UpdateVesselDto } from '../models/vessel.dto';
import { VesselFormComponent, VesselFormData } from './vessel-form.component';
import { DialogModule } from 'primeng/dialog';
import Keycloak from 'keycloak-js';
import { VesselDatasetService } from '../services/vessel-dataset.service';
import { VesselDataset } from '../models/vessel-dataset.model';

@Component({
  selector: 'app-vessel-list',
  standalone: true,
  imports: [
    CommonModule,
    TagModule,
    ResourceListComponent,
    VesselFormComponent,
    DialogModule,
    TimeAgoPipe,
    VesselIdPipe
  ],
  providers: [MessageService],
  host: {
    'class': 'vessel-list-host'
  },
  template: `
    <lib-resource-list
      [config]="listConfig"
      [data]="vessels()"
      [loading]="loading()"
      [dialogMode]="dialogMode()"
      [selectedItem]="selectedVessel()"
      [showDialog]="showDialog"
      (showDialogChange)="showDialog = $event"
      (action)="handleAction($event)"
      (dialogShown)="onDialogShow()">
      
      @if (showDialog) {
        <app-vessel-form
          formContent
          #vesselForm
          [vessel]="selectedVesselDataset()"
          [mode]="dialogMode()"
          (save)="saveVessel($event)"
          (cancel)="showDialog = false"
          (deviceUpdated)="onDeviceUpdated()">
        </app-vessel-form>
      }
    </lib-resource-list>
    
    <!-- Column Templates -->
    <ng-template #idTemplate let-item>
      <span class="font-mono text-sm">{{ item.id | vesselId }}</span>
    </ng-template>
    
    <ng-template #typeTemplate let-item>
      <span [class]="'type-badge text-xs font-bold uppercase tracking-tight ' + getVesselTypeClass(item.vessel_type?.name)">
        {{ item.vessel_type?.name || 'Unspecified' }}
      </span>
    </ng-template>
    
    <ng-template #lastSeenTemplate let-item>
      @if (item.latest_position_timestamp) {
        {{ item.latest_position_timestamp | date:'dd/MM/yyyy HH:mm:ss' }}
        <span class="text-muted text-sm"> ({{ item.latest_position_timestamp | timeAgo }})</span>
      } @else {
        <span class="text-muted text-sm">Never</span>
      }
    </ng-template>
  `,
  styles: [`
    :host { display: block; }
    
    .font-mono { 
      font-family: 'Courier New', monospace; 
      background-color: var(--surface-100); 
      padding: 0.25rem 0.5rem; 
      border-radius: 3px; 
      color: var(--text-color);
      border: 1px solid var(--surface-300);
    }
    
    .text-muted {
      color: var(--text-color-secondary, #6c757d);
      white-space: nowrap;
    }

    .type-badge {
      border-radius: 4px;
      padding: 0.25rem 0.5rem;
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
  `]
})
export class VesselListComponent implements OnInit, AfterViewInit {
  // Services
  private vesselService = inject(VesselService);
  private vesselDatasetService = inject(VesselDatasetService);
  private messageService = inject(MessageService);
  private keycloak = inject(Keycloak);

  // View children
  vesselFormComponent = viewChild<VesselFormComponent>('vesselForm');
  idTemplate = viewChild.required<TemplateRef<any>>('idTemplate');
  typeTemplate = viewChild.required<TemplateRef<any>>('typeTemplate');
  lastSeenTemplate = viewChild.required<TemplateRef<any>>('lastSeenTemplate');
  
  // Signals for resource list
  vessels = signal<VesselResponseDto[]>([]);
  selectedVessel = signal<VesselResponseDto | null>(null);
  loading = signal(false);
  showDialog = false;
  dialogMode = signal<'view' | 'edit' | 'create'>('create');
  
  // Signals for vessel dataset
  selectedVesselDataset = signal<VesselDataset | null>(null);
  allVesselDatasets = signal<VesselDataset[]>([]);
  
  listConfig!: ResourceListConfig<VesselResponseDto>;
  
  ngOnInit() {
    // Initialize config without template references
    this.listConfig = {
      title: '', // Remove duplicate title - parent component already has page header
      searchPlaceholder: 'Search by vessel name...',
      newButtonLabel: 'Add New Vessel',
      entityName: 'vessels',
      entityNameSingular: 'vessel',
      columns: [
        { field: 'id', header: 'ID', sortable: true, width: '10%' },
        { field: 'name', header: 'Name', sortable: true, width: '30%' },
        { field: 'vessel_type', header: 'Type', sortable: true, width: '15%' },
        { field: 'latest_position_timestamp', header: 'Last Seen', sortable: true, width: '30%' }
      ],
      searchFields: ['name'],
      actions: {
        view: true,
        edit: this.hasRole('admin'),
        delete: this.hasRole('admin')
      },
      deleteConfirmMessage: (item) => `Are you sure you want to delete the vessel "${item.name}" (ID: ${item.id})?<br><br>This will permanently delete:<br><br><ul style="margin: 0; padding-left: 20px;"><li>The vessel record and all its information</li><li>All associated devices and their authentication tokens</li><li>All tracking data and position history</li></ul><br><strong>⚠️ This action cannot be undone and all data will be lost forever.</strong>`,
      deleteConfirmHeader: 'Delete Vessel - Permanent Action',
      emptyMessage: 'No vessels found',
      pageSize: 10
    };
    
    this.loadVessels();
    this.loadVesselDatasets();
  }
  
  ngAfterViewInit() {
    // Now add the template references
    this.listConfig.columns[0].template = this.idTemplate();
    this.listConfig.columns[2].template = this.typeTemplate();
    this.listConfig.columns[3].template = this.lastSeenTemplate();
  }
  
  loadVessels() {
    this.loading.set(true);
    this.vesselService.getAll().subscribe({
      next: (vessels) => {
        console.log('Vessels loaded:', vessels);
        this.vessels.set(vessels);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error loading vessels:', error);
        this.loading.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load vessels'
        });
      }
    });
  }
  
  loadVesselDatasets() {
    this.vesselDatasetService.getAll().subscribe({
      next: (datasets) => {
        this.allVesselDatasets.set(datasets);
      },
      error: (error) => {
        console.error('Error loading vessel datasets:', error);
      }
    });
  }
  
  handleAction(action: ResourceAction<VesselResponseDto>) {
    switch (action.type) {
      case 'create':
        this.showCreateDialog();
        break;
      case 'view':
        if (action.item) this.viewVessel(action.item);
        break;
      case 'edit':
        if (action.item) this.editVessel(action.item);
        break;
      case 'delete':
        if (action.item) this.deleteVessel(action.item);
        break;
    }
  }
  
  showCreateDialog() {
    this.selectedVessel.set(null);
    this.selectedVesselDataset.set(null);
    this.dialogMode.set('create');
    this.showDialog = true;
  }
  
  viewVessel(vessel: VesselResponseDto) {
    this.selectedVessel.set(vessel);
    this.dialogMode.set('view');
    // Load the full vessel dataset
    this.loadVesselDataset(vessel.id);
    this.showDialog = true;
  }
  
  editVessel(vessel: VesselResponseDto) {
    this.selectedVessel.set(vessel);
    this.dialogMode.set('edit');
    // Load the full vessel dataset
    this.loadVesselDataset(vessel.id);
    this.showDialog = true;
  }
  
  private loadVesselDataset(vesselId: number) {
    const existingDataset = this.allVesselDatasets().find(v => v.id === vesselId);
    if (existingDataset) {
      this.selectedVesselDataset.set(existingDataset);
    } else {
      this.vesselDatasetService.getOne(vesselId).subscribe({
        next: (dataset) => {
          this.selectedVesselDataset.set(dataset);
        },
        error: (error) => {
          console.error('Error loading vessel dataset:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to load vessel details'
          });
        }
      });
    }
  }
  
  saveVessel(formData: VesselFormData) {
    if (this.dialogMode() === 'create') {
      const createDto: CreateVesselDto = {
        name: formData.name,
        vessel_type_id: formData.vessel_type_id
      };
      
      this.vesselService.create(createDto).subscribe({
        next: (newVessel) => {
          this.vessels.update(vessels => [...vessels, newVessel]);
          this.showDialog = false;
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Vessel created successfully'
          });
          this.loadVesselDatasets(); // Refresh datasets for other components
        },
        error: (error) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to create vessel'
          });
        }
      });
    } else if (this.dialogMode() === 'edit' && this.selectedVessel()?.id) {
      const updateDto: UpdateVesselDto = {
        name: formData.name,
        vessel_type_id: formData.vessel_type_id
      };
      
      this.vesselService.update(this.selectedVessel()!.id, updateDto).subscribe({
        next: (updatedVessel) => {
          this.vessels.update(vessels => 
            vessels.map(v => v.id === updatedVessel.id ? updatedVessel : v)
          );
          this.showDialog = false;
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Vessel updated successfully'
          });
          this.loadVesselDatasets(); // Refresh datasets for other components
        },
        error: (error) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to update vessel'
          });
        }
      });
    }
  }
  
  deleteVessel(vessel: VesselResponseDto) {
    // Use vesselDatasetService for deletion to ensure all related data is removed
    this.vesselDatasetService.delete(vessel.id).subscribe({
      next: () => {
        this.vessels.update(vessels => vessels.filter(v => v.id !== vessel.id));
        this.messageService.add({
          severity: 'success',
          summary: 'Vessel Deleted',
          detail: 'Vessel and all associated data have been permanently deleted',
          life: 4000
        });
        this.loadVesselDatasets(); // Refresh datasets for other components
      },
      error: (error) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Delete Error',
          detail: error.error?.message || 'Failed to delete vessel. Please try again.',
          life: 5000
        });
      }
    });
  }
  
  onDialogShow() {
    // Allow Angular to render the form component first
    setTimeout(() => {
      const formComponent = this.vesselFormComponent();
      if (formComponent) {
        // Form handles its own initialization
      }
    }, 100);
  }
  
  onDeviceUpdated(): void {
    // Refresh the vessel data
    this.loadVessels();
    this.loadVesselDatasets();
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
  
  private hasRole(role: string): boolean {
    const roles = this.keycloak.realmAccess?.roles || [];
    return roles.includes(role);
  }
  
  private hasAnyRole(roles: string[]): boolean {
    return roles.some(role => this.hasRole(role));
  }
}