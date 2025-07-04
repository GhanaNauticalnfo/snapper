import { Component, OnInit, AfterViewInit, ChangeDetectionStrategy, TemplateRef, signal, viewChild, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TagModule } from 'primeng/tag';
import { MessageService } from 'primeng/api';
import { toSignal } from '@angular/core/rxjs-interop';
import { ResourceListComponent, ResourceListConfig, ResourceAction } from '@ghanawaters/shared';
import { LandingSiteService } from '../services/landing-site.service';
import { LandingSiteResponseDto, CreateLandingSiteDto, UpdateLandingSiteDto } from '../models/landing-site.dto';
import { LandingSiteFormComponent } from './landing-site-form.component';
import { LandingSite } from '../models/landing-site.model';

@Component({
  selector: 'app-landing-site-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    TagModule,
    ResourceListComponent,
    LandingSiteFormComponent
  ],
  providers: [MessageService],
  template: `
    <lib-resource-list
      [config]="listConfig"
      [data]="landingSites()"
      [loading]="loading()"
      [dialogMode]="dialogMode()"
      [selectedItem]="selectedLandingSite()"
      [showDialog]="showDialog"
      (showDialogChange)="showDialog = $event"
      (action)="handleAction($event)"
      (dialogShown)="onDialogShow()">
      
      @if (showDialog) {
        <app-landing-site-form
          formContent
          #landingSiteForm
          [landingSite]="formLandingSite()"
          [mode]="dialogMode()"
          (save)="saveLandingSite($event)"
          (cancel)="showDialog = false">
        </app-landing-site-form>
      }
    </lib-resource-list>
    
    <!-- Column Templates -->
    <ng-template #locationTemplate let-item>
      {{ item.location.coordinates[1].toFixed(4) }}°N, 
      {{ item.location.coordinates[0].toFixed(4) }}°{{ item.location.coordinates[0] >= 0 ? 'E' : 'W' }}
    </ng-template>
    
    <ng-template #statusTemplate let-item>
      <p-tag 
        [value]="getStatusLabel(item.status)" 
        [severity]="getStatusSeverity(item.status)">
      </p-tag>
    </ng-template>
    
    <ng-template #lastUpdatedTemplate let-item>
      {{ item.updated_at | date:'short' }}
    </ng-template>
  `,
  host: {
    'class': 'landing-site-list-host'
  }
})
export class LandingSiteListComponent implements OnInit, AfterViewInit {
  // Services
  private landingSiteService = inject(LandingSiteService);
  private messageService = inject(MessageService);

  // View children
  landingSiteFormComponent = viewChild<LandingSiteFormComponent>('landingSiteForm');
  locationTemplate = viewChild.required<TemplateRef<any>>('locationTemplate');
  statusTemplate = viewChild.required<TemplateRef<any>>('statusTemplate');
  lastUpdatedTemplate = viewChild.required<TemplateRef<any>>('lastUpdatedTemplate');
  
  // Signals
  landingSites = signal<LandingSiteResponseDto[]>([]);
  selectedLandingSite = signal<LandingSiteResponseDto | null>(null);
  loading = signal(false);
  showDialog = false;
  dialogMode = signal<'view' | 'edit' | 'create'>('create');
  
  listConfig!: ResourceListConfig<LandingSiteResponseDto>;
  
  // Convert between DTO and model for the form
  formLandingSite = signal<LandingSite | null>(null);
  
  ngOnInit() {
    // Initialize config without template references
    this.listConfig = {
      title: '', // Remove duplicate title - parent component already has page header
      searchPlaceholder: 'Search landing sites...',
      newButtonLabel: 'New Landing Site',
      entityName: 'landing sites',
      entityNameSingular: 'landing site',
      columns: [
        { field: 'name', header: 'Name', sortable: true },
        { field: 'description', header: 'Description', sortable: false },
        { field: 'location', header: 'Location', sortable: false },
        { field: 'status', header: 'Status', sortable: true },
        { field: 'updated_at', header: 'Last Updated', sortable: true }
      ],
      searchFields: ['name', 'description'],
      actions: {
        view: true,
        edit: true,
        delete: true
      },
      deleteConfirmMessage: (item) => `Are you sure you want to delete the landing site "${item.name}"?`,
      emptyMessage: 'No landing sites found',
      pageSize: 10
    };
    
    this.loadLandingSites();
  }
  
