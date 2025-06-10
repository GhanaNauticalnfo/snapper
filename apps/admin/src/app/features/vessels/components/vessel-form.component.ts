// features/vessel/components/vessel-form.component.ts
import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { VesselDatasetService } from '../services/vessel-dataset.service';
import { VesselDataset } from '../models/vessel-dataset.model';
import { VesselTypeService, VesselType } from '../../settings/services/vessel-type.service';

// PrimeNG imports
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { CheckboxModule } from 'primeng/checkbox';
import { ButtonModule } from 'primeng/button';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { MessageModule } from 'primeng/message';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { CalendarModule } from 'primeng/calendar';
import { InputNumberModule } from 'primeng/inputnumber';

interface VesselFormData {
  name: string;
  vessel_type_id: number;
  last_seen: Date;
  last_position: {
    latitude: number;
    longitude: number;
  };
}

@Component({
  selector: 'app-vessel-form',
  standalone: true,
  imports: [
    CommonModule, 
    RouterModule, 
    FormsModule, 
    CardModule, 
    InputTextModule,
    SelectModule,
    CheckboxModule,
    ButtonModule,
    ProgressSpinnerModule,
    MessageModule,
    ToastModule,
    CalendarModule,
    InputNumberModule
  ],
  providers: [MessageService],
  template: `
    <p-toast></p-toast>
    
    <div class="vessel-form-container">
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
            <div class="flex justify-content-between align-items-center">
              <h2>{{ isEditMode() ? 'Edit Vessel' : 'Create New Vessel' }}</h2>
              <div class="button-group">
                <p-button
                  icon="pi pi-save"
                  label="Save"
                  (onClick)="saveVessel()"
                  styleClass="p-button-success mr-2"
                ></p-button>
                <p-button
                  icon="pi pi-times"
                  label="Cancel"
                  styleClass="p-button-secondary"
                  [routerLink]="['/vessel']"
                ></p-button>
              </div>
            </div>
          </ng-template>
          
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
                  placeholder="Enter a name for the vessel"
                  class="w-full"
                />
              </span>
            </div>
            
            <div class="form-group">
              <label for="vessel_type_id" class="form-label">Type <span class="required-asterisk">*</span></label>
              <p-select
                id="vessel_type_id"
                [(ngModel)]="formData().vessel_type_id"
                [options]="vesselTypes()"
                optionLabel="name"
                optionValue="id"
                placeholder="Select vessel type"
                [style]="{'width':'100%'}"
                [loading]="loadingVesselTypes()"
                appendTo="body"
                [showClear]="false"
                [filter]="false"
              ></p-select>
            </div>
            
            <div class="form-group">
              <label for="last_seen" class="form-label">Last Seen <span class="required-asterisk">*</span></label>
              <p-calendar
                id="last_seen"
                [(ngModel)]="formData().last_seen"
                [showTime]="true"
                [showSeconds]="true"
                dateFormat="yy-mm-dd"
                placeholder="Select date and time"
                [style]="{'width':'100%'}"
              ></p-calendar>
            </div>
            
            <div class="grid">
              <div class="col-12 md:col-6">
                <div class="form-group">
                  <label for="latitude" class="form-label">Latitude <span class="required-asterisk">*</span></label>
                  <p-inputNumber
                    id="latitude"
                    [(ngModel)]="formData().last_position.latitude"
                    [minFractionDigits]="6"
                    [maxFractionDigits]="6"
                    placeholder="Enter latitude"
                    [style]="{'width':'100%'}"
                  ></p-inputNumber>
                </div>
              </div>
              <div class="col-12 md:col-6">
                <div class="form-group">
                  <label for="longitude" class="form-label">Longitude <span class="required-asterisk">*</span></label>
                  <p-inputNumber
                    id="longitude"
                    [(ngModel)]="formData().last_position.longitude"
                    [minFractionDigits]="6"
                    [maxFractionDigits]="6"
                    placeholder="Enter longitude"
                    [style]="{'width':'100%'}"
                  ></p-inputNumber>
                </div>
              </div>
            </div>
          </div>
        </p-card>
      }
    </div>
  `,
  styles: [`
    :host { display: block; }
    .vessel-form-container { margin: 20px 0; }
    
    .loading-container {
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 2rem;
      min-height: 200px;
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

    .button-group {
      display: flex;
      gap: 0.5rem;
    }

    /* Utility classes */
    .w-full { width: 100%; }
    .mr-2 { margin-right: 0.5rem; }
    .ml-2 { margin-left: 0.5rem; }
    .flex { display: flex; }
    .justify-content-between { justify-content: space-between; }
    .align-items-center { align-items: center; }

    .grid { display: flex; flex-wrap: wrap; margin-right: -0.5rem; margin-left: -0.5rem; }
    .col-12 { flex: 0 0 100%; padding: 0 0.5rem; max-width: 100%; }

    @media (min-width: 768px) {
      .md\\:col-6 { flex: 0 0 50%; max-width: 50%; }
    }
  `]
})
export class VesselFormComponent implements OnInit {
  private vesselDatasetService = inject(VesselDatasetService);
  private vesselTypeService = inject(VesselTypeService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private messageService = inject(MessageService);
  
  isEditMode = signal<boolean>(false);
  vessel = signal<VesselDataset | null>(null);
  loading = signal<boolean>(false);
  error = signal<string | null>(null);
  
  vesselTypes = signal<VesselType[]>([]);
  loadingVesselTypes = signal<boolean>(false);
  
  formData = signal<VesselFormData>({
    name: '',
    vessel_type_id: 1, // Default to first vessel type, will be updated when types are loaded
    last_seen: new Date(),
    last_position: {
      latitude: 0,
      longitude: 0
    },
  });

  ngOnInit(): void {
    this.loadVesselTypes();
    
    const id = this.route.snapshot.paramMap.get('id');
    
    if (id) {
      this.isEditMode.set(true);
      this.loadVessel(+id);
    }
  }

  loadVesselTypes(): void {
    this.loadingVesselTypes.set(true);
    
    this.vesselTypeService.getAll().subscribe({
      next: (types) => {
        this.vesselTypes.set(types);
        
        // Set Unspecified vessel type (ID 1) if not in edit mode
        if (!this.isEditMode() && types.length > 0) {
          this.formData.update(current => ({
            ...current,
            vessel_type_id: 1 // Default to Unspecified
          }));
        }
        
        this.loadingVesselTypes.set(false);
      },
      error: (err) => {
        this.loadingVesselTypes.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Load Error',
          detail: 'Failed to load vessel types',
          life: 3000
        });
      }
    });
  }

  updateFormData(partial: Partial<VesselFormData>): void {
    this.formData.update(current => ({
      ...current,
      ...partial
    }));
  }

  loadVessel(id: number): void {
    this.loading.set(true);
    this.error.set(null);
    
    this.vesselDatasetService.getOne(id).subscribe({
      next: (data) => {
        this.vessel.set(data);
        
        this.formData.set({
          name: data.name || '',
          vessel_type_id: data.vessel_type_id || 1, // Now vessel_type_id is properly typed
          last_seen: new Date(data.last_seen),
          last_position: {
            latitude: data.last_position.latitude,
            longitude: data.last_position.longitude
          },
        });
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set('Failed to load vessel. Please try again later.');
        this.loading.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Load Error',
          detail: 'Failed to load vessel data',
          life: 3000
        });
      }
    });
  }

  saveVessel(): void {
    const currentFormData = this.formData();
    
    if (!currentFormData.name || !currentFormData.vessel_type_id) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Validation Error',
        detail: 'Please fill in all required fields',
        life: 3000
      });
      return;
    }
    
    this.loading.set(true);
    this.error.set(null);
    
    if (this.isEditMode() && this.vessel()) {
      this.vesselDatasetService.update(this.vessel()?.id || 0, currentFormData).subscribe({
        next: (data) => {
          this.loading.set(false);
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Vessel updated successfully',
            life: 3000
          });
          this.router.navigate(['/vessel']);
        },
        error: (err) => {
          this.error.set('Failed to update vessel. Please try again later.');
          this.loading.set(false);
          this.messageService.add({
            severity: 'error',
            summary: 'Update Error',
            detail: 'Failed to update vessel data',
            life: 3000
          });
        }
      });
    } else {
      this.vesselDatasetService.create(currentFormData).subscribe({
        next: (data) => {
          this.loading.set(false);
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Vessel created successfully',
            life: 3000
          });
          this.router.navigate(['/vessel']);
        },
        error: (err) => {
          this.error.set('Failed to create vessel. Please try again later.');
          this.loading.set(false);
          this.messageService.add({
            severity: 'error',
            summary: 'Create Error',
            detail: 'Failed to create vessel data',
            life: 3000
          });
        }
      });
    }
  }
}