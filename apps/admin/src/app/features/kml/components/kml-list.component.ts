// features/kml/components/kml-list.component.ts
import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
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
import { TooltipModule } from 'primeng/tooltip';
import { SkeletonModule } from 'primeng/skeleton';

@Component({
  selector: 'app-kml-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    TableModule,
    ButtonModule,
    ProgressSpinnerModule,
    ToastModule,
    DialogModule,
    ConfirmDialogModule,
    CardModule,
    InputTextModule,
    TextareaModule,
    CheckboxModule,
    TooltipModule,
    SkeletonModule
  ],
  providers: [ConfirmationService, MessageService],
  template: `
    <p-toast></p-toast>
    <p-confirmDialog
      header="Confirm Deletion" 
      icon="pi pi-exclamation-triangle" 
      acceptButtonStyleClass="p-button-danger" 
      acceptIcon="pi pi-trash"
      rejectButtonStyleClass="p-button-secondary">
    </p-confirmDialog>

    <div class="kml-list-container">
    <div class="flex justify-between items-center mb-3">
        <p-button
          label="New KML Document"
          icon="pi pi-plus"
          (onClick)="openNewDialog()"
        ></p-button>
      </div>

      @if (loading() && datasets().length === 0) {
        <div class="loading-container">
          <p-progressSpinner></p-progressSpinner>
        </div>
      }

      <p-table
        [value]="datasets()"
        [tableStyle]="{ 'min-width': '50rem' }"
        [paginator]="datasets().length > 10"
        [rows]="10"
        styleClass="p-datatable-sm p-datatable-striped"
        [rowHover]="true"
        [loading]="loading()"
      >
        <ng-template pTemplate="header">
          <tr>
            <th pSortableColumn="id" style="width: 10%">ID <p-sortIcon field="id"></p-sortIcon></th>
            <th pSortableColumn="name" style="width: 20%">Name <p-sortIcon field="name"></p-sortIcon></th>
            <th pSortableColumn="enabled" style="width: 10%">Enabled <p-sortIcon field="enabled"></p-sortIcon></th>
            <th pSortableColumn="created" style="width: 15%">Created <p-sortIcon field="created"></p-sortIcon></th>
            <th pSortableColumn="last_updated" style="width: 15%">Last Updated <p-sortIcon field="last_updated"></p-sortIcon></th>
            <th style="width: 30%">Actions</th>
          </tr>
        </ng-template>

        <ng-template pTemplate="body" let-dataset>
          <tr>
            <td><span class="font-mono text-sm">{{ dataset.id }}</span></td>
            <td>{{ dataset.name }}</td>
            <td>
              <span [class]="dataset.enabled ? 'status-badge status-enabled text-xs font-bold uppercase tracking-tight' : 'status-badge status-disabled text-xs font-bold uppercase tracking-tight'">
                {{ dataset.enabled ? 'Yes' : 'No' }}
              </span>
            </td>
            <td>{{ dataset.created | date:'medium' }}</td>
            <td>{{ dataset.last_updated | date:'medium' }}</td>
            <td>
              <p-button 
                label="Details" 
                icon="pi pi-search" 
                styleClass="p-button-text p-button-sm" 
                (onClick)="openViewDialog(dataset)">
              </p-button>
              <p-button 
                label="Edit" 
                icon="pi pi-pencil" 
                styleClass="p-button-text p-button-sm" 
                (onClick)="openEditDialog(dataset)">
              </p-button>
              <p-button 
                label="Delete" 
                icon="pi pi-trash" 
                styleClass="p-button-text p-button-sm" 
                (onClick)="confirmDelete(dataset)">
              </p-button>
            </td>
          </tr>
        </ng-template>

        <ng-template pTemplate="emptymessage">
          <tr>
            <td colspan="6" class="text-center p-4">
              @if (!loading() && !error()) {
                No KML datasets found.
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
              <td><p-skeleton></p-skeleton></td>
            </tr>
          }
        </ng-template>
      </p-table>
    </div>

    <!-- View Dialog -->
    <p-dialog
      [(visible)]="viewDialogVisible"
      [style]="{width: '80vw', 'max-width': '900px'}"
      [modal]="true"
      [draggable]="false"
      [resizable]="false"
      [closeOnEscape]="true"
      [closable]="true"
      header="View KML Dataset"
      (onHide)="closeViewDialog()"
    >
      @if (selectedDataset()) {
        <div class="view-dialog-content">
          <div class="grid">
            <div class="col-12 md:col-6">
              <div class="detail-item">
                <span class="detail-label font-semibold">ID:</span>
                <span class="detail-value">{{ selectedDataset()?.id }}</span>
              </div>
            </div>

            <div class="col-12 md:col-6">
              <div class="detail-item">
                <span class="detail-label font-semibold">Name:</span>
                <span class="detail-value">{{ selectedDataset()?.name }}</span>
              </div>
            </div>

            <div class="col-12 md:col-6">
              <div class="detail-item">
                <span class="detail-label font-semibold">Enabled:</span>
                <span class="status-badge text-xs font-bold uppercase tracking-tight"
                  [class]="selectedDataset()?.enabled ? 'status-enabled' : 'status-disabled'">
                  {{ selectedDataset()?.enabled ? 'Yes' : 'No' }}
                </span>
              </div>
            </div>

            <div class="col-12 md:col-6">
              <div class="detail-item">
                <span class="detail-label font-semibold">Created:</span>
                <span class="detail-value">{{ selectedDataset()?.created | date:'medium' }}</span>
              </div>
            </div>

            <div class="col-12 md:col-6">
              <div class="detail-item">
                <span class="detail-label font-semibold">Last Updated:</span>
                <span class="detail-value">{{ selectedDataset()?.last_updated | date:'medium' }}</span>
              </div>
            </div>
          </div>

          <div class="kml-content">
            <h3>KML Content</h3>
            <div class="kml-code-container">
              <pre class="kml-code text-sm">{{ selectedDataset()?.kml }}</pre>
            </div>
          </div>
        </div>
      }

      <ng-template pTemplate="footer">
        <div class="flex justify-content-between">
          <p-button label="Back to List" icon="pi pi-arrow-left" styleClass="p-button-secondary" (onClick)="closeViewDialog()"></p-button>
          <p-button label="Edit" icon="pi pi-pencil" styleClass="p-button-success" (onClick)="openEditDialog(selectedDataset())"></p-button>
        </div>
      </ng-template>
    </p-dialog>

    <!-- Edit/Create Dialog -->
    <p-dialog
      [(visible)]="formDialogVisible"
      [style]="{width: '70vw', 'max-width': '800px'}"
      [modal]="true"
      [draggable]="false"
      [resizable]="false"
      [closeOnEscape]="true"
      [closable]="true"
      [header]="isEditMode() ? 'Edit KML Dataset' : 'Create New KML Dataset'"
      (onHide)="closeFormDialog()"
    >
      <!-- Add formGroup directive -->
      <form [formGroup]="kmlForm" class="form-container">
        <div class="form-group">
          <label for="name" class="form-label">Name <span class="required-asterisk">*</span></label>
          <span class="p-input-icon-left w-full">
            <i class="pi pi-tag"></i>
            <input
              type="text"
              pInputText
              id="name"
              formControlName="name"
              placeholder="Enter a name for the KML dataset"
              class="w-full"
              [ngClass]="{'ng-invalid ng-dirty': kmlForm.controls['name'].invalid && kmlForm.controls['name'].touched}"
            />
          </span>
           @if (kmlForm.controls['name'].invalid && kmlForm.controls['name'].touched) {
             <small class="p-error block mt-1 text-xs">Name is required.</small>
           }
        </div>

        <div class="form-group">
          <label for="enabled" class="form-label">Status</label>
          <div class="p-field-checkbox">
            <p-checkbox
              formControlName="enabled"
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
            formControlName="kml"
            placeholder="Paste your KML content here"
            rows="15"
            class="w-full kml-textarea"
            [ngClass]="{'ng-invalid ng-dirty': kmlForm.controls['kml'].invalid && kmlForm.controls['kml'].touched}"
          ></textarea>
           @if (kmlForm.controls['kml'].invalid && kmlForm.controls['kml'].touched) {
             <small class="p-error block mt-1 text-xs">KML content is required.</small>
           }
        </div>
      </form>

      <ng-template pTemplate="footer">
        <p-button
          icon="pi pi-save"
          label="Save"
          styleClass="p-button-success mr-2"
          (onClick)="saveDataset()"
          [disabled]="kmlForm.invalid || saving()"
          [loading]="saving()"
        ></p-button>
        <p-button
          icon="pi pi-times"
          label="Cancel"
          styleClass="p-button-secondary"
          (onClick)="closeFormDialog()"
          [disabled]="saving()"
        ></p-button>
      </ng-template>
    </p-dialog>
  `,
  styles: [`
    :host { display: block; }
    .kml-list-container { margin-top: 1rem; }
    .font-mono { font-family: monospace; background-color: var(--surface-100); padding: 0.1rem 0.3rem; border-radius: 3px; }
    
    
    p-message { margin-bottom: 1rem; }
    .text-center { text-align: center; }
    
    .loading-container {
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 2rem;
      min-height: 200px;
    }

    .status-badge {
      border-radius: 4px;
      padding: 0.25rem 0.5rem;
      display: inline-block;
    }

    .status-enabled {
      background-color: var(--green-100, #C8E6C9);
      color: var(--green-700, #256029);
    }

    .status-disabled {
      background-color: var(--red-100, #FFCDD2);
      color: var(--red-700, #C63737);
    }

    .detail-item {
      margin-bottom: 1rem;
      display: flex;
      align-items: flex-start;
      gap: 0.5rem;
    }

    .detail-label {
      min-width: 120px;
      flex-shrink: 0;
    }
    .detail-value {
      word-break: break-word;
    }

    .kml-content {
      margin-top: 1.5rem;
    }

    .kml-code-container {
      max-height: 400px;
      overflow: auto;
      background-color: var(--surface-b, #f8f9fa);
      border-radius: 4px;
      border: 1px solid var(--surface-d, #e9ecef);
    }

    .kml-code {
      padding: 1rem;
      white-space: pre-wrap;
      word-wrap: break-word;
      font-family: var(--font-family-monospace, monospace);
      color: var(--text-color, #333);
      margin: 0;
    }

    .form-container {
      padding: 0.5rem 0;
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
      color: var(--red-500, #f44336);
    }

    .kml-textarea {
      font-family: var(--font-family-monospace, monospace);
      resize: vertical;
      min-height: 150px;
    }

    .p-field-checkbox {
      display: flex;
      align-items: center;
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

    /* PrimeNG Input Validation Highlighting */
    .ng-invalid.ng-dirty {
       border-color: var(--red-500, #f44336);
    }

    .grid { display: flex; flex-wrap: wrap; margin-right: -0.5rem; margin-left: -0.5rem; row-gap: 0.5rem; }
    .col-12 { flex: 0 0 100%; padding: 0 0.5rem; max-width: 100%; }

    @media (min-width: 768px) {
      .md\\:col-6 { flex: 0 0 50%; max-width: 50%; }
    }
  `],
  host: {
    'class': 'kml-list-host'
  }
})
export class KmlListComponent implements OnInit {
  private kmlDatasetService = inject(KmlDatasetService);
  private confirmationService = inject(ConfirmationService);
  private messageService = inject(MessageService);
  private fb = inject(FormBuilder);

