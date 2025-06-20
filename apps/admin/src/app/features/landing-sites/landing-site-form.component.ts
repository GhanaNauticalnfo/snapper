import { Component, EventEmitter, Input, Output, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { MessageModule } from 'primeng/message';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import { MapComponent } from '@snapper/map';
import { LandingSite, CreateLandingSiteDto, UpdateLandingSiteDto } from './landing-site.model';
import { latitudeValidator, longitudeValidator } from '../../shared/validators/coordinate.validators';
import * as maplibregl from 'maplibre-gl';

@Component({
  selector: 'app-landing-site-form',
  standalone: true,
  host: { class: 'landing-site-form-host' },
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    DialogModule,
    ButtonModule,
    InputTextModule,
    InputNumberModule,
    MessageModule,
    ConfirmDialogModule,
    MapComponent
  ],
  providers: [ConfirmationService],
  template: `
    <p-dialog 
      [(visible)]="visible" 
      [header]="landingSite ? 'Edit Landing Site' : 'New Landing Site'"
      [modal]="true" 
      [style]="{width: '950px', height: '85vh'}"
      [closable]="true"
      (onHide)="onCancel()"
    >
      <form [formGroup]="form" (ngSubmit)="onSubmit()">
        <div class="grid">
          <!-- Name -->
          <div class="col-12">
            <label for="name" class="block mb-2">Name <span class="text-red-500">*</span></label>
            <input 
              pInputText 
              id="name"
              formControlName="name"
              class="w-full"
              placeholder="Enter landing site name"
            />
            <small class="p-error" *ngIf="form.get('name')?.invalid && form.get('name')?.touched">
              Name is required
            </small>
          </div>

          <!-- Description -->
          <div class="col-12">
            <label for="description" class="block mb-2">Description</label>
            <textarea 
              pInputTextarea 
              id="description"
              formControlName="description"
              rows="3"
              class="w-full"
              placeholder="Enter description"
            ></textarea>
          </div>

          <!-- Location Coordinates -->
          <div class="col-12">
            <label class="block mb-2">Location <span class="text-red-500">*</span></label>
            <div class="coordinates-row">
              <div class="coordinate-field">
                <label for="latitude" class="block mb-1">Latitude</label>
                <p-inputNumber 
                  id="latitude"
                  formControlName="latitude"
                  [minFractionDigits]="1"
                  [maxFractionDigits]="6"
                  placeholder="-90 to 90"
                  styleClass="w-full"
                ></p-inputNumber>
                <small class="p-error" *ngIf="form.get('latitude')?.errors?.['latitude'] && form.get('latitude')?.touched">
                  {{ form.get('latitude')?.errors?.['latitude'].message }}
                </small>
                <small class="p-error" *ngIf="form.get('latitude')?.errors?.['required'] && form.get('latitude')?.touched">
                  Latitude is required
                </small>
              </div>
              <div class="coordinate-field">
                <label for="longitude" class="block mb-1">Longitude</label>
                <p-inputNumber 
                  id="longitude"
                  formControlName="longitude"
                  [minFractionDigits]="1"
                  [maxFractionDigits]="6"
                  placeholder="-180 to 180"
                  styleClass="w-full"
                ></p-inputNumber>
                <small class="p-error" *ngIf="form.get('longitude')?.errors?.['longitude'] && form.get('longitude')?.touched">
                  {{ form.get('longitude')?.errors?.['longitude'].message }}
                </small>
                <small class="p-error" *ngIf="form.get('longitude')?.errors?.['required'] && form.get('longitude')?.touched">
                  Longitude is required
                </small>
              </div>
            </div>
          </div>

          <!-- Map Display -->
          <div class="col-12">
            <div class="map-section">
              <p class="map-hint">Click on the map to set location</p>
              <div style="height: 400px; position: relative;">
                <lib-map
                  [center]="mapCenter"
                  [zoom]="mapZoom"
                  [showControls]="false"
                  [showFullscreenControl]="true"
                  [showCoordinateDisplay]="true"
                  [clickable]="true"
                  (mapLoad)="onMapLoad($any($event))"
                  (mapClick)="onMapClick($event)"
                ></lib-map>
              </div>
            </div>
          </div>
        </div>
      </form>

      <ng-template pTemplate="footer">
        <button 
          pButton 
          label="Cancel" 
          (click)="onCancel()"
          class="p-button-text"
        ></button>
        <button 
          pButton 
          label="Save" 
          (click)="onSubmit()"
          [disabled]="form.invalid"
          class="p-button-success"
        ></button>
      </ng-template>
    </p-dialog>
    <p-confirmDialog></p-confirmDialog>
  `,
  styles: [`
    :host {
      display: block;
    }
    
    .coordinates-row {
      display: flex;
      gap: 1rem;
      margin-bottom: 1rem;
    }
    
    .coordinate-field {
      flex: 1;
    }
    
    .coordinate-field label {
      font-weight: 500;
      font-size: 0.875rem;
    }
    
    .map-section {
      position: relative;
    }
    
    .map-hint {
      text-align: center;
      color: var(--text-color-secondary);
      font-size: 0.875rem;
      margin-bottom: 0.5rem;
      font-style: italic;
    }
  `]
})
export class LandingSiteFormComponent implements OnInit, OnChanges {
  @Input() visible = false;
  @Input() landingSite: LandingSite | null = null;
  
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() save = new EventEmitter<CreateLandingSiteDto | UpdateLandingSiteDto>();
  @Output() cancel = new EventEmitter<void>();

