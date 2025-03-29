// features/kml/components/kml-list.component.ts
import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { KmlDatasetService } from '../services/kml-dataset.service';
import { KmlDataset } from '../models/kml-dataset.model';

// PrimeNG imports
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ToastModule } from 'primeng/toast';
import { DialogModule } from 'primeng/dialog';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService, MessageService } from 'primeng/api';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { CheckboxModule } from 'primeng/checkbox';

interface KmlFormData {
  name: string;
  enabled: boolean;
  kml: string;
}

@Component({
  selector: 'app-kml-list',
  standalone: true,
  imports: [
    CommonModule, 
    RouterModule,
    FormsModule,
    TableModule, 
    ButtonModule, 
    ProgressSpinnerModule,
    ToastModule,
    DialogModule,
    ConfirmDialogModule,
    CardModule,
    InputTextModule,
    TextareaModule,
    CheckboxModule
  ],
  providers: [ConfirmationService, MessageService],
  template: `
    <p-toast></p-toast>
    <p-confirmDialog></p-confirmDialog>
    
    <div class="kml-list-container">
      <div class="flex justify-content-between align-items-center mb-3">
        <h2>KML Datasets</h2>
        <p-button 
          label="New KML Document" 
          icon="pi pi-plus" 
          (onClick)="openNewDialog()"
        ></p-button>
      </div>
      
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
                  (onClick)="openViewDialog(dataset)"
                  pTooltip="View"
                ></p-button>
                <p-button 
                  icon="pi pi-pencil" 
                  styleClass="p-button-success p-button-sm" 
                  (onClick)="openEditDialog(dataset)"
                  pTooltip="Edit"
                ></p-button>
                <p-button 
                  icon="pi pi-trash" 
                  styleClass="p-button-danger p-button-sm" 
                  (onClick)="confirmDelete(dataset)"
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

    <!-- View Dialog -->
    <p-dialog 
  [visible]="viewDialogVisible()" 
  (onHide)="closeViewDialog()"
  [style]="{width: '80vw'}" 
  [modal]="true" 
  [draggable]="false" 
  [resizable]="false"
  header="View KML Dataset"
>
      @if (selectedDataset()) {
        <div class="view-dialog-content">
          <div class="grid">
            <div class="col-12 md:col-6">
              <div class="detail-item">
                <span class="detail-label">ID:</span>
                <span class="detail-value">{{ selectedDataset()?.id }}</span>
              </div>
            </div>
            
            <div class="col-12 md:col-6">
              <div class="detail-item">
                <span class="detail-label">Name:</span>
                <span class="detail-value">{{ selectedDataset()?.name }}</span>
              </div>
            </div>
            
            <div class="col-12 md:col-6">
              <div class="detail-item">
                <span class="detail-label">Enabled:</span>
                <span class="status-badge" 
                  [class]="selectedDataset()?.enabled ? 'status-enabled' : 'status-disabled'">
                  {{ selectedDataset()?.enabled ? 'Yes' : 'No' }}
                </span>
              </div>
            </div>
            
            <div class="col-12 md:col-6">
              <div class="detail-item">
                <span class="detail-label">Created:</span>
                <span class="detail-value">{{ selectedDataset()?.created | date:'medium' }}</span>
              </div>
            </div>
            
            <div class="col-12 md:col-6">
              <div class="detail-item">
                <span class="detail-label">Last Updated:</span>
                <span class="detail-value">{{ selectedDataset()?.last_updated | date:'medium' }}</span>
              </div>
            </div>
          </div>
          
          <div class="kml-content">
            <h3>KML Content</h3>
            <div class="kml-code-container">
              <pre class="kml-code">{{ selectedDataset()?.kml }}</pre>
            </div>
          </div>
        </div>
      }
      
      <ng-template pTemplate="footer">
        <p-button 
          icon="pi pi-pencil" 
          label="Edit" 
          styleClass="p-button-success mr-2" 
          (onClick)="openEditDialog(selectedDataset())"
        ></p-button>
        <p-button 
          icon="pi pi-times" 
          label="Close" 
          styleClass="p-button-secondary" 
          (onClick)="closeViewDialog()"
        ></p-button>
      </ng-template>
    </p-dialog>

    <!-- Edit/Create Dialog -->
    // Second dialog (form dialog)
<p-dialog 
  [visible]="formDialogVisible()" 
  (onHide)="closeFormDialog()"
  [style]="{width: '70vw'}" 
  [modal]="true" 
  [draggable]="false" 
  [resizable]="false"
  [header]="isEditMode() ? 'Edit KML Dataset' : 'Create New KML Dataset'"
>
      <div class="form-container">
        <div class="form-group">
          <label for="name" class="form-label">Name <span class="required-asterisk">*</span></label>
          <span class="p-input-icon-left w-full">
            <i class="pi pi-tag"></i>
            <input 
              type="text" 
              pInputText 
              id="name" 
              [(ngModel)]="formData().name" 
              placeholder="Enter a name for the KML dataset"
              class="w-full"
            />
          </span>
        </div>
        
        <div class="form-group">
          <label for="enabled" class="form-label">Status</label>
          <div class="p-field-checkbox">
            <p-checkbox 
              [(ngModel)]="formData().enabled" 
              [binary]="true" 
              inputId="enabled"
            ></p-checkbox>
            <label for="enabled" class="ml-2">Enabled</label>
          </div>
        </div>
        
        <div class="form-group">
          <label for="kml" class="form-label">KML Content <span class="required-asterisk">*</span></label>
          <textarea 
            pTextarea 
            id="kml" 
            [(ngModel)]="formData().kml" 
            placeholder="Paste your KML content here"
            rows="15"
            class="w-full kml-textarea"
          ></textarea>
        </div>
      </div>
      
      <ng-template pTemplate="footer">
        <p-button 
          icon="pi pi-save" 
          label="Save" 
          styleClass="p-button-success mr-2" 
          (onClick)="saveDataset()"
        ></p-button>
        <p-button 
          icon="pi pi-times" 
          label="Cancel" 
          styleClass="p-button-secondary" 
          (onClick)="closeFormDialog()"
        ></p-button>
      </ng-template>
    </p-dialog>
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
    
    .text-center {
      text-align: center;
      padding: 2rem 0;
    }
    
    .detail-item {
      margin-bottom: 1rem;
      display: flex;
      align-items: center;
    }
    
    .detail-label {
      font-weight: 600;
      min-width: 150px;
    }
    
    .kml-content {
      margin-top: 1.5rem;
    }
    
    .kml-code-container {
      max-height: 400px;
      overflow: auto;
      background-color: #f8f9fa;
      border-radius: 4px;
      border: 1px solid #e9ecef;
    }
    
    .kml-code {
      padding: 15px;
      white-space: pre-wrap;
      overflow-x: auto;
      font-family: monospace;
      color: #333;
      margin: 0;
    }
    
    .form-group {
      margin-bottom: 1.5rem;
    }
    
    .form-label {
      display: block;
      margin-bottom: 0.5rem;
      font-weight: 500;
    }
    
    .required-asterisk {
      color: #f44336;
    }
    
    .kml-textarea {
      font-family: monospace;
      resize: vertical;
    }
    
    .p-field-checkbox {
      display: flex;
      align-items: center;
    }
    
    .w-full {
      width: 100%;
    }
    
    .mr-2 {
      margin-right: 0.5rem;
    }
    
    .ml-2 {
      margin-left: 0.5rem;
    }
    
    .flex {
      display: flex;
    }
    
    .justify-content-between {
      justify-content: space-between;
    }
    
    .align-items-center {
      align-items: center;
    }
    
    .mb-3 {
      margin-bottom: 1rem;
    }
    
    .grid {
      display: flex;
      flex-wrap: wrap;
      margin-right: -0.5rem;
      margin-left: -0.5rem;
    }
    
    .col-12 {
      flex: 0 0 100%;
      padding: 0 0.5rem;
    }
    
    @media (min-width: 768px) {
      .md\\:col-6 {
        flex: 0 0 50%;
      }
    }
  `]
})
export class KmlListComponent implements OnInit {
  private kmlDatasetService = inject(KmlDatasetService);
  private confirmationService = inject(ConfirmationService);
  private messageService = inject(MessageService);
  
