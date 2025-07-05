import { Component, Input, Output, EventEmitter, signal, OnInit, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { VesselDataset } from '../models/vessel-dataset.model';
import { VesselDatasetService } from '../services/vessel-dataset.service';
import { VesselTypeService, VesselType } from '../../settings/services/vessel-type.service';
import { MessageService } from 'primeng/api';

// PrimeNG imports
import { ButtonModule } from 'primeng/button';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { CheckboxModule } from 'primeng/checkbox';
import { DividerModule } from 'primeng/divider';

@Component({
  selector: 'app-vessel-tab-info',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonModule,
    ProgressSpinnerModule,
    InputTextModule,
    SelectModule,
    CheckboxModule,
    DividerModule
  ],
  template: `
    <div class="view-dialog-content">
      @if (!vessel) {
        <!-- Create New Vessel Section -->
        <div class="vessel-create-section">
          <h5 class="section-title">Create New Vessel</h5>
          <form [formGroup]="vesselForm" class="vessel-create-form">
            <div class="create-rows">
              <!-- Name -->
              <div class="create-row">
                <label class="field-label">Name <span class="required-asterisk">*</span></label>
                <div class="field-content">
                  <input 
                    type="text" 
                    pInputText 
                    formControlName="name" 
                    class="field-input"
                    placeholder="Enter vessel name"
                    [ngClass]="{'ng-invalid ng-dirty': vesselForm.controls['name'].invalid && vesselForm.controls['name'].touched}"
                  />
                  @if (vesselForm.controls['name'].invalid && vesselForm.controls['name'].touched) {
                    <small class="p-error">Name is required.</small>
                  }
                </div>
              </div>

              <!-- Type -->
              <div class="create-row">
                <label for="vessel-type-create" class="field-label">Type <span class="required-asterisk">*</span></label>
                <div class="field-content">
                  <p-select
                    id="vessel-type-create"
                    formControlName="vessel_type_id"
                    [options]="vesselTypes()"
                    optionLabel="label"
                    optionValue="value"
                    placeholder="Select vessel type"
                    class="inline-dropdown"
                    appendTo="body"
                    [showClear]="false"
                    [filter]="false"
                    [ngClass]="{'ng-invalid ng-dirty': vesselForm.controls['vessel_type_id'].invalid && vesselForm.controls['vessel_type_id'].touched}"
                  ></p-select>
                  @if (vesselForm.controls['vessel_type_id'].invalid && vesselForm.controls['vessel_type_id'].touched) {
                    <small class="p-error">Type is required.</small>
                  }
                </div>
              </div>
            </div>
            
            <div class="create-actions">
              <p-button 
                label="Create Vessel" 
                icon="pi pi-save"
                styleClass="p-button-success"
                (onClick)="createVessel()"
                [loading]="savingVessel()"
                [disabled]="vesselForm.invalid"
              ></p-button>
              <p-button 
                label="Cancel" 
                icon="pi pi-times"
                styleClass="p-button-secondary"
                (onClick)="cancelCreate()"
                [disabled]="savingVessel()"
              ></p-button>
            </div>
          </form>
        </div>
      } @else {
        <!-- Edit Existing Vessel Section -->
        <div class="vessel-info-section">
        <form [formGroup]="vesselForm" class="vessel-details-form">
          <div class="info-rows">
            <!-- Name with rename button -->
            <div class="info-row">
              <label class="field-label">Name</label>
              <div class="field-content">
                <input 
                  type="text" 
                  pInputText 
                  formControlName="name" 
                  class="field-input"
                  placeholder="Enter vessel name"
                />
                <p-button 
                  label="Rename" 
                  styleClass="p-button-sm"
                  (onClick)="saveName()"
                  [loading]="savingName()"
                ></p-button>
                @if (nameUpdateStatus() === 'success') {
                  <i class="pi pi-check status-icon success-icon"></i>
                } @else if (nameUpdateStatus() === 'error') {
                  <i class="pi pi-times status-icon error-icon"></i>
                }
              </div>
            </div>

            <!-- Type -->
            <div class="info-row">
              <label for="vessel-type" class="field-label">Type</label>
              <div class="field-content">
                <p-select
                  id="vessel-type"
                  formControlName="vessel_type_id"
                  [options]="vesselTypes()"
                  optionLabel="label"
                  optionValue="value"
                  placeholder="Select type"
                  class="inline-dropdown"
                  appendTo="body"
                  [showClear]="false"
                  [filter]="false"
                  (onChange)="updateType()"
                ></p-select>
                @if (typeUpdateStatus() === 'saving') {
                  <p-progressSpinner styleClass="status-spinner"></p-progressSpinner>
                } @else if (typeUpdateStatus() === 'success') {
                  <i class="pi pi-check status-icon success-icon"></i>
                } @else if (typeUpdateStatus() === 'error') {
                  <i class="pi pi-times status-icon error-icon"></i>
                }
              </div>
            </div>

            <!-- Created -->
            <div class="info-row">
              <label class="field-label">Created</label>
              <div class="field-content">
                <span class="field-value readonly">{{ vessel?.created | date:'dd/MM/yyyy HH:mm:ss' }}</span>
              </div>
            </div>
          </div>
        </form>
        </div>
      }
    </div>
  `,
  styles: [`
    /* Section styling */
    .vessel-info-section {
      margin-bottom: 1.5rem;
      overflow: visible;
    }
    
    .section-title {
      margin: 0 0 1rem 0;
      color: var(--text-color);
      font-size: 1.1rem;
      font-weight: 600;
    }
    
    /* Info rows layout */
    .info-rows {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    
    .info-row {
      display: flex;
      align-items: center;
      gap: 1rem;
    }
    
    .field-label {
      font-weight: 600;
      font-size: 0.875rem;
      color: var(--text-color);
      min-width: 80px;
      flex-shrink: 0;
    }
    
    .field-content {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex: 1;
    }
    
    .field-value {
      font-size: 0.875rem;
      color: var(--text-color);
    }
    
    .field-value.readonly {
      color: var(--text-color-secondary);
      font-style: italic;
    }
    
    /* Field input styles */
    .field-input {
      width: 200px;
      height: 32px;
      padding: 0 0.5rem;
      border: 1px solid var(--surface-border);
      border-radius: 4px;
      background: var(--surface-card);
      color: var(--text-color);
      font-size: 0.875rem;
    }
    
    .field-input:focus {
      border-color: var(--primary-color);
      box-shadow: 0 0 0 2px var(--primary-color-transparent);
      outline: none;
    }
    
    .inline-dropdown {
      flex: 1;
      max-width: 200px;
    }
    
    .checkbox-wrapper {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    
    .checkbox-label {
      font-size: 0.875rem;
      color: var(--text-color);
      margin: 0;
    }
    
    /* Status indicators */
    .status-icon {
      font-size: 1rem;
      margin-left: 0.5rem;
    }
    
    .success-icon {
      color: var(--green-500);
    }
    
    .error-icon {
      color: var(--red-500);
    }
    
    .status-spinner {
      width: 16px !important;
      height: 16px !important;
      margin-left: 0.5rem;
    }
    
    /* Create vessel section */
    .vessel-create-section {
      margin-bottom: 1.5rem;
      overflow: visible;
    }
    
    .create-rows {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      margin-bottom: 1.5rem;
    }
    
    .create-row {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    
    .required-asterisk {
      color: var(--red-500, #f44336);
    }
    
    .create-actions {
      display: flex;
      gap: 0.75rem;
      align-items: center;
      padding-top: 1rem;
      border-top: 1px solid var(--surface-border);
    }
    
    .p-error {
      color: var(--red-500);
      font-size: 0.75rem;
      margin-top: 0.25rem;
      display: block;
    }
  `]
})
export class VesselTabInfoComponent implements OnInit, OnChanges {
  @Input() vessel: VesselDataset | null = null;
  @Output() vesselUpdated = new EventEmitter<VesselDataset>();
  @Output() vesselCreated = new EventEmitter<VesselDataset>();
  @Output() createCancelled = new EventEmitter<void>();