  form: FormGroup;
  mapCenter: [number, number] = [-1.55, 6.67]; // Ghana center
  mapZoom = 7;
  
  private map?: maplibregl.Map;
  private marker?: maplibregl.Marker;
  private landingSiteMarker?: maplibregl.Marker;
  private originalFormValue: any = {};

  constructor(
    private fb: FormBuilder,
    private confirmationService: ConfirmationService
  ) {
    this.form = this.fb.group({
      name: ['', Validators.required],
      description: [''],
      latitude: [null, [Validators.required, latitudeValidator()]],
      longitude: [null, [Validators.required, longitudeValidator()]]
    });
  }

  ngOnInit() {
    // Subscribe to coordinate changes to update map
    this.form.get('latitude')?.valueChanges.subscribe(lat => {
      const lng = this.form.get('longitude')?.value;
      if (lat !== null && lng !== null && !isNaN(lat) && !isNaN(lng)) {
        this.updateMarkerAndMap(lng, lat);
      }
    });

    this.form.get('longitude')?.valueChanges.subscribe(lng => {
      const lat = this.form.get('latitude')?.value;
      if (lat !== null && lng !== null && !isNaN(lat) && !isNaN(lng)) {
        this.updateMarkerAndMap(lng, lat);
      }
    });
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['landingSite'] || changes['visible']) {
      if (this.visible) {
        this.initializeForm();
      }
    }
  }

  private centerMapOnCoordinates(lng: number, lat: number) {
    if (!this.map) return;
    
    // Use setTimeout to ensure map is ready
    setTimeout(() => {
      this.map?.setCenter([lng, lat]);
      this.map?.setZoom(this.mapZoom);
    }, 100);
  }

  initializeForm() {
    if (this.landingSite) {
      const formValue = {
        name: this.landingSite.name,
        description: this.landingSite.description || '',
        latitude: this.landingSite.location.coordinates[1],
        longitude: this.landingSite.location.coordinates[0]
      };
      this.form.patchValue(formValue);
      
      const [lng, lat] = this.landingSite.location.coordinates;
      if (lat && lng) {
        this.mapCenter = [lng, lat];
        this.mapZoom = 7;
        
        // Update markers and center map if loaded
        if (this.map) {
          this.updateMarker(lng, lat);
          this.updateLandingSiteMarker(lng, lat);
          
          // Always center map on landing site when dialog opens
          this.centerMapOnCoordinates(lng, lat);
        }
      }
    } else {
      const formValue = {
        name: '',
        description: '',
        latitude: null,
        longitude: null
      };
      this.form.patchValue(formValue);
      this.mapCenter = [-1.55, 6.67];
      this.mapZoom = 7;
      
      // Remove marker
      if (this.marker) {
        this.marker.remove();
        this.marker = undefined;
      }
    }
    
    // Store original form value for change detection
    this.originalFormValue = this.form.getRawValue();
    this.form.markAsUntouched();
  }

  onMapLoad(map: maplibregl.Map) {
    this.map = map;
    
    // If editing and has coordinates, add markers and center map
    if (this.landingSite && this.landingSite.location) {
      const [lng, lat] = this.landingSite.location.coordinates;
      this.updateMarker(lng, lat);
      this.updateLandingSiteMarker(lng, lat);
      
      // Center map on landing site position
      this.centerMapOnCoordinates(lng, lat);
    }
  }

  updateMarker(lng: number, lat: number) {
    if (!this.map) return;
    
    // Remove existing marker
    if (this.marker) {
      this.marker.remove();
    }
    
    // Add new marker
    this.marker = new maplibregl.Marker({ color: '#22c55e' })
      .setLngLat([lng, lat])
      .addTo(this.map);
    
    // Also update landing site marker
    this.updateLandingSiteMarker(lng, lat);
  }

  private updateLandingSiteMarker(lng: number, lat: number) {
    if (!this.map) return;
    
    // Remove existing landing site marker
    if (this.landingSiteMarker) {
      this.landingSiteMarker.remove();
    }
    
    // Create custom landing site marker element
    const el = document.createElement('div');
    el.className = 'landing-site-marker';
    el.innerHTML = 'L';
    
    // Add new landing site marker
    this.landingSiteMarker = new maplibregl.Marker({
      element: el,
      anchor: 'center'
    })
      .setLngLat([lng, lat])
      .addTo(this.map);
  }

  private updateMarkerAndMap(lng: number, lat: number) {
    // Update marker position
    this.updateMarker(lng, lat);
    
    // Center map on new coordinates
    this.centerMapOnCoordinates(lng, lat);
    
    // Update landing site marker
    this.updateLandingSiteMarker(lng, lat);
  }

  onMapClick(event: {longitude: number, latitude: number}) {
    // Update form values
    this.form.patchValue({
      latitude: event.latitude,
      longitude: event.longitude
    });
    
    // Mark fields as touched to show validation if needed
    this.form.get('latitude')?.markAsTouched();
    this.form.get('longitude')?.markAsTouched();
    
    // The marker will update automatically via the valueChanges subscription
  }


  private hasUnsavedChanges(): boolean {
    const currentValue = this.form.getRawValue();
    return JSON.stringify(currentValue) !== JSON.stringify(this.originalFormValue);
  }

  onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const formValue = this.form.value;
    const data: CreateLandingSiteDto = {
      name: formValue.name.trim(),
      location: {
        type: 'Point',
        coordinates: [formValue.longitude, formValue.latitude]
      }
    };

    // Add optional fields
    if (formValue.description?.trim()) {
      data.description = formValue.description.trim();
    }

    this.save.emit(data);
  }

  onCancel() {
    if (this.hasUnsavedChanges()) {
      this.confirmationService.confirm({
        message: 'You have unsaved changes. Are you sure you want to cancel?',
        header: 'Unsaved Changes',
        icon: 'pi pi-exclamation-triangle',
        accept: () => {
          this.closeDialog();
        }
      });
    } else {
      this.closeDialog();
    }
  }

  private closeDialog() {
    this.visible = false;
    this.visibleChange.emit(false);
    this.cancel.emit();
    
    // Clean up markers
    if (this.marker) {
      this.marker.remove();
      this.marker = undefined;
    }
    if (this.landingSiteMarker) {
      this.landingSiteMarker.remove();
      this.landingSiteMarker = undefined;
    }
    
    // Reset form
    this.form.reset();
  }
}