import { Component, OnInit, ViewChild, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DialogModule } from 'primeng/dialog';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { SkeletonModule } from 'primeng/skeleton';
import { MessageService, ConfirmationService } from 'primeng/api';
import { LandingSiteService } from '../services/landing-site.service';
import { LandingSite } from '../models/landing-site.model';
import { LandingSiteFormComponent } from './landing-site-form.component';

@Component({
  selector: 'app-landing-site-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    ButtonModule,
    InputTextModule,
    DialogModule,
    TagModule,
    ToastModule,
    ConfirmDialogModule,
    SkeletonModule,
    LandingSiteFormComponent
  ],
  providers: [MessageService, ConfirmationService],
  template: `
    <div class="landing-site-list-container">
      <div class="flex justify-content-between align-items-center mb-4">
        <h2>Landing Sites</h2>
        <button 
          pButton 
          type="button" 
          label="New Landing Site" 
          icon="pi pi-plus" 
          class="p-button-success"
          (click)="showCreateDialog()">
        </button>
      </div>

      <div class="mb-3">
        <span class="p-input-icon-left">
          <i class="pi pi-search"></i>
          <input 
            pInputText 
            type="text" 
            [(ngModel)]="searchQuery" 
            placeholder="Search landing sites..." 
            class="w-full">
        </span>
      </div>

      <p-table 
        [value]="filteredLandingSites()" 
        [loading]="loading()"
        [paginator]="true" 
        [rows]="10"
        [showCurrentPageReport]="true"
        currentPageReportTemplate="Showing {first} to {last} of {totalRecords} landing sites"
        styleClass="p-datatable-gridlines">
        
        <ng-template pTemplate="header">
          <tr>
            <th pSortableColumn="name">
              Name <p-sortIcon field="name"></p-sortIcon>
            </th>
            <th>Description</th>
            <th>Location</th>
            <th pSortableColumn="enabled">
              Status <p-sortIcon field="enabled"></p-sortIcon>
            </th>
            <th pSortableColumn="last_updated">
              Last Updated <p-sortIcon field="last_updated"></p-sortIcon>
            </th>
            <th>Actions</th>
          </tr>
        </ng-template>

        <ng-template pTemplate="body" let-site>
          <tr>
            <td>{{ site.name }}</td>
            <td>{{ site.description || '-' }}</td>
            <td>
              {{ site.location.coordinates[1].toFixed(4) }}°N, 
              {{ site.location.coordinates[0].toFixed(4) }}°{{ site.location.coordinates[0] >= 0 ? 'E' : 'W' }}
            </td>
            <td>
              <p-tag 
                [value]="site.enabled ? 'Active' : 'Inactive'" 
                [severity]="site.enabled ? 'success' : 'danger'">
              </p-tag>
            </td>
            <td>{{ site.last_updated | date:'short' }}</td>
            <td>
              <button 
                pButton 
                type="button" 
                icon="pi pi-eye" 
                class="p-button-text p-button-info"
                (click)="viewLandingSite(site)"
                pTooltip="View">
              </button>
              <button 
                pButton 
                type="button" 
                icon="pi pi-pencil" 
                class="p-button-text p-button-warning"
                (click)="editLandingSite(site)"
                pTooltip="Edit">
              </button>
              <button 
                pButton 
                type="button" 
                icon="pi pi-trash" 
                class="p-button-text p-button-danger"
                (click)="confirmDelete(site)"
                pTooltip="Delete">
              </button>
            </td>
          </tr>
        </ng-template>

        <ng-template pTemplate="emptymessage">
          <tr>
            <td colspan="6" class="text-center">
              @if (loading()) {
                <div class="flex flex-column align-items-center gap-3">
                  @for (i of [1,2,3]; track i) {
                    <p-skeleton width="100%" height="2rem"></p-skeleton>
                  }
                </div>
              } @else {
                No landing sites found
              }
            </td>
          </tr>
        </ng-template>
      </p-table>

      <p-dialog 
        [(visible)]="showDialog" 
        [header]="dialogMode() === 'view' ? 'View Landing Site' : (dialogMode() === 'edit' ? 'Edit Landing Site' : 'Create Landing Site')"
        [modal]="true"
        [style]="{width: '90vw', height: '85vh'}"
        [maximizable]="true"
        [draggable]="false"
        [resizable]="false"
        [appendTo]="'body'"
        [blockScroll]="true"
        (onShow)="onDialogShow()">
        
        <app-landing-site-form
          #landingSiteForm
          [landingSite]="selectedLandingSite()"
          [mode]="dialogMode()"
          (save)="saveLandingSite($event)"
          (cancel)="showDialog = false">
        </app-landing-site-form>
      </p-dialog>

      <p-confirmDialog></p-confirmDialog>
      <p-toast></p-toast>
    </div>
  `,
  styles: [`
    .landing-site-list-container {
      padding: 0 1.5rem 1.5rem 1.5rem;
    }
  `],
  host: {
    'class': 'landing-site-list-host'
  }
})
export class LandingSiteListComponent implements OnInit {
  @ViewChild('landingSiteForm') landingSiteFormComponent?: LandingSiteFormComponent;
  
  landingSites = signal<LandingSite[]>([]);
  selectedLandingSite = signal<LandingSite | null>(null);
  loading = signal(false);
  error = signal<string | null>(null);
  searchQuery = '';
  showDialog = false;
  dialogMode = signal<'view' | 'edit' | 'create'>('create');

  filteredLandingSites = computed(() => {
    const query = this.searchQuery.toLowerCase();
    const siteList = this.landingSites();
    
    if (!query) return siteList;
    
    return siteList.filter(site => 
      site.name.toLowerCase().includes(query) ||
      site.description?.toLowerCase().includes(query)
    );
  });

  constructor(
    private landingSiteService: LandingSiteService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService
  ) {}

  ngOnInit() {
    this.loadLandingSites();
  }

  loadLandingSites() {
    this.loading.set(true);
    this.landingSiteService.getAll().subscribe({
      next: (sites) => {
        this.landingSites.set(sites);
        this.loading.set(false);
      },
      error: (error) => {
        this.error.set('Failed to load landing sites');
        this.loading.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load landing sites'
        });
      }
    });
  }

  showCreateDialog() {
    this.selectedLandingSite.set({
      name: '',
      description: '',
      location: {
        type: 'Point',
        coordinates: [-0.4, 5.6] // Default to Ghana coast
      },
      enabled: true
    } as LandingSite);
    this.dialogMode.set('create');
    this.showDialog = true;
  }

  viewLandingSite(site: LandingSite) {
    this.selectedLandingSite.set(site);
    this.dialogMode.set('view');
    this.showDialog = true;
  }

  editLandingSite(site: LandingSite) {
    this.selectedLandingSite.set({ ...site });
    this.dialogMode.set('edit');
    this.showDialog = true;
  }

  saveLandingSite(site: LandingSite) {
    if (this.dialogMode() === 'create') {
      this.landingSiteService.create(site).subscribe({
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
    } else if (this.dialogMode() === 'edit' && site.id) {
      this.landingSiteService.update(site.id, site).subscribe({
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

  confirmDelete(site: LandingSite) {
    this.confirmationService.confirm({
      message: `Are you sure you want to delete the landing site "${site.name}"?`,
      header: 'Confirm Delete',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        if (site.id) {
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
      }
    });
  }

  onDialogShow() {
    // Allow dialog to render, then initialize/resize map
    setTimeout(() => {
      if (this.landingSiteFormComponent) {
        // If the map is already initialized, resize it
        (this.landingSiteFormComponent as any).map?.resize();
      }
    }, 100);
  }
}