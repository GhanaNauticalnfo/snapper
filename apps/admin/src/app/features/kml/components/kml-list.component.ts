// features/kml/components/kml-list.component.ts
import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { KmlDatasetService } from '../services/kml-dataset.service';
import { KmlDataset } from '../models/kml-dataset.model';

import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService, MessageService } from 'primeng/api';

@Component({
  selector: 'app-kml-list',
  standalone: true,
  imports: [
    CommonModule, 
    RouterModule, 
    TableModule, 
    ButtonModule, 
    ProgressSpinnerModule,
    ToastModule,
    ConfirmDialogModule
  ],
  providers: [ConfirmationService, MessageService],
  template: `
    <p-toast></p-toast>
    <p-confirmDialog></p-confirmDialog>
    
    <div class="kml-list-container">
      @if (loading()) {
        <div class="loading-container">
          <p-progressSpinner></p-progressSpinner>
        </div>
      }
      
      <p-table 
        [value]="datasets()" 
        [tableStyle]="{ 'min-width': '50rem' }" 
        [paginator]="datasets().length > 10" 
        [rows]="10"
        styleClass="p-datatable-striped"
        [rowHover]="true"
        [showCurrentPageReport]="true"
        currentPageReportTemplate="Showing {first} to {last} of {totalRecords} entries"
        [loading]="loading()"
      >
        <ng-template pTemplate="caption">
          <div class="table-header">KML Datasets</div>
        </ng-template>
        
        <ng-template pTemplate="header">
          <tr>
            <th pSortableColumn="id">ID <p-sortIcon field="id"></p-sortIcon></th>
            <th pSortableColumn="name">Name <p-sortIcon field="name"></p-sortIcon></th>
            <th pSortableColumn="enabled">Enabled <p-sortIcon field="enabled"></p-sortIcon></th>
            <th pSortableColumn="created">Created <p-sortIcon field="created"></p-sortIcon></th>
            <th pSortableColumn="last_updated">Last Updated <p-sortIcon field="last_updated"></p-sortIcon></th>
            <th>Actions</th>
          </tr>
        </ng-template>
        
        <ng-template pTemplate="body" let-dataset>
          <tr>
            <td>{{ dataset.id }}</td>
            <td>{{ dataset.name }}</td>
            <td>
              <span [class]="dataset.enabled ? 'status-badge status-enabled' : 'status-badge status-disabled'">
                {{ dataset.enabled ? 'Yes' : 'No' }}
              </span>
            </td>
            <td>{{ dataset.created | date:'medium' }}</td>
            <td>{{ dataset.last_updated | date:'medium' }}</td>
            <td>
              <div class="action-buttons">
                <p-button 
                  icon="pi pi-search" 
                  styleClass="p-button-info p-button-sm"  
                  [routerLink]="['/kml', dataset.id]"
                  pTooltip="View"
                ></p-button>
                <p-button 
                  icon="pi pi-pencil" 
                  styleClass="p-button-success p-button-sm" 
                  [routerLink]="['/kml', dataset.id, 'edit']"
                  pTooltip="Edit"
                ></p-button>
                <p-button 
                  icon="pi pi-trash" 
                  styleClass="p-button-danger p-button-sm" 
                  (click)="confirmDelete(dataset)"
                  pTooltip="Delete"
                ></p-button>
              </div>
            </td>
          </tr>
        </ng-template>
        
        <ng-template pTemplate="emptymessage">
          <tr>
            <td colspan="6" class="text-center">
              @if (error()) {
                <div class="p-error">{{ error() }}</div>
              } @else {
                No KML datasets found. Click "New KML Document" to get started.
              }
            </td>
          </tr>
        </ng-template>
      </p-table>
    </div>
  `,
  styles: [`
    .kml-list-container {
      padding: 0.5rem;
    }
    
    .loading-container {
      display: flex;
      justify-content: center;
      padding: 2rem;
    }
    
    .action-buttons {
      display: flex;
      gap: 0.5rem;
    }
    
    .status-badge {
      border-radius: 2px;
      padding: 0.25rem 0.5rem;
      text-transform: uppercase;
      font-weight: 700;
      font-size: 0.75rem;
      letter-spacing: 0.3px;
    }
    
    .status-enabled {
      background-color: #C8E6C9;
      color: #256029;
    }
    
    .status-disabled {
      background-color: #FFCDD2;
      color: #C63737;
    }
    
    .table-header {
      font-size: 1.25rem;
      font-weight: 600;
    }
    
    .text-center {
      text-align: center;
      padding: 2rem 0;
    }
    
    :host ::ng-deep .p-datatable-emptymessage td {
      text-align: center;
      padding: 2rem 0;
    }
  `]
})
export class KmlListComponent implements OnInit {
  private kmlDatasetService = inject(KmlDatasetService);
  private confirmationService = inject(ConfirmationService);
  private messageService = inject(MessageService);
  
  datasets = signal<KmlDataset[]>([]);
  loading = signal<boolean>(false);
  error = signal<string | null>(null);

  ngOnInit(): void {
    this.loadDatasets();
  }

  loadDatasets(): void {
    this.loading.set(true);
    this.error.set(null);
    
    this.kmlDatasetService.getAll().subscribe({
      next: (data) => {
        this.datasets.set(data);
        this.loading.set(false);
        console.log('KML Datasets loaded:', data);
      },
      error: (err) => {
        this.error.set('Failed to load KML datasets. Please try again later.');
        this.loading.set(false);
        console.error('Error loading KML datasets:', err);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load KML datasets'
        });
      }
    });
  }

  confirmDelete(dataset: KmlDataset): void {
    this.confirmationService.confirm({
      message: `Are you sure you want to delete the KML dataset "${dataset.name}"?`,
      header: 'Confirm Delete',
      icon: 'pi pi-exclamation-triangle',
      accept: () => this.deleteKml(dataset.id)
    });
  }

  deleteKml(id: number): void {
    this.kmlDatasetService.delete(id).subscribe({
      next: () => {
        this.datasets.update(currentDatasets => 
          currentDatasets.filter(dataset => dataset.id !== id)
        );
        console.log('KML Dataset deleted:', id);
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'KML dataset deleted successfully'
        });
      },
      error: (err) => {
        console.error('Error deleting KML dataset:', err);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to delete KML dataset'
        });
      }
    });
  }
}