  // Data signals
  datasets = signal<KmlDataset[]>([]);
  loading = signal<boolean>(false);
  error = signal<string | null>(null);
  
  // Dialog control signals
  viewDialogVisible = signal<boolean>(false);
  formDialogVisible = signal<boolean>(false);
  isEditMode = signal<boolean>(false);
  selectedDataset = signal<KmlDataset | null>(null);
  
  // Form data signal
  formData = signal<KmlFormData>({
    name: '',
    enabled: true,
    kml: ''
  });

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

  // View dialog methods
  openViewDialog(dataset: KmlDataset): void {
    this.selectedDataset.set(dataset);
    this.viewDialogVisible.set(true);
  }
  
  closeViewDialog(): void {
    this.viewDialogVisible.set(false);
    this.selectedDataset.set(null);
  }
  
  // Form dialog methods
  openNewDialog(): void {
    this.isEditMode.set(false);
    this.formData.set({
      name: '',
      enabled: true,
      kml: ''
    });
    this.formDialogVisible.set(true);
  }
  
  openEditDialog(dataset: KmlDataset | null): void {
    if (!dataset) return;
    
    this.isEditMode.set(true);
    this.formData.set({
      name: dataset.name || '',
      enabled: dataset.enabled,
      kml: dataset.kml || ''
    });
    this.selectedDataset.set(dataset);
    this.formDialogVisible.set(true);
    
    // Close view dialog if it's open
    if (this.viewDialogVisible()) {
      this.viewDialogVisible.set(false);
    }
  }
  