  // Data signals
  datasets = signal<KmlDataset[]>([]);
  loading = signal<boolean>(false);
  saving = signal<boolean>(false);
  error = signal<string | null>(null);

  // Dialog control properties
  viewDialogVisible = false;
  formDialogVisible = false;

  // Other signals
  isEditMode = signal<boolean>(false);
  selectedDataset = signal<KmlDataset | null>(null);

  // Reactive Form Group
  kmlForm: FormGroup;

  constructor() {
    this.kmlForm = this.fb.group({
      name: ['', Validators.required],
      enabled: [true],
      kml: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    this.loadDatasets();
  }

  loadDatasets(): void {
    this.loading.set(true);
    this.error.set(null);
    this.datasets.set([]);

    this.kmlDatasetService.getAll().subscribe({
      next: (data) => {
        this.datasets.set(data);
        console.log('KML Datasets loaded:', data.length);
      },
      error: (err) => {
        this.error.set('Failed to load KML datasets. Please try again later.');
        console.error('Error loading KML datasets:', err);
        this.messageService.add({
          severity: 'error',
          summary: 'Load Error',
          detail: 'Failed to load KML datasets',
          life: 3000
        });
      },
      complete: () => {
        this.loading.set(false);
      }
    });
  }

  // --- View Dialog Methods ---
  openViewDialog(dataset: KmlDataset): void {
    this.selectedDataset.set(dataset);
    this.viewDialogVisible = true;
  }

  closeViewDialog(): void {
    this.viewDialogVisible = false;
  }

  // --- Form Dialog Methods ---
  openNewDialog(): void {
    this.isEditMode.set(false);
    this.selectedDataset.set(null);
    this.kmlForm.reset({
      name: '',
      enabled: true,
      kml: ''
    });
    this.formDialogVisible = true;
  }

  openEditDialog(dataset: KmlDataset | null): void {
    if (!dataset) return;

    this.isEditMode.set(true);
    this.selectedDataset.set(dataset);
    this.kmlForm.patchValue({
      name: dataset.name || '',
      enabled: dataset.enabled,
      kml: dataset.kml || ''
    });
    this.formDialogVisible = true;

    if (this.viewDialogVisible) {
      this.viewDialogVisible = false;
    }
  }

  closeFormDialog(): void {
    this.formDialogVisible = false;
    this.selectedDataset.set(null);
  }

  // --- Save Data Method ---
  saveDataset(): void {
    if (this.kmlForm.invalid) {
      this.kmlForm.markAllAsTouched();
      this.messageService.add({
        severity: 'warn',
        summary: 'Validation Error',
        detail: 'Please fill in all required fields correctly.',
        life: 3000
      });
      return;
    }

    this.saving.set(true);
    const formData = this.kmlForm.value;

    if (this.isEditMode() && this.selectedDataset()) {
      const datasetId = this.selectedDataset()?.id;

      if (datasetId) {
        this.kmlDatasetService.update(datasetId, formData).subscribe({
          next: (updatedData) => {
            console.log('KML Dataset updated:', updatedData);
            this.datasets.update(currentDatasets =>
              currentDatasets.map(item =>
                item.id === updatedData.id ? updatedData : item
              )
            );
            this.messageService.add({
              severity: 'success',
              summary: 'Success',
              detail: 'KML dataset updated successfully',
              life: 3000
            });
            this.closeFormDialog();
          },
          error: (err) => {
            console.error('Error updating KML dataset:', err);
            this.messageService.add({
              severity: 'error',
              summary: 'Update Error',
              detail: err.error?.message || 'Failed to update KML dataset',
              life: 5000
            });
          },
          complete: () => {
            this.saving.set(false);
          }
        });
      } else {
        console.error("Save error: Edit mode is true but dataset ID is missing.");
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Cannot update dataset: ID missing.' });
        this.saving.set(false);
      }
    } else {
      this.kmlDatasetService.create(formData).subscribe({
        next: (newData) => {
          console.log('KML Dataset created:', newData);
          this.datasets.update(currentDatasets =>
            [...currentDatasets, newData]
          );
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'KML dataset created successfully',
            life: 3000
          });
          this.closeFormDialog();
        },
        error: (err) => {
          console.error('Error creating KML dataset:', err);
          this.messageService.add({
            severity: 'error',
            summary: 'Create Error',
            detail: err.error?.message || 'Failed to create KML dataset',
            life: 5000
          });
        },
        complete: () => {
          this.saving.set(false);
        }
      });
    }
  }

