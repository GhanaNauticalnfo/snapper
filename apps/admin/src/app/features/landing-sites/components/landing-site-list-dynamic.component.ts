import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { MessageService, ConfirmationService } from 'primeng/api';
import { DialogService, DynamicDialogRef } from 'primeng/dynamicdialog';
import { FormsModule } from '@angular/forms';
import { LandingSiteService } from '../services/landing-site.service';
import { LandingSiteResponseDto, CreateLandingSiteDto, UpdateLandingSiteDto } from '../models/landing-site.dto';
import { LandingSiteFormDialogComponent } from './landing-site-form-dialog.component';

@Component({
  selector: 'app-landing-site-list-dynamic',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    ButtonModule,
    InputTextModule,
    TagModule,
    ToastModule,
    ConfirmDialogModule
  ],
  providers: [DialogService, MessageService, ConfirmationService],
  template: `
    <div class="landing-site-list-container">
      <div class="page-header">
        <h2>Landing Sites</h2>
      </div>

      <div class="flex justify-between items-center mb-3">
        <button 
          pButton 
          type="button" 
          label="New Landing Site" 
          icon="pi pi-plus" 
          class="p-button-success"
          (click)="openCreateDialog()">
        </button>
        
        <div class="p-input-icon-right search-container">
          <input 
            pInputText 
            type="text" 
            [(ngModel)]="searchQuery" 
            (ngModelChange)="filterSites()"
            placeholder="Search landing sites..."
            class="search-input">
          <i class="pi pi-search"></i>
        </div>
      </div>

      <p-table 
        [value]="filteredSites" 
        [loading]="loading"
        [paginator]="true" 
        [rows]="10"
        [showCurrentPageReport]="true"
        currentPageReportTemplate="Showing {first} to {last} of {totalRecords} landing sites"
        styleClass="p-datatable-gridlines">
        
        <ng-template pTemplate="header">
          <tr>
            <th pSortableColumn="name">Name <p-sortIcon field="name"></p-sortIcon></th>
            <th pSortableColumn="description">Description <p-sortIcon field="description"></p-sortIcon></th>
            <th>Location</th>
            <th pSortableColumn="status">Status <p-sortIcon field="status"></p-sortIcon></th>
            <th pSortableColumn="updated_at">Last Updated <p-sortIcon field="updated_at"></p-sortIcon></th>
            <th>Actions</th>
          </tr>
        </ng-template>

        <ng-template pTemplate="body" let-site>
          <tr>
            <td>{{ site.name }}</td>
            <td>{{ site.description }}</td>
            <td>
              {{ site.location.coordinates[1].toFixed(4) }}°N, 
              {{ site.location.coordinates[0].toFixed(4) }}°{{ site.location.coordinates[0] >= 0 ? 'E' : 'W' }}
            </td>
            <td>
              <p-tag 
                [value]="getStatusLabel(site.status)" 
                [severity]="getStatusSeverity(site.status)">
              </p-tag>
            </td>
            <td>{{ site.updated_at | date:'short' }}</td>
            <td>
              <button 
                pButton 
                type="button" 
                icon="pi pi-eye" 
                class="p-button-text p-button-info"
                (click)="openViewDialog(site)"
                pTooltip="View">
              </button>
              <button 
                pButton 
                type="button" 
                icon="pi pi-pencil" 
                class="p-button-text p-button-warning"
                (click)="openEditDialog(site)"
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
              {{ loading ? 'Loading...' : 'No landing sites found' }}
            </td>
          </tr>
        </ng-template>
      </p-table>

      <p-confirmDialog></p-confirmDialog>
      <p-toast></p-toast>
    </div>
  `,
  styles: [`
    .landing-site-list-container {
      padding: 0;
    }
    
    .search-container {
      position: relative;
      width: 300px;
    }
    
    .search-input {
      width: 100%;
      padding-right: 2.5rem;
    }
    
    .search-container .pi-search {
      position: absolute;
      right: 0.75rem;
      top: 50%;
      transform: translateY(-50%);
    }
  `],
  host: {
    'class': 'landing-site-list-dynamic-host'
  }
})
export class LandingSiteListDynamicComponent implements OnInit {
  landingSites: LandingSiteResponseDto[] = [];
  filteredSites: LandingSiteResponseDto[] = [];
  loading = false;
  searchQuery = '';
  
