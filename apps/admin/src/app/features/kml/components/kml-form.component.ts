// features/kml/components/kml-form.component.ts
import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { KmlDatasetService } from '../services/kml-dataset.service';
import { KmlDataset } from '../models/kml-dataset.model';

// PrimeNG imports
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea'; // Updated to TextareaModule
import { CheckboxModule } from 'primeng/checkbox';
import { ButtonModule } from 'primeng/button';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { MessageModule } from 'primeng/message';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

interface KmlFormData {
  name: string;
  enabled: boolean;
  kml: string;
}

@Component({
  selector: 'app-kml-form',
  standalone: true,
  imports: [
    CommonModule, 
    RouterModule, 
    FormsModule, 
    CardModule, 
    InputTextModule,
    TextareaModule, // Updated to TextareaModule
    CheckboxModule,
    ButtonModule,
    ProgressSpinnerModule,
    MessageModule,
    ToastModule
  ],
  providers: [MessageService],
  template: `
    <p-toast></p-toast>
    
    <div class="kml-form-container">
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
              <h2>{{ isEditMode() ? 'Edit KML Dataset' : 'Create New KML Dataset' }}</h2>
              <div class="button-group">
                <p-button
                  icon="pi pi-save"
                  label="Save"
                  (onClick)="saveDataset()"
                  styleClass="p-button-success mr-2"
                ></p-button>
                <p-button
                  icon="pi pi-times"
                  label="Cancel"
                  styleClass="p-button-secondary"
                  [routerLink]="['/kml']"
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
        </p-card>
      }
    </div>
  `,
  // styles unchanged
})
export class KmlFormComponent implements OnInit {
  private kmlDatasetService = inject(KmlDatasetService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  
  isEditMode = signal<boolean>(false);
  dataset = signal<KmlDataset | null>(null);
  loading = signal<boolean>(false);
  error = signal<string | null>(null);
  
  formData = signal<KmlFormData>({
    name: '',
    enabled: true,
    kml: ''
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    
    if (id) {
      this.isEditMode.set(true);
      this.loadDataset(+id);
    }
  }

  updateFormData(partial: Partial<KmlFormData>): void {
    this.formData.update(current => ({
      ...current,
      ...partial
    }));
  }

  loadDataset(id: number): void {
    this.loading.set(true);
    this.error.set(null);
    
    this.kmlDatasetService.getOne(id).subscribe({
      next: (data) => {
        this.dataset.set(data);
        this.formData.set({
          name: data.name || '',
          enabled: data.enabled,
          kml: data.kml || ''
        });
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set('Failed to load KML dataset. Please try again later.');
        this.loading.set(false);
      }
    });
  }

  saveDataset(): void {
    const currentFormData = this.formData();
    
    if (!currentFormData.name || !currentFormData.kml) {
      alert('Please fill in all required fields');
      return;
    }
    
    this.loading.set(true);
    this.error.set(null);
    
    if (this.isEditMode() && this.dataset()) {
      this.kmlDatasetService.update(this.dataset()?.id || 0, currentFormData).subscribe({
        next: (data) => {
          this.loading.set(false);
          this.router.navigate(['/kml']);
        },
        error: (err) => {
          this.error.set('Failed to update KML dataset. Please try again later.');
          this.loading.set(false);
        }
      });
    } else {
      this.kmlDatasetService.create(currentFormData).subscribe({
        next: (data) => {
          this.loading.set(false);
          this.router.navigate(['/kml']);
        },
        error: (err) => {
          this.error.set('Failed to create KML dataset. Please try again later.');
          this.loading.set(false);
        }
      });
    }
  }
}