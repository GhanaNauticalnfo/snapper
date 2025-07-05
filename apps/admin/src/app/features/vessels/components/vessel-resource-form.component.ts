import { Component, Input, Output, EventEmitter, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { ButtonModule } from 'primeng/button';
import { VesselTypeService, VesselType } from '../../settings/services/vessel-type.service';
import { Vessel } from '../models/vessel.dto';

@Component({
  selector: 'app-vessel-resource-form',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    InputTextModule,
    SelectModule,
    ButtonModule
  ],
  template: `
    <form (ngSubmit)="onSave()" #vesselForm="ngForm">
      <div class="grid">
        <!-- Basic Information -->
        <div class="col-12">
          <h3>Basic Information</h3>
        </div>
        
        <div class="col-12 md:col-6">
          <div class="field">
            <label for="name">Name <span class="text-red-500">*</span></label>
            <input
              type="text"
              pInputText
              id="name"
              [(ngModel)]="vessel.name"
              name="name"
              required
              [readonly]="mode === 'view'"
              class="w-full"
              placeholder="Enter vessel name"
            />
          </div>
        </div>
        
        <div class="col-12 md:col-6">
          <div class="field">
            <label for="vessel_type_id">Type <span class="text-red-500">*</span></label>
            <p-select
              id="vessel_type_id"
              [(ngModel)]="vessel.vessel_type_id"
              name="vessel_type_id"
              [options]="vesselTypes()"
              optionLabel="name"
              optionValue="id"
              placeholder="Select vessel type"
              [readonly]="mode === 'view'"
              [disabled]="mode === 'view'"
              styleClass="w-full"
              required
            ></p-select>
          </div>
        </div>
      </div>
      
      <!-- Action buttons -->
      <div class="flex justify-end gap-2 mt-4" *ngIf="mode !== 'view'">
        <p-button
          label="Cancel"
          severity="secondary"
          type="button"
          (onClick)="cancel.emit()"
        ></p-button>
        <p-button
          label="Save"
          type="submit"
          [disabled]="!vesselForm.valid"
        ></p-button>
      </div>
    </form>
  `,
  styles: [`
    :host {
      display: block;
    }
    
    .field {
      margin-bottom: 1.5rem;
    }
    
    .field label {
      display: block;
      margin-bottom: 0.5rem;
      font-weight: 500;
    }
    
    h3 {
      color: var(--text-color);
      font-size: 1.125rem;
      font-weight: 600;
      margin: 0;
    }
  `]
})
export class VesselResourceFormComponent implements OnInit {
  private vesselTypeService = inject(VesselTypeService);
  
  @Input() 
  set vesselData(value: Vessel | null) {
    if (value) {
      this.vessel = { ...value };
    } else {
      this.resetForm();
    }
  }
  
  @Input() mode: 'view' | 'edit' | 'create' = 'create';
  @Output() save = new EventEmitter<Vessel>();
  @Output() cancel = new EventEmitter<void>();
  
  vessel: Vessel = this.getEmptyVessel();
  vesselTypes = signal<VesselType[]>([]);
  
  ngOnInit() {
    this.loadVesselTypes();
  }
  
  private loadVesselTypes() {
    this.vesselTypeService.getAll().subscribe({
      next: (types) => {
        this.vesselTypes.set(types);
      },
      error: (error) => {
        console.error('Error loading vessel types:', error);
      }
    });
  }
  
  onSave() {
    if (this.vessel.name && this.vessel.vessel_type_id) {
      this.save.emit(this.vessel);
    }
  }
  
  resetForm() {
    this.vessel = this.getEmptyVessel();
  }
  
  private getEmptyVessel(): Vessel {
    return {
      name: '',
      vessel_type_id: 1 // Default to Unspecified
    };
  }
}