  closeFormDialog(): void {
    this.formDialogVisible.set(false);
    setTimeout(() => {
      this.selectedDataset.set(null);
    }, 200);
  }
  
  // Save data method
  saveDataset(): void {
    const currentFormData = this.formData();
    
    if (!currentFormData.name || !currentFormData.kml) {
      this.messageService.add({
        severity: 'error',
        summary: 'Validation Error',
        detail: 'Please fill in all required fields'
      });
      return;
    }
    
    this.loading.set(true);
    
    if (this.isEditMode() && this.selectedDataset()) {
      const datasetId = this.selectedDataset()?.id;
      
      if (datasetId) {
        this.kmlDatasetService.update(datasetId, currentFormData).subscribe({
          next: (data) => {
            this.loading.set(false);
            console.log('KML Dataset updated:', data);
            
            // Update datasets list
            this.datasets.update(currentDatasets => 
              currentDatasets.map(item => 
                item.id === data.id ? data : item
              )
            );
            
            this.messageService.add({
              severity: 'success',
              summary: 'Success',
              detail: 'KML dataset updated successfully'
            });
            
            this.closeFormDialog();
          },
          error: (err) => {
            this.loading.set(false);
            console.error('Error updating KML dataset:', err);
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'Failed to update KML dataset'
            });
          }
        });
      }
    } else {
      this.kmlDatasetService.create(currentFormData).subscribe({
        next: (data) => {
          this.loading.set(false);
          console.log('KML Dataset created:', data);
          
          // Add new dataset to the list
          this.datasets.update(currentDatasets => 
            [...currentDatasets, data]
          );
          
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'KML dataset created successfully'
          });
          
          this.closeFormDialog();
        },
        error: (err) => {
          this.loading.set(false);
          console.error('Error creating KML dataset:', err);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to create KML dataset'
          });
        }
      });
    }
  }

  // Delete confirmation
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