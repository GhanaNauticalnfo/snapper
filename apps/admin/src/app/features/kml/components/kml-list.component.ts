// features/kml/components/kml-list.component.ts
import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
// Import ReactiveFormsModule
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
import { TooltipModule } from 'primeng/tooltip'; // Import TooltipModule

@Component({
  selector: 'app-kml-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule, // Add ReactiveFormsModule
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
    TooltipModule // Add TooltipModule
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
                  tooltipPosition="top"
                ></p-button>
                <p-button
                  icon="pi pi-pencil"
                  styleClass="p-button-success p-button-sm"
                  (onClick)="openEditDialog(dataset)"
                  pTooltip="Edit"
                  tooltipPosition="top"
                ></p-button>
                <p-button
                  icon="pi pi-trash"
                  styleClass="p-button-danger p-button-sm"
                  (onClick)="confirmDelete(dataset)"
                  pTooltip="Delete"
                  tooltipPosition="top"
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
              } @else if (!loading()) {
                No KML datasets found. Click "New KML Document" to get started.
              } @else {
                <!-- Handled by table loading state or main spinner -->
              }
            </td>
          </tr>
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
            <!-- Use formControlName -->
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
             <small class="p-error block mt-1">Name is required.</small>
           }
        </div>

        <div class="form-group">
          <label for="enabled" class="form-label">Status</label>
          <div class="p-field-checkbox">
             <!-- Use formControlName -->
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
           <!-- Use formControlName -->
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
             <small class="p-error block mt-1">KML content is required.</small>
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
    /* Add :host styles for potential overrides if needed */
    :host {
      display: block;
      padding: 1rem; /* Add some padding around the whole component */
    }

    .kml-list-container {
      /* padding: 0.5rem; Removed, added to :host */
    }

    .loading-container {
      display: flex;
      justify-content: center;
      align-items: center; /* Center vertically too */
      padding: 2rem;
      min-height: 200px; /* Ensure spinner has space */
    }

    .action-buttons {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap; /* Allow wrapping on smaller screens */
    }

    .status-badge {
      border-radius: 4px; /* Slightly more rounded */
      padding: 0.25rem 0.5rem;
      text-transform: uppercase;
      font-weight: 700;
      font-size: 0.75rem;
      letter-spacing: 0.3px;
      display: inline-block; /* Ensure proper spacing */
    }

    .status-enabled {
      background-color: var(--green-100, #C8E6C9); /* Use CSS variables */
      color: var(--green-700, #256029);
    }

    .status-disabled {
      background-color: var(--red-100, #FFCDD2); /* Use CSS variables */
      color: var(--red-700, #C63737);
    }

    .text-center {
      text-align: center;
      padding: 2rem 0;
    }

    .detail-item {
      margin-bottom: 1rem;
      display: flex;
      align-items: flex-start; /* Align top for potentially long values */
      gap: 0.5rem; /* Add gap */
    }

    .detail-label {
      font-weight: 600;
      min-width: 120px; /* Adjust as needed */
      flex-shrink: 0; /* Prevent shrinking */
    }
    .detail-value {
      word-break: break-word; /* Allow long names to wrap */
    }

    .kml-content {
      margin-top: 1.5rem;
    }

    .kml-code-container {
      max-height: 400px;
      overflow: auto;
      background-color: var(--surface-b, #f8f9fa); /* Use CSS variables */
      border-radius: 4px;
      border: 1px solid var(--surface-d, #e9ecef); /* Use CSS variables */
    }

    .kml-code {
      padding: 1rem; /* Slightly more padding */
      white-space: pre-wrap;
      word-wrap: break-word; /* Ensure long lines wrap */
      font-family: var(--font-family-monospace, monospace); /* Use CSS variable */
      color: var(--text-color, #333);
      margin: 0;
      font-size: 0.875rem; /* Slightly smaller for code */
    }

    .form-container {
      /* Add some padding inside the dialog */
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
      color: var(--red-500, #f44336); /* Use CSS variable */
    }

    .kml-textarea {
      font-family: var(--font-family-monospace, monospace); /* Use CSS variable */
      resize: vertical;
      min-height: 150px; /* Minimum height */
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

    .mt-1 {
      margin-top: 0.25rem;
    }

    .block {
      display: block;
    }

    /* PrimeNG Input Validation Highlighting */
    .ng-invalid.ng-dirty {
       border-color: var(--red-500, #f44336);
    }

    /* Utility classes from template */
    .flex { display: flex; }
    .justify-content-between { justify-content: space-between; }
    .align-items-center { align-items: center; }
    .mb-3 { margin-bottom: 1rem; } /* Adjusted to match common spacing */

    .grid { display: flex; flex-wrap: wrap; margin-right: -0.5rem; margin-left: -0.5rem; row-gap: 0.5rem; /* Add row gap */}
    .col-12 { flex: 0 0 100%; padding: 0 0.5rem; max-width: 100%; }

    @media (min-width: 768px) {
      .md\\:col-6 { flex: 0 0 50%; max-width: 50%; }
    }
  `]
})
export class KmlListComponent implements OnInit {
  private kmlDatasetService = inject(KmlDatasetService);
  private confirmationService = inject(ConfirmationService);
  private messageService = inject(MessageService);
  private fb = inject(FormBuilder); // Inject FormBuilder

  // Data signals
  datasets = signal<KmlDataset[]>([]);
  loading = signal<boolean>(false);
  saving = signal<boolean>(false); // Signal for save operation specifically
  error = signal<string | null>(null);

  // Dialog control properties (using standard properties is fine here)
  viewDialogVisible = false;
  formDialogVisible = false;

  // Other signals
  isEditMode = signal<boolean>(false);
  selectedDataset = signal<KmlDataset | null>(null);

  // Reactive Form Group
  kmlForm: FormGroup;

  constructor() {
    this.kmlForm = this.fb.group({
      // id: [null], // We don't edit the ID in the form
      name: ['', Validators.required],
      enabled: [true], // Default value for new entries
      kml: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    this.loadDatasets();
  }

  loadDatasets(): void {
    this.loading.set(true);
    this.error.set(null);
    this.datasets.set([]); // Clear previous data on reload

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
    // No need to clear selectedDataset here if it's only set on open
    // If Edit is clicked from View, openEditDialog will handle it.
    // If just closed, it will be overwritten or unused next time.
  }

  // --- Form Dialog Methods ---
  openNewDialog(): void {
    this.isEditMode.set(false);
    this.selectedDataset.set(null); // Ensure no dataset is selected
    this.kmlForm.reset({
      name: '',
      enabled: true, // Default value
      kml: ''
    });
    this.formDialogVisible = true;
  }

  openEditDialog(dataset: KmlDataset | null): void {
    if (!dataset) return;

    this.isEditMode.set(true);
    this.selectedDataset.set(dataset);
    this.kmlForm.patchValue({ // Use patchValue for flexibility
      name: dataset.name || '',
      enabled: dataset.enabled,
      kml: dataset.kml || ''
    });
    this.formDialogVisible = true;

    // Close view dialog if it's open and we clicked Edit from there
    if (this.viewDialogVisible) {
      this.viewDialogVisible = false;
    }
  }

  closeFormDialog(): void {
    this.formDialogVisible = false;
    // Resetting form state is handled by openNewDialog/openEditDialog
    // Clearing selectedDataset is good practice if dialog closes unexpectedly
    // No timeout needed now
    this.selectedDataset.set(null);
  }

  // --- Save Data Method ---
  saveDataset(): void {
    if (this.kmlForm.invalid) {
      // Mark all fields as touched to display validation errors
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
    const formData = this.kmlForm.value; // Get data from the form group

    if (this.isEditMode() && this.selectedDataset()) {
      const datasetId = this.selectedDataset()?.id;

      if (datasetId) {
        this.kmlDatasetService.update(datasetId, formData).subscribe({
          next: (updatedData) => {
            console.log('KML Dataset updated:', updatedData);
            // Update datasets list immutably
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
        // Should not happen if isEditMode is true and selectedDataset is set
        console.error("Save error: Edit mode is true but dataset ID is missing.");
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Cannot update dataset: ID missing.' });
        this.saving.set(false);
      }
    } else {
      // Create new dataset
      this.kmlDatasetService.create(formData).subscribe({
        next: (newData) => {
          console.log('KML Dataset created:', newData);
          // Add new dataset to the list immutably
          this.datasets.update(currentDatasets =>
            [...currentDatasets, newData] // Add to the end
            // Or use [...currentDatasets, newData].sort(...) if you want to maintain sort order
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
    if (!dataset || dataset.id === undefined) return; // Basic guard

    this.confirmationService.confirm({
      message: `Are you sure you want to delete the KML dataset "${dataset.name}" (ID: ${dataset.id})? This action cannot be undone.`,
      header: 'Confirm Deletion',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      acceptLabel: 'Delete',
      rejectLabel: 'Cancel',
      accept: () => this.deleteKml(dataset.id),
      // reject: () => { // Optional: handle rejection }
    });
  }

  deleteKml(id: number): void {
    this.loading.set(true); // Indicate activity during delete
    this.kmlDatasetService.delete(id).subscribe({
      next: () => {
        // Update datasets list immutably
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
        // If the deleted item was selected, clear selection
        if (this.selectedDataset()?.id === id) {
            this.selectedDataset.set(null);
            this.closeViewDialog(); // Close view dialog if it was showing the deleted item
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
         this.loading.set(false); // Stop indicating activity
      }
    });
  }
}