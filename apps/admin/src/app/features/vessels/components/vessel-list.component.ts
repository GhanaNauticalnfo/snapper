// features/vessels/components/vessel-list.component.ts
import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { VesselDatasetService } from '../services/vessel-dataset.service';
import { VesselDataset } from '../models/vessel-dataset.model';

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
import { DropdownModule } from 'primeng/dropdown';
import { CheckboxModule } from 'primeng/checkbox';
import { TooltipModule } from 'primeng/tooltip';
import { SkeletonModule } from 'primeng/skeleton';
import { CalendarModule } from 'primeng/calendar';
import { InputNumberModule } from 'primeng/inputnumber';

@Component({
  selector: 'app-vessel-list',
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
    DropdownModule,
    CheckboxModule,
    TooltipModule,
    SkeletonModule,
    CalendarModule,
    InputNumberModule
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

    <div class="vessel-list-container">
      <div class="flex justify-content-between align-items-center mb-3">
        <h4>Vessels</h4>
        <div>
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
            <th pSortableColumn="type" style="width: 15%">Type <p-sortIcon field="type"></p-sortIcon></th>
            <th pSortableColumn="last_seen" style="width: 20%">Last Seen <p-sortIcon field="last_seen"></p-sortIcon></th>
            <th pSortableColumn="enabled" style="width: 10%">Enabled <p-sortIcon field="enabled"></p-sortIcon></th>
            <th style="width: 25%">Actions</th>
          </tr>
        </ng-template>

        <ng-template pTemplate="body" let-vessel>
          <tr>
            <td><span class="font-mono">{{ vessel.id }}</span></td>
            <td>{{ vessel.name }}</td>
            <td>
              <span [class]="vessel.type === 'Canoe' ? 'type-badge type-cannoo' : 'type-badge type-vessel'">
                {{ vessel.type }}
              </span>
            </td>
            <td>{{ vessel.last_seen | date:'medium' }}</td>
            <td>
              <span [class]="vessel.enabled ? 'status-badge status-enabled' : 'status-badge status-disabled'">
                {{ vessel.enabled ? 'Yes' : 'No' }}
              </span>
            </td>
            <td>
              <p-button 
                label="View" 
                icon="pi pi-eye" 
                styleClass="p-button-text p-button-sm" 
                (onClick)="openViewDialog(vessel)">
              </p-button>
              <p-button 
                label="Edit" 
                icon="pi pi-pencil" 
                styleClass="p-button-text p-button-sm" 
                (onClick)="openEditDialog(vessel)">
              </p-button>
              <p-button 
                label="Delete" 
                icon="pi pi-trash" 
                styleClass="p-button-text p-button-sm" 
                (onClick)="confirmDelete(vessel)">
              </p-button>
            </td>
          </tr>
        </ng-template>

        <ng-template pTemplate="emptymessage">
          <tr>
            <td colspan="6" class="text-center p-4">
              @if (!loading() && !error()) {
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
      header="View Vessel"
      (onHide)="closeViewDialog()"
    >
      @if (selectedVessel()) {
        <div class="view-dialog-content">
          <div class="grid">
            <div class="col-12 md:col-6">
              <div class="detail-item">
                <span class="detail-label">ID:</span>
                <span class="detail-value">{{ selectedVessel()?.id }}</span>
              </div>
            </div>

            <div class="col-12 md:col-6">
              <div class="detail-item">
                <span class="detail-label">Name:</span>
                <span class="detail-value">{{ selectedVessel()?.name }}</span>
              </div>
            </div>

            <div class="col-12 md:col-6">
              <div class="detail-item">
                <span class="detail-label">Type:</span>
                <span [class]="selectedVessel()?.type === 'Canoe' ? 'type-badge type-cannoo' : 'type-badge type-vessel'">
                  {{ selectedVessel()?.type }}
                </span>
              </div>
            </div>

            <div class="col-12 md:col-6">
              <div class="detail-item">
                <span class="detail-label">Enabled:</span>
                <span [class]="selectedVessel()?.enabled ? 'status-badge status-enabled' : 'status-badge status-disabled'">
                  {{ selectedVessel()?.enabled ? 'Yes' : 'No' }}
                </span>
              </div>
            </div>

            <div class="col-12 md:col-6">
              <div class="detail-item">
                <span class="detail-label">Last Seen:</span>
                <span class="detail-value">{{ selectedVessel()?.last_seen | date:'medium' }}</span>
              </div>
            </div>

            <div class="col-12 md:col-6">
              <div class="detail-item">
                <span class="detail-label">Last Position:</span>
                <span class="detail-value">
                  {{ selectedVessel()?.last_position?.latitude?.toFixed(6) || 'N/A' }}, 
                  {{ selectedVessel()?.last_position?.longitude?.toFixed(6) || 'N/A' }}
                </span>
              </div>
            </div>

            <div class="col-12 md:col-6">
              <div class="detail-item">
                <span class="detail-label">Created:</span>
                <span class="detail-value">{{ selectedVessel()?.created | date:'medium' }}</span>
              </div>
            </div>

            <div class="col-12 md:col-6">
              <div class="detail-item">
                <span class="detail-label">Last Updated:</span>
                <span class="detail-value">{{ selectedVessel()?.last_updated | date:'medium' }}</span>
              </div>
            </div>
          </div>
        </div>
      }

      <ng-template pTemplate="footer">
        <div class="flex justify-content-between">
          <p-button label="Back to List" icon="pi pi-arrow-left" styleClass="p-button-secondary" (onClick)="closeViewDialog()"></p-button>
          <p-button label="Edit" icon="pi pi-pencil" styleClass="p-button-success" (onClick)="openEditDialog(selectedVessel())"></p-button>
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
      [header]="isEditMode() ? 'Edit Vessel' : 'Create New Vessel'"
      (onHide)="closeFormDialog()"
    >
      <form [formGroup]="vesselForm" class="form-container">
        <div class="form-group">
          <label for="name" class="form-label">Name <span class="required-asterisk">*</span></label>
          <span class="p-input-icon-left w-full">
            <i class="pi pi-tag"></i>
            <input
              type="text"
              pInputText
              id="name"
              formControlName="name"
              placeholder="Enter a name for the vessel"
              class="w-full"
              [ngClass]="{'ng-invalid ng-dirty': vesselForm.controls['name'].invalid && vesselForm.controls['name'].touched}"
            />
          </span>
           @if (vesselForm.controls['name'].invalid && vesselForm.controls['name'].touched) {
             <small class="p-error block mt-1">Name is required.</small>
           }
        </div>

        <div class="form-group">
          <label for="type" class="form-label">Type <span class="required-asterisk">*</span></label>
          <p-dropdown
            id="type"
            formControlName="type"
            [options]="vesselTypes"
            optionLabel="label"
            optionValue="value"
            placeholder="Select vessel type"
            [style]="{'width':'100%'}"
            [ngClass]="{'ng-invalid ng-dirty': vesselForm.controls['type'].invalid && vesselForm.controls['type'].touched}"
          ></p-dropdown>
          @if (vesselForm.controls['type'].invalid && vesselForm.controls['type'].touched) {
            <small class="p-error block mt-1">Type is required.</small>
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
      </form>

      <ng-template pTemplate="footer">
        <p-button
          icon="pi pi-save"
          label="Save"
          styleClass="p-button-success mr-2"
          (onClick)="saveVessel()"
          [disabled]="vesselForm.invalid || saving()"
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
    .vessel-list-container { margin-top: 1rem; }
    .font-mono { font-family: monospace; background-color: var(--surface-100); padding: 0.1rem 0.3rem; border-radius: 3px; }
    
    /* PrimeNG datatable styling */
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
    
    .loading-container {
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 2rem;
      min-height: 200px;
    }

    .status-badge, .type-badge {
      border-radius: 4px;
      padding: 0.25rem 0.5rem;
      text-transform: uppercase;
      font-weight: 700;
      font-size: 0.75rem;
      letter-spacing: 0.3px;
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

    .type-cannoo {
      background-color: var(--blue-100, #BBDEFB);
      color: var(--blue-700, #1565C0);
    }

    .type-vessel {
      background-color: var(--orange-100, #FFE0B2);
      color: var(--orange-700, #E65100);
    }

    .detail-item {
      margin-bottom: 1rem;
      display: flex;
      align-items: flex-start;
      gap: 0.5rem;
    }

    .detail-label {
      font-weight: 600;
      min-width: 120px;
      flex-shrink: 0;
    }
    .detail-value {
      word-break: break-word;
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
  `]
})
export class VesselListComponent implements OnInit {
  private vesselDatasetService = inject(VesselDatasetService);
  private confirmationService = inject(ConfirmationService);
  private messageService = inject(MessageService);
  private fb = inject(FormBuilder);

  // Data signals
  datasets = signal<VesselDataset[]>([]);
  loading = signal<boolean>(false);
  saving = signal<boolean>(false);
  error = signal<string | null>(null);

  // Dialog control properties
  viewDialogVisible = false;
  formDialogVisible = false;

  // Other signals
  isEditMode = signal<boolean>(false);
  selectedVessel = signal<VesselDataset | null>(null);

  // Dropdown options
  vesselTypes = [
    { label: 'Canoe', value: 'Canoe' },
    { label: 'Vessel', value: 'Vessel' }
  ];

  // Reactive Form Group
  vesselForm: FormGroup;

  constructor() {
    this.vesselForm = this.fb.group({
      name: ['', Validators.required],
      type: ['', Validators.required],
      enabled: [true]
    });
  }

  ngOnInit(): void {
    this.loadVessels();
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

  // --- View Dialog Methods ---
  openViewDialog(vessel: VesselDataset): void {
    this.selectedVessel.set(vessel);
    this.viewDialogVisible = true;
  }

  closeViewDialog(): void {
    this.viewDialogVisible = false;
  }

  // --- Form Dialog Methods ---
  openNewDialog(): void {
    this.isEditMode.set(false);
    this.selectedVessel.set(null);
    this.vesselForm.reset({
      name: '',
      type: '',
      enabled: true
    });
    this.formDialogVisible = true;
  }

  openEditDialog(vessel: VesselDataset | null): void {
    if (!vessel) return;

    this.isEditMode.set(true);
    this.selectedVessel.set(vessel);
    this.vesselForm.patchValue({
      name: vessel.name || '',
      type: vessel.type,
      enabled: vessel.enabled
    });
    this.formDialogVisible = true;

    if (this.viewDialogVisible) {
      this.viewDialogVisible = false;
    }
  }

  closeFormDialog(): void {
    this.formDialogVisible = false;
    this.selectedVessel.set(null);
  }

  // --- Save Data Method ---
  saveVessel(): void {
    if (this.vesselForm.invalid) {
      this.vesselForm.markAllAsTouched();
      this.messageService.add({
        severity: 'warn',
        summary: 'Validation Error',
        detail: 'Please fill in all required fields correctly.',
        life: 3000
      });
      return;
    }

    this.saving.set(true);
    const formValue = this.vesselForm.value;
    
    // Create the data object
    const vesselData = {
      name: formValue.name,
      type: formValue.type,
      enabled: formValue.enabled
    };

    if (this.isEditMode() && this.selectedVessel()) {
      const vesselId = this.selectedVessel()?.id;

      if (vesselId) {
        this.vesselDatasetService.update(vesselId, vesselData).subscribe({
          next: (updatedData) => {
            console.log('Vessel updated:', updatedData);
            this.datasets.update(currentDatasets =>
              currentDatasets.map(item =>
                item.id === updatedData.id ? updatedData : item
              )
            );
            this.messageService.add({
              severity: 'success',
              summary: 'Success',
              detail: 'Vessel updated successfully',
              life: 3000
            });
            this.closeFormDialog();
          },
          error: (err) => {
            console.error('Error updating vessel:', err);
            this.messageService.add({
              severity: 'error',
              summary: 'Update Error',
              detail: err.error?.message || 'Failed to update vessel',
              life: 5000
            });
          },
          complete: () => {
            this.saving.set(false);
          }
        });
      } else {
        console.error("Save error: Edit mode is true but vessel ID is missing.");
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Cannot update vessel: ID missing.' });
        this.saving.set(false);
      }
    } else {
      this.vesselDatasetService.create(vesselData).subscribe({
        next: (newData) => {
          console.log('Vessel created:', newData);
          this.datasets.update(currentDatasets =>
            [...currentDatasets, newData]
          );
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Vessel created successfully',
            life: 3000
          });
          this.closeFormDialog();
        },
        error: (err) => {
          console.error('Error creating vessel:', err);
          this.messageService.add({
            severity: 'error',
            summary: 'Create Error',
            detail: err.error?.message || 'Failed to create vessel',
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
  confirmDelete(vessel: VesselDataset): void {
    if (!vessel || vessel.id === undefined) return;

    this.confirmationService.confirm({
      message: `Are you sure you want to delete the vessel "${vessel.name}" (ID: ${vessel.id})? This action cannot be undone.`,
      header: 'Confirm Deletion',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      acceptLabel: 'Delete',
      rejectLabel: 'Cancel',
      accept: () => this.deleteVessel(vessel.id),
    });
  }

  deleteVessel(id: number): void {
    this.loading.set(true);
    this.vesselDatasetService.delete(id).subscribe({
      next: () => {
        this.datasets.update(currentDatasets =>
          currentDatasets.filter(vessel => vessel.id !== id)
        );
        console.log('Vessel deleted:', id);
        this.messageService.add({
          severity: 'success',
          summary: 'Deleted',
          detail: 'Vessel deleted successfully',
          life: 3000
        });
        if (this.selectedVessel()?.id === id) {
            this.selectedVessel.set(null);
            this.closeViewDialog();
        }
      },
      error: (err) => {
        console.error('Error deleting vessel:', err);
        this.messageService.add({
          severity: 'error',
          summary: 'Delete Error',
          detail: err.error?.message || 'Failed to delete vessel',
          life: 5000
        });
      },
      complete: () => {
         this.loading.set(false);
      }
    });
  }
}