  vesselForm: FormGroup;
  
  // Status signals
  savingName = signal(false);
  savingVessel = signal(false);
  nameUpdateStatus = signal<'idle' | 'saving' | 'success' | 'error'>('idle');
  typeUpdateStatus = signal<'idle' | 'saving' | 'success' | 'error'>('idle');
  
  // Vessel types
  vesselTypes = signal<Array<{label: string, value: number}>>([]);

  constructor(
    private fb: FormBuilder,
    private vesselDatasetService: VesselDatasetService,
    private vesselTypeService: VesselTypeService,
    private messageService: MessageService
  ) {
    this.vesselForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(1)]],
      vessel_type_id: [null, [Validators.required]],
    });
  }

  ngOnInit() {
    this.loadVesselTypes();
    if (this.vessel) {
      this.populateForm();
    } else {
      this.resetFormForCreation();
    }
  }

  ngOnChanges() {
    if (this.vessel) {
      this.populateForm();
    } else {
      this.resetFormForCreation();
    }
  }

  /**
   * Comprehensive form reset for vessel creation mode
   * Ensures all form state is cleared and properly initialized
   */
  private resetFormForCreation() {
    // Reset all status signals first to ensure clean state
    this.savingName.set(false);
    this.savingVessel.set(false);
    this.nameUpdateStatus.set('idle');
    this.typeUpdateStatus.set('idle');
    
    // Clear all form state including validation errors
    this.vesselForm.reset();
    
    // Set default values for new vessel creation
    this.vesselForm.patchValue({
      name: '',
      vessel_type_id: null, // Start with null to ensure form is invalid
    });
    
    // Mark all fields as untouched and pristine to clear validation state
    this.vesselForm.markAsUntouched();
    this.vesselForm.markAsPristine();
    
    // Clear any individual field errors and validation states
    Object.keys(this.vesselForm.controls).forEach(key => {
      const control = this.vesselForm.get(key);
      if (control) {
        control.setErrors(null);
        control.markAsUntouched();
        control.markAsPristine();
      }
    });
  }

  private populateForm() {
    if (this.vessel) {
      this.vesselForm.patchValue({
        name: this.vessel.name,
        vessel_type_id: this.vessel.vessel_type_id || 1, // Default to 1 (Unspecified) if not set
      });
    }
  }

  private loadVesselTypes() {
    this.vesselTypeService.getAll().subscribe({
      next: (types: VesselType[]) => {
        this.vesselTypes.set(types.map(type => ({
          label: type.name,
          value: type.id
        })));
      },
      error: (error: any) => {
        console.error('Error loading vessel types:', error);
      }
    });
  }

  saveName() {
    if (!this.vessel || this.vesselForm.get('name')?.invalid) return;
    
    this.savingName.set(true);
    this.nameUpdateStatus.set('saving');
    
    const updatedData = { name: this.vesselForm.get('name')?.value };
    
    this.vesselDatasetService.update(this.vessel.id, updatedData).subscribe({
      next: (vessel: VesselDataset) => {
        this.nameUpdateStatus.set('success');
        this.vesselUpdated.emit(vessel);
        setTimeout(() => this.nameUpdateStatus.set('idle'), 2000);
      },
      error: (error: any) => {
        console.error('Error updating vessel name:', error);
        this.nameUpdateStatus.set('error');
        setTimeout(() => this.nameUpdateStatus.set('idle'), 2000);
      },
      complete: () => {
        this.savingName.set(false);
      }
    });
  }

  updateType() {
    if (!this.vessel) return;
    
    const selectedTypeId = this.vesselForm.get('vessel_type_id')?.value;
    if (selectedTypeId === null || selectedTypeId === undefined) return;
    
    this.typeUpdateStatus.set('saving');
    
    this.vesselDatasetService.update(this.vessel.id, { 
      vessel_type_id: selectedTypeId 
    }).subscribe({
      next: (vessel: VesselDataset) => {
        this.typeUpdateStatus.set('success');
        this.vesselUpdated.emit(vessel);
        setTimeout(() => this.typeUpdateStatus.set('idle'), 2000);
      },
      error: (error: any) => {
        console.error('Error updating vessel type:', error);
        this.typeUpdateStatus.set('error');
        setTimeout(() => this.typeUpdateStatus.set('idle'), 2000);
      }
    });
  }

  createVessel() {
    // Double-check form validity before proceeding
    const nameValue = this.vesselForm.get('name')?.value?.trim();
    const typeValue = this.vesselForm.get('vessel_type_id')?.value;
    
    if (this.vesselForm.invalid || !nameValue || !typeValue) {
      this.vesselForm.markAllAsTouched();
      this.messageService.add({
        severity: 'warn',
        summary: 'Validation Error',
        detail: 'Please fill in all required fields correctly.',
        life: 3000
      });
      // Ensure loading state is not set if validation fails
      this.savingVessel.set(false);
      return;
    }

    // Only set loading state after validation passes
    this.savingVessel.set(true);
    const formValue = this.vesselForm.value;
    
    const vesselData = {
      name: formValue.name,
      vessel_type_id: formValue.vessel_type_id,
    };

    this.vesselDatasetService.create(vesselData).subscribe({
      next: (newVessel) => {
        console.log('Vessel created:', newVessel);
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Vessel created successfully',
          life: 3000
        });
        
        // Reset form after successful creation to prepare for potential next creation
        this.resetFormForCreation();
        
        this.vesselCreated.emit(newVessel);
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
        this.savingVessel.set(false);
      }
    });
  }

  /**
   * Public method to reset form for creation mode
   * Can be called by parent components to ensure clean state
   */
  public resetToCreateMode() {
    this.resetFormForCreation();
  }

  cancelCreate() {
    this.createCancelled.emit();
  }

}