  ngAfterViewInit() {
    // Now add the template references
    this.listConfig.columns[2].template = this.locationTemplate();
    this.listConfig.columns[3].template = this.statusTemplate();
    this.listConfig.columns[4].template = this.lastUpdatedTemplate();
  }
  
  loadLandingSites() {
    this.loading.set(true);
    this.landingSiteService.getAll().subscribe({
      next: (sites) => {
        console.log('Landing sites loaded:', sites);
        this.landingSites.set(sites);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error loading landing sites:', error);
        this.loading.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load landing sites'
        });
      }
    });
  }
  
  handleAction(action: ResourceAction<LandingSiteResponseDto>) {
    switch (action.type) {
      case 'create':
        this.showCreateDialog();
        break;
      case 'view':
        if (action.item) this.viewLandingSite(action.item);
        break;
      case 'edit':
        if (action.item) this.editLandingSite(action.item);
        break;
      case 'delete':
        if (action.item) this.deleteLandingSite(action.item);
        break;
    }
  }
  
  showCreateDialog() {
    const newSite: LandingSite = {
      name: '',
      description: '',
      location: {
        type: 'Point',
        coordinates: [-0.4, 5.6] // Default to Ghana coast
      },
      enabled: true
    };
    this.formLandingSite.set(newSite);
    this.selectedLandingSite.set(null);
    this.dialogMode.set('create');
    this.showDialog = true;
  }
  
  viewLandingSite(site: LandingSiteResponseDto) {
    this.selectedLandingSite.set(site);
    this.formLandingSite.set(this.dtoToModel(site));
    this.dialogMode.set('view');
    this.showDialog = true;
  }
  
  editLandingSite(site: LandingSiteResponseDto) {
    this.selectedLandingSite.set(site);
    this.formLandingSite.set(this.dtoToModel(site));
    this.dialogMode.set('edit');
    this.showDialog = true;
  }
  
  saveLandingSite(site: LandingSite) {
    if (this.dialogMode() === 'create') {
      const createDto: CreateLandingSiteDto = {
        name: site.name,
        description: site.description,
        location: site.location,
        enabled: site.enabled
      };
      
      this.landingSiteService.create(createDto).subscribe({
        next: (newSite) => {
          this.landingSites.update(sites => [...sites, newSite]);
          this.showDialog = false;
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Landing site created successfully'
          });
        },
        error: (error) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to create landing site'
          });
        }
      });
    } else if (this.dialogMode() === 'edit' && this.selectedLandingSite()?.id) {
      const updateDto: UpdateLandingSiteDto = {
        name: site.name,
        description: site.description,
        location: site.location,
        enabled: site.enabled
      };
      
      this.landingSiteService.update(this.selectedLandingSite()!.id, updateDto).subscribe({
        next: (updatedSite) => {
          this.landingSites.update(sites => 
            sites.map(s => s.id === updatedSite.id ? updatedSite : s)
          );
          this.showDialog = false;
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Landing site updated successfully'
          });
        },
        error: (error) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to update landing site'
          });
        }
      });
    }
  }
  
  deleteLandingSite(site: LandingSiteResponseDto) {
    this.landingSiteService.delete(site.id).subscribe({
      next: () => {
        this.landingSites.update(sites => sites.filter(s => s.id !== site.id));
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Landing site deleted successfully'
        });
      },
      error: (error) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to delete landing site'
        });
      }
    });
  }
  
  onDialogShow() {
    // Wait for dialog animation to complete, then prepare map
    setTimeout(() => {
      const formComponent = this.landingSiteFormComponent();
      if (formComponent) {
        // Initialize map after dialog is fully open
        formComponent.prepareMap();
      }
    }, 10); // Minimal delay since dialog now opens instantly
  }
  
  // Convert DTO to model for form
  private dtoToModel(dto: LandingSiteResponseDto): LandingSite {
    return {
      id: dto.id,
      name: dto.name,
      description: dto.description,
      location: dto.location,
      enabled: dto.status === 'active',
      created: new Date(dto.created_at),
      last_updated: new Date(dto.updated_at)
    };
  }

  // Status utility methods (kept as methods since they're used in templates with parameters)
  getStatusLabel(status: string): string {
    switch (status) {
      case 'active': return 'Active';
      case 'inactive': return 'Inactive';
      case 'restricted': return 'Restricted';
      default: return status;
    }
  }

  getStatusSeverity(status: string): 'success' | 'danger' | 'warn' | 'info' {
    switch (status) {
      case 'active': return 'success';
      case 'inactive': return 'danger';
      case 'restricted': return 'warn';
      default: return 'info';
    }
  }
}