  private dialogRef: DynamicDialogRef | undefined;

  constructor(
    private landingSiteService: LandingSiteService,
    private dialogService: DialogService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService
  ) {}

  ngOnInit() {
    this.loadLandingSites();
  }

  loadLandingSites() {
    this.loading = true;
    this.landingSiteService.getAll().subscribe({
      next: (sites) => {
        this.landingSites = sites;
        this.filterSites();
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading landing sites:', error);
        this.loading = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load landing sites'
        });
      }
    });
  }

  filterSites() {
    if (!this.searchQuery) {
      this.filteredSites = [...this.landingSites];
    } else {
      const query = this.searchQuery.toLowerCase();
      this.filteredSites = this.landingSites.filter(site =>
        site.name.toLowerCase().includes(query) ||
        site.description?.toLowerCase().includes(query)
      );
    }
  }

  openCreateDialog() {
    this.dialogRef = this.dialogService.open(LandingSiteFormDialogComponent, {
      header: 'Create Landing Site',
      width: '90vw',
      height: '85vh',
      data: {
        mode: 'create'
      }
    });

    this.dialogRef.onClose.subscribe((result: any) => {
      if (result) {
        this.createLandingSite(result);
      }
    });
  }

  openViewDialog(site: LandingSiteResponseDto) {
    this.dialogRef = this.dialogService.open(LandingSiteFormDialogComponent, {
      header: 'View Landing Site',
      width: '90vw',
      height: '85vh',
      data: {
        mode: 'view',
        landingSite: site
      }
    });
  }

  openEditDialog(site: LandingSiteResponseDto) {
    this.dialogRef = this.dialogService.open(LandingSiteFormDialogComponent, {
      header: 'Edit Landing Site',
      width: '90vw',
      height: '85vh',
      data: {
        mode: 'edit',
        landingSite: site
      }
    });

    this.dialogRef.onClose.subscribe((result: any) => {
      if (result) {
        this.updateLandingSite(site.id, result);
      }
    });
  }

  createLandingSite(data: any) {
    const createDto: CreateLandingSiteDto = {
      name: data.name,
      description: data.description,
      location: data.location,
      enabled: data.enabled
    };

    this.landingSiteService.create(createDto).subscribe({
      next: (newSite) => {
        this.landingSites.push(newSite);
        this.filterSites();
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
  }

  updateLandingSite(id: number, data: any) {
    const updateDto: UpdateLandingSiteDto = {
      name: data.name,
      description: data.description,
      location: data.location,
      enabled: data.enabled
    };

    this.landingSiteService.update(id, updateDto).subscribe({
      next: (updatedSite) => {
        const index = this.landingSites.findIndex(s => s.id === id);
        if (index !== -1) {
          this.landingSites[index] = updatedSite;
          this.filterSites();
        }
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

  confirmDelete(site: LandingSiteResponseDto) {
    this.confirmationService.confirm({
      message: `Are you sure you want to delete the landing site "${site.name}"?`,
      header: 'Confirm Delete',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.deleteLandingSite(site);
      }
    });
  }

  deleteLandingSite(site: LandingSiteResponseDto) {
    this.landingSiteService.delete(site.id).subscribe({
      next: () => {
        this.landingSites = this.landingSites.filter(s => s.id !== site.id);
        this.filterSites();
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

  ngOnDestroy() {
    if (this.dialogRef) {
      this.dialogRef.close();
    }
  }
}