  // --- Delete Confirmation ---
  confirmDelete(dataset: KmlDataset): void {
    if (!dataset || dataset.id === undefined) return;

    this.confirmationService.confirm({
      message: `Are you sure you want to delete the KML dataset "${dataset.name}" (ID: ${dataset.id})? This action cannot be undone.`,
      header: 'Confirm Deletion',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      acceptLabel: 'Delete',
      rejectLabel: 'Cancel',
      accept: () => this.deleteKml(dataset.id),
    });
  }

  deleteKml(id: number): void {
    this.loading.set(true);
    this.kmlDatasetService.delete(id).subscribe({
      next: () => {
        this.datasets.update(currentDatasets =>
          currentDatasets.filter(dataset => dataset.id !== id)
        );
        console.log('KML Dataset deleted:', id);
        this.messageService.add({
          severity: 'success',
          summary: 'Deleted',
          detail: 'KML dataset deleted successfully',
          life: 3000
        });
        if (this.selectedDataset()?.id === id) {
            this.selectedDataset.set(null);
            this.closeViewDialog();
        }
      },
      error: (err) => {
        console.error('Error deleting KML dataset:', err);
        this.messageService.add({
          severity: 'error',
          summary: 'Delete Error',
          detail: err.error?.message || 'Failed to delete KML dataset',
          life: 5000
        });
      },
      complete: () => {
         this.loading.set(false);
      }
    });
  }
}