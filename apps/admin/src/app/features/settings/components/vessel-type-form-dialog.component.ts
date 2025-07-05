import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { ColorPickerModule } from 'primeng/colorpicker';
import { MessageModule } from 'primeng/message';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { VesselTypeService, VesselType } from '../services/vessel-type.service';
import { BoatIconComponent } from '@ghanawaters/shared';

@Component({
  selector: 'app-vessel-type-form-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    DialogModule,
    ButtonModule,
    InputTextModule,
    ColorPickerModule,
    MessageModule,
    ToastModule,
    BoatIconComponent
  ],
  providers: [MessageService],
  template: `
    <p-toast></p-toast>
    
    <p-dialog 
      [(visible)]="visible"
      [modal]="true"
      [style]="{width: '500px'}"
      [closable]="false"
      [appendTo]="'body'">
      
      <ng-template pTemplate="header">
        <div class="flex items-center justify-between w-full">
          <span>{{ vesselType ? 'Edit Vessel Type' : 'Create New Vessel Type' }}</span>
          <button 
            pButton 
            type="button" 
            icon="pi pi-times" 
            class="p-button-text p-button-plain"
            (click)="onCancel()">
          </button>
        </div>
      </ng-template>
      
      <form [formGroup]="vesselTypeForm" class="vessel-type-form">
        <div class="field">
          <label for="vessel-type-name" class="block mb-2">Name <span class="text-red-500">*</span></label>
          <input 
            pInputText 
            id="vessel-type-name"
            formControlName="name" 
            class="w-full"
            placeholder="Enter vessel type name"
            maxlength="30"
            [ngClass]="{'ng-invalid ng-dirty': vesselTypeForm.get('name')?.invalid && vesselTypeForm.get('name')?.touched}"
          />
          @if (vesselTypeForm.get('name')?.invalid && vesselTypeForm.get('name')?.touched) {
            <small class="p-error">Vessel type name is required (max 30 characters)</small>
          }
        </div>

        <div class="field">
          <label class="block mb-2">Color</label>
          <div class="color-picker-section">
            <div class="color-preview">
              <app-boat-icon 
                [color]="vesselTypeForm.get('color')?.value"
                [size]="32"
                [title]="'Color: ' + vesselTypeForm.get('color')?.value">
              </app-boat-icon>
              <span class="color-code">{{ vesselTypeForm.get('color')?.value }}</span>
            </div>
            <p-colorPicker 
              formControlName="color"
              [appendTo]="'body'"
            ></p-colorPicker>
          </div>
        </div>

        @if (errorMessage) {
          <p-message severity="error" [text]="errorMessage" [closable]="false" styleClass="w-full mt-3"></p-message>
        }
      </form>

      <ng-template pTemplate="footer">
        <button 
          pButton 
          type="button" 
          label="Cancel" 
          class="p-button-text"
          (click)="onCancel()">
        </button>
        <button 
          pButton 
          type="button" 
          [label]="vesselType ? 'Update' : 'Create'" 
          icon="pi pi-check"
          [loading]="saving"
          [disabled]="vesselTypeForm.invalid || saving"
          (click)="onSave()">
        </button>
      </ng-template>
    </p-dialog>
  `,
  styles: [`
    .vessel-type-form {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .field {
      display: flex;
      flex-direction: column;
    }

    .color-picker-section {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .color-preview {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem;
      background: var(--surface-50);
      border: 1px solid var(--surface-border);
      border-radius: 6px;
      min-width: 150px;
    }

    .color-code {
      font-family: monospace;
      font-size: 0.875rem;
      color: var(--text-color-secondary);
    }

    .text-red-500 {
      color: var(--red-500);
    }

    .w-full {
      width: 100%;
    }

    .mt-3 {
      margin-top: 0.75rem;
    }

    .p-error {
      color: var(--red-500);
      font-size: 0.75rem;
      margin-top: 0.25rem;
      display: block;
    }
  `]
})
export class VesselTypeFormDialogComponent implements OnChanges {
  private vesselTypeService = inject(VesselTypeService);
  private messageService = inject(MessageService);
  private fb = inject(FormBuilder);

  @Input() visible = false;
  @Input() vesselType: VesselType | null = null;
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() vesselTypeSaved = new EventEmitter<VesselType>();

  vesselTypeForm: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(30)]],
    color: ['#3B82F6', [Validators.required, Validators.pattern(/^#[0-9A-Fa-f]{6}$/)]]
  });

  saving = false;
  errorMessage = '';

  ngOnChanges(changes: SimpleChanges) {
    if (changes['visible'] && changes['visible'].currentValue === true) {
      this.initializeForm();
    }
  }

  private initializeForm() {
    this.errorMessage = '';
    this.saving = false;
    
    if (this.vesselType) {
      this.vesselTypeForm.patchValue({
        name: this.vesselType.name,
        color: this.vesselType.color
      });
    } else {
      this.vesselTypeForm.reset({
        name: '',
        color: '#3B82F6'
      });
    }
  }

  onSave() {
    if (this.vesselTypeForm.invalid) {
      this.vesselTypeForm.markAllAsTouched();
      return;
    }

    const formValue = this.vesselTypeForm.value;
    const name = formValue.name?.trim();
    const color = formValue.color;

    if (!name) {
      this.errorMessage = 'Vessel type name cannot be empty';
      return;
    }

    this.saving = true;
    this.errorMessage = '';

    const operation = this.vesselType
      ? this.vesselTypeService.update(this.vesselType.id, { name, color })
      : this.vesselTypeService.create({ name, color });

    operation.subscribe({
      next: (vesselType) => {
        this.saving = false;
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: `Vessel type ${this.vesselType ? 'updated' : 'created'} successfully`,
          life: 3000
        });
        this.vesselTypeSaved.emit(vesselType);
        this.closeDialog();
      },
      error: (err) => {
        this.saving = false;
        this.errorMessage = err.error?.message || `Failed to ${this.vesselType ? 'update' : 'create'} vessel type`;
        this.messageService.add({
          severity: 'error',
          summary: `${this.vesselType ? 'Update' : 'Create'} Error`,
          detail: this.errorMessage,
          life: 5000
        });
      }
    });
  }

  onCancel() {
    this.closeDialog();
  }

  private closeDialog() {
    this.visible = false;
    this.visibleChange.emit(false);
    this.vesselTypeForm.reset();
    this.errorMessage = '';
    this.saving = false;
  }
}