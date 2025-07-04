import { Component, OnInit, inject, signal, ViewChild, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

// PrimeNG imports
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { CardModule } from 'primeng/card';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ColorPickerModule, ColorPicker } from 'primeng/colorpicker';
import { MessageService, ConfirmationService } from 'primeng/api';

import { VesselTypeService, VesselType } from '../services/vessel-type.service';
import { BoatIconComponent } from '@ghanawaters/shared';

@Component({
  selector: 'app-vessel-type-detail',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonModule,
    InputTextModule,
    MessageModule,
    ToastModule,
    ConfirmDialogModule,
    CardModule,
    ProgressSpinnerModule,
    ColorPickerModule,
    BoatIconComponent
  ],
  providers: [MessageService, ConfirmationService],
  template: `
    <p-toast></p-toast>
    <p-confirmDialog></p-confirmDialog>
    
    <div class="vessel-type-form-container">
      @if (loading()) {
        <div class="loading-container">
          <p-progressSpinner></p-progressSpinner>
        </div>
      }
      
      @if (error()) {
        <p-message severity="error" [text]="error() || ''" styleClass="w-full"></p-message>
      }
      
      @if (!loading()) {
        <p-card>
          <ng-template pTemplate="title">
            <div class="flex justify-between items-center">
              <h2>{{ vesselType()?.id === 0 ? 'Create New Vessel Type' : 'Vessel Type Details' }}</h2>
              <div class="button-group">
                @if (vesselType()?.id !== 0 && vesselType()?.id !== 1) {
                  <p-button
                    icon="pi pi-trash"
                    label="Delete"
                    styleClass="p-button-outlined p-button-danger mr-2"
                    (onClick)="confirmDelete()"
                  ></p-button>
                }
                <p-button
                  icon="pi pi-arrow-left"
                  label="Back"
                  styleClass="p-button-text"
                  (onClick)="goBack()"
                ></p-button>
              </div>
            </div>
          </ng-template>
          
          <div class="vessel-type-info-section">
            <h5 class="section-title">Vessel Type Information</h5>
            <form [formGroup]="vesselTypeForm" class="vessel-type-details-form">
              <div class="info-rows">
                <!-- Name with rename button -->
                <div class="info-row">
                  <label class="field-label">Name</label>
                  @if (vesselType()?.id === 1) {
                    <!-- Read-only display for Unspecified vessel type -->
                    <div class="field-content">
                      <span class="field-value readonly-name">{{ vesselType()?.name }}</span>
                    </div>
                  } @else {
                    <!-- Editable input for other vessel types -->
                    <div class="field-content">
                      <input 
                        type="text" 
                        pInputText 
                        formControlName="name" 
                        class="field-input"
                        placeholder="Enter vessel type name"
                        maxlength="30"
                      />
                      <p-button 
                        [label]="vesselType()?.id === 0 ? 'Create' : 'Rename'" 
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
                  }
                </div>

                <!-- Color picker -->
                <div class="info-row">
                  <label class="field-label">Color</label>
                  <div class="field-content">
                    <div class="color-comparison-wrapper">
                      <!-- Current saved color -->
                      <div class="color-section">
                        <span class="color-label">Current</span>
                        <div class="boat-icon-wrapper saved-color">
                          <app-boat-icon 
                            [color]="vesselType()?.color || '#3B82F6'"
                            [size]="32"
                            [title]="'Saved color: ' + vesselType()?.color">
                          </app-boat-icon>
                        </div>
                        <span class="color-code">{{ vesselType()?.color }}</span>
                      </div>
                      
                      <!-- Arrow indicator -->
                      @if (hasColorChanged()) {
                        <div class="color-arrow">
                          <i class="pi pi-arrow-right"></i>
                        </div>
                      }
                      
                      <!-- New selected color -->
                      @if (hasColorChanged()) {
                        <div class="color-section">
                          <span class="color-label">New</span>
                          <div class="boat-icon-wrapper new-color">
                            <app-boat-icon 
                              [color]="vesselTypeForm.get('color')?.value"
                              [size]="32"
                              cssClass="boat-icon-highlight"
                              [title]="'New color: ' + vesselTypeForm.get('color')?.value">
                            </app-boat-icon>
                          </div>
                          <span class="color-code">{{ vesselTypeForm.get('color')?.value }}</span>
                        </div>
                      }
                    </div>
                    
                    <div class="color-controls">
                      <p-colorPicker 
                        #vesselColorPicker
                        formControlName="color"
                        appendTo="body"
                        [disabled]="vesselType()?.id === 1"
                      ></p-colorPicker>
                      
                      @if (hasColorChanged()) {
                        <p-button 
                          label="Update Color" 
                          styleClass="p-button-sm"
                          (onClick)="saveColor()"
                          [loading]="savingColor()"
                          [disabled]="vesselType()?.id === 1 || vesselType()?.id === 0"
                        ></p-button>
                        
                        <p-button 
                          label="Reset" 
                          styleClass="p-button-sm p-button-outlined"
                          (onClick)="resetColor()"
                          [disabled]="vesselType()?.id === 1 || vesselType()?.id === 0"
                        ></p-button>
                      }
                      
                      @if (colorUpdateStatus() === 'success') {
                        <i class="pi pi-check status-icon success-icon"></i>
                      } @else if (colorUpdateStatus() === 'error') {
                        <i class="pi pi-times status-icon error-icon"></i>
                      }
                    </div>
                  </div>
                </div>

                @if (vesselType()?.id !== 0) {
                  <!-- Vessels Using This Type -->
                  <div class="info-row">
                    <label class="field-label">Vessels Using This Type</label>
                    <div class="field-content">
                      <span class="field-value">{{ vesselType()?.vessel_count || 0 }}</span>
                    </div>
                  </div>
                }

                @if (vesselType()?.id === 1) {
                  <div class="system-note">
                    <p-message severity="info" text="This is the default vessel type that cannot be edited or deleted." styleClass="w-full"></p-message>
                  </div>
                }
              </div>
            </form>
          </div>
        </p-card>
      }
    </div>
  `,
  styles: [`
    :host { display: block; }
    .vessel-type-form-container { margin: 20px 0; }
    
    .loading-container {
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 2rem;
      min-height: 200px;
    }

    .button-group {
      display: flex;
      gap: 0.5rem;
    }

    .vessel-type-info-section {
      margin-top: 1rem;
    }

    .section-title {
      font-size: 1.125rem;
      font-weight: 600;
      margin-bottom: 1rem;
      color: var(--text-color);
    }

    .vessel-type-details-form {
      width: 100%;
    }

    .info-rows {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .info-row {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .field-label {
      font-weight: 500;
      color: var(--text-color);
      font-size: 0.875rem;
    }

    .field-content {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .field-input {
      width: 300px;
      max-width: 100%;
    }

    .field-value {
      padding: 0.5rem 0.75rem;
      background: var(--surface-50);
      border-radius: 4px;
      color: var(--text-color);
    }

    .readonly-name {
      font-weight: 500;
      padding: 0.75rem;
      background: var(--surface-100);
      border: 1px solid var(--surface-border);
      border-radius: 6px;
      min-width: 200px;
    }

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

    .system-note {
      margin-top: 1rem;
    }

    .color-comparison-wrapper {
      display: flex;
      align-items: center;
      gap: 1rem;
      margin-bottom: 1rem;
      padding: 1rem;
      background: var(--surface-50);
      border-radius: 6px;
      border: 1px solid var(--surface-border);
    }

    .color-section {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.5rem;
    }

    .color-label {
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--text-color-secondary);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .boat-icon-wrapper {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 48px;
      height: 48px;
      border-radius: 8px;
      border: 2px solid var(--surface-border);
      background: var(--surface-0);
      transition: all 0.2s;
    }

    .saved-color {
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }

    .new-color {
      box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);
      border-color: var(--primary-color);
      background: var(--primary-50);
    }

    .color-code {
      font-family: monospace;
      font-size: 0.75rem;
      color: var(--text-color-secondary);
      font-weight: 500;
    }

    .color-arrow {
      display: flex;
      align-items: center;
      color: var(--primary-color);
      font-size: 1.25rem;
      margin: 0 0.5rem;
    }

    .color-controls {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    /* Utility classes */
    .w-full { width: 100%; }
    .mr-2 { margin-right: 0.5rem; }
    .ml-2 { margin-left: 0.5rem; }
    .flex { display: flex; }
    .justify-content-between { justify-content: space-between; }
    .align-items-center { align-items: center; }

    @media (max-width: 768px) {
      .button-group {
        flex-direction: column;
        align-items: stretch;
      }
      
      .button-group p-button {
        margin-bottom: 0.5rem;
      }

      .field-content {
        flex-direction: column;
        align-items: stretch;
        gap: 0.5rem;
      }
    }
  `]
})
export class VesselTypeDetailComponent implements OnInit, OnDestroy {
  @ViewChild('vesselColorPicker') vesselColorPicker!: ColorPicker;
  private vesselTypeService = inject(VesselTypeService);
  private messageService = inject(MessageService);
  private confirmationService = inject(ConfirmationService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private fb = inject(FormBuilder);

  vesselType = signal<VesselType | null>(null);
  loading = signal<boolean>(false);
  error = signal<string | null>(null);
  savingName = signal<boolean>(false);
  nameUpdateStatus = signal<'success' | 'error' | null>(null);
  savingColor = signal<boolean>(false);
  colorUpdateStatus = signal<'success' | 'error' | null>(null);

  vesselTypeForm: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(30)]],
    color: ['#3B82F6', [Validators.required, Validators.pattern(/^#[0-9A-Fa-f]{6}$/)]]
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id === 'new') {
      // Creating a new vessel type
      this.vesselType.set({
        id: 0,
        name: '',
        color: '#3B82F6',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        vessel_count: 0
      });
      this.vesselTypeForm.patchValue({ name: '', color: '#3B82F6' });
    } else if (id) {
      this.loadVesselType(parseInt(id));
    } else {
      this.error.set('Invalid vessel type ID');
    }
  }

  ngOnDestroy(): void {
    // Close color picker if it's open when navigating away
    if (this.vesselColorPicker && this.vesselColorPicker.overlayVisible) {
      this.vesselColorPicker.overlayVisible = false;
    }
  }

  loadVesselType(id: number): void {
    this.loading.set(true);
    this.error.set(null);

    this.vesselTypeService.getOne(id).subscribe({
      next: (data) => {
        this.vesselType.set(data);
        this.vesselTypeForm.patchValue({ name: data.name, color: data.color });
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set('Failed to load vessel type details. Please try again later.');
        this.loading.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Load Error',
          detail: 'Failed to load vessel type details',
          life: 3000
        });
      }
    });
  }

  goBack(): void {
    // Close color picker if it's open before navigating
    if (this.vesselColorPicker && this.vesselColorPicker.overlayVisible) {
      this.vesselColorPicker.overlayVisible = false;
    }
    this.router.navigate(['/settings']);
  }

  saveName(): void {
    const current = this.vesselType();
    
    if (!current) {
      return;
    }

    // Prevent editing the default vessel type (but allow creating new ones)
    if (current.id === 1) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Not Allowed',
        detail: 'Cannot edit the default vessel type',
        life: 3000
      });
      return;
    }

    if (this.vesselTypeForm.invalid) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Validation Error',
        detail: 'Please enter a valid vessel type name',
        life: 3000
      });
      return;
    }

    const name = this.vesselTypeForm.get('name')?.value?.trim();
    
    if (!name) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Validation Error',
        detail: 'Vessel type name cannot be empty',
        life: 3000
      });
      return;
    }

    this.savingName.set(true);
    this.nameUpdateStatus.set(null);

    const isCreating = current.id === 0;
    const color = this.vesselTypeForm.get('color')?.value;
    const operation = isCreating 
      ? this.vesselTypeService.create({ name, color })
      : this.vesselTypeService.update(current.id, { name });

    operation.subscribe({
      next: (vesselType) => {
        this.vesselType.set(vesselType);
        this.savingName.set(false);
        this.nameUpdateStatus.set('success');
        
        // Clear status after 3 seconds
        setTimeout(() => this.nameUpdateStatus.set(null), 3000);
        
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: `Vessel type ${isCreating ? 'created' : 'updated'} successfully`,
          life: 3000
        });
        
        // If we were creating a new vessel type, navigate to the created one
        if (isCreating && vesselType.id) {
          this.router.navigate(['/settings/vessel-types', vesselType.id], { replaceUrl: true });
        }
      },
      error: (err) => {
        this.savingName.set(false);
        this.nameUpdateStatus.set('error');
        
        // Clear status after 3 seconds
        setTimeout(() => this.nameUpdateStatus.set(null), 3000);
        
        const detail = err.error?.message || `Failed to ${isCreating ? 'create' : 'update'} vessel type`;
        this.messageService.add({
          severity: 'error',
          summary: `${isCreating ? 'Create' : 'Update'} Error`,
          detail,
          life: 3000
        });
      }
    });
  }

  saveColor(): void {
    const current = this.vesselType();
    
    if (!current || current.id === 0) {
      return;
    }

    // Prevent editing the default vessel type color
    if (current.id === 1) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Not Allowed',
        detail: 'Cannot change the color of the default vessel type',
        life: 3000
      });
      return;
    }

    if (this.vesselTypeForm.get('color')?.invalid) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Validation Error',
        detail: 'Please enter a valid color',
        life: 3000
      });
      return;
    }

    const color = this.vesselTypeForm.get('color')?.value;
    
    if (color === current.color) {
      return; // No change
    }

    this.savingColor.set(true);
    this.colorUpdateStatus.set(null);

    this.vesselTypeService.update(current.id, { name: current.name, color }).subscribe({
      next: (vesselType) => {
        this.vesselType.set(vesselType);
        // Update form to match the saved color (this will hide the comparison)
        this.vesselTypeForm.patchValue({ color: vesselType.color });
        this.savingColor.set(false);
        this.colorUpdateStatus.set('success');
        
        // Clear status after 3 seconds
        setTimeout(() => this.colorUpdateStatus.set(null), 3000);
        
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Vessel type color updated successfully',
          life: 3000
        });
      },
      error: (err) => {
        this.savingColor.set(false);
        this.colorUpdateStatus.set('error');
        
        // Clear status after 3 seconds
        setTimeout(() => this.colorUpdateStatus.set(null), 3000);
        
        const detail = err.error?.message || 'Failed to update vessel type color';
        this.messageService.add({
          severity: 'error',
          summary: 'Update Error',
          detail,
          life: 3000
        });
      }
    });
  }

  hasColorChanged(): boolean {
    const current = this.vesselType();
    const formColor = this.vesselTypeForm.get('color')?.value;
    
    if (!current || !formColor) {
      return false;
    }
    
    return current.color !== formColor;
  }

  resetColor(): void {
    const current = this.vesselType();
    if (current) {
      this.vesselTypeForm.patchValue({ color: current.color });
      this.colorUpdateStatus.set(null);
    }
  }

  confirmDelete(): void {
    const current = this.vesselType();
    
    if (!current || current.id === 1) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Not Allowed',
        detail: 'Cannot delete the default vessel type',
        life: 3000
      });
      return;
    }
    
    const vesselCount = current.vessel_count || 0;
    const message = vesselCount > 0 
      ? `Are you sure you want to delete "${current.name}"? ${vesselCount} vessel(s) will be moved to "Unspecified".`
      : `Are you sure you want to delete "${current.name}"?`;

    this.confirmationService.confirm({
      message,
      header: 'Delete Confirmation',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.deleteVesselType(current.id);
      }
    });
  }

  deleteVesselType(id: number): void {
    this.vesselTypeService.delete(id).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Vessel type deleted successfully',
          life: 3000
        });
        this.router.navigate(['/settings']);
      },
      error: (err) => {
        const detail = err.error?.message || 'Failed to delete vessel type';
        this.messageService.add({
          severity: 'error',
          summary: 'Delete Error',
          detail,
          life: 3000
        });
      }
    });
  }
}