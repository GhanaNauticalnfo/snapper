import { Component, OnInit, AfterViewInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { InputSwitchModule } from 'primeng/inputswitch';
import { DividerModule } from 'primeng/divider';
import { DynamicDialogRef, DynamicDialogConfig } from 'primeng/dynamicdialog';
import { MapComponent, MapConfig, OSM_STYLE } from '@snapper/map';
import { GeoPoint } from '@snapper/shared-models';
import { Map as MaplibreMap, Marker, LngLatLike } from 'maplibre-gl';
import { LandingSite } from '../models/landing-site.model';
import { LandingSiteResponseDto } from '../models/landing-site.dto';

@Component({
  selector: 'app-landing-site-form-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    ButtonModule,
    InputTextModule,
    TextareaModule,
    InputSwitchModule,
    DividerModule,
    MapComponent
  ],
  template: `
    <div class="landing-site-form-container">
      <form [formGroup]="landingSiteForm" class="flex gap-3" style="height: 100%;">
        <!-- Left side: Map -->
        <div class="map-section" style="position: relative;">
          <lib-map 
            #mapComponent
            [config]="mapConfig">
          </lib-map>
          @if (mode !== 'view') {
            <div class="map-instructions">
              <i class="pi pi-info-circle"></i> Click on the map to set the landing site location
            </div>
          }
        </div>

        <!-- Right side: Form fields -->
        <div class="form-panel">
          <div class="form-content">
            <div class="field">
              <label for="name" class="block mb-2">Landing Site Name *</label>
              <input 
                pInputText 
                id="name" 
                formControlName="name" 
                class="w-full"
                placeholder="Enter landing site name">
              @if (landingSiteForm.get('name')?.invalid && landingSiteForm.get('name')?.touched) {
                <small class="p-error">Landing site name is required</small>
              }
            </div>

            <div class="field">
              <label for="description" class="block mb-2">Description</label>
              <textarea 
                pTextarea 
                id="description" 
                formControlName="description" 
                rows="3"
                class="w-full"
                placeholder="Enter landing site description">
              </textarea>
            </div>

            <div class="field-checkbox">
              <p-inputSwitch 
                formControlName="enabled">
              </p-inputSwitch>
              <label class="ml-2">Active</label>
            </div>

            <p-divider></p-divider>

            <div class="location-section">
              <h4 class="m-0 mb-3">Location</h4>
              <div class="location-display">
                <div class="location-item">
                  <span class="location-label">Latitude:</span>
                  <span class="location-value">{{ currentLocation.coordinates[1].toFixed(6) }}°</span>
                </div>
                <div class="location-item">
                  <span class="location-label">Longitude:</span>
                  <span class="location-value">{{ currentLocation.coordinates[0].toFixed(6) }}°</span>
                </div>
              </div>
            </div>
          </div>

          <div class="form-actions">
            @if (mode !== 'view') {
              <button 
                pButton 
                type="button" 
                label="Cancel" 
                class="p-button-text"
                (click)="cancel()">
              </button>
              <button 
                pButton 
                type="button" 
                label="Save" 
                icon="pi pi-check"
                (click)="save()"
                [disabled]="landingSiteForm.invalid">
              </button>
            } @else {
              <button 
                pButton 
                type="button" 
                label="Close" 
                class="p-button-text"
                (click)="cancel()">
              </button>
            }
          </div>
        </div>
      </form>
    </div>
  `,
  styles: [`
    .landing-site-form-container {
      height: calc(85vh - 100px);
      overflow: hidden;
    }

    .map-section {
      flex: 0 0 60%;
      min-width: 300px;
      position: relative;
    }

    .map-instructions {
      position: absolute;
      top: 10px;
      left: 10px;
      background: rgba(255, 255, 255, 0.9);
      padding: 8px 12px;
      border-radius: 4px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      font-size: 0.875rem;
      z-index: 10;
    }

    .form-panel {
      flex: 0 0 40%;
      display: flex;
      flex-direction: column;
      height: 100%;
      background: var(--surface-card);
      border-left: 1px solid var(--surface-border);
    }

    .form-content {
      flex: 1;
      padding: 1.5rem;
      overflow-y: auto;
    }

    .form-actions {
      padding: 1rem 1.5rem;
      border-top: 1px solid var(--surface-border);
      display: flex;
      justify-content: flex-end;
      gap: 0.5rem;
    }

    .field {
      margin-bottom: 1.5rem;
    }

    .field-checkbox {
      display: flex;
      align-items: center;
    }

    .location-section {
      background: var(--surface-50);
      padding: 1rem;
      border-radius: var(--border-radius);
    }

    .location-display {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .location-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .location-label {
      font-weight: 600;
      color: var(--text-color-secondary);
    }

    .location-value {
      font-family: monospace;
      font-size: 1.1rem;
    }
  `]
})
export class LandingSiteFormDialogComponent implements OnInit, AfterViewInit {
  @ViewChild('mapComponent') mapComponent!: MapComponent;

  landingSiteForm: FormGroup;
  mode: 'view' | 'edit' | 'create' = 'create';
  currentLocation: GeoPoint = {
    type: 'Point',
    coordinates: [-0.4, 5.6]
  };
  
  mapConfig: Partial<MapConfig> = {
    mapStyle: OSM_STYLE,
    center: [-0.4, 5.6],
    zoom: 7,
    height: '100%',
    showControls: false,
    showFullscreenControl: true,
    showCoordinateDisplay: true,
    availableLayers: [],
    initialActiveLayers: []
  };
  
  private marker?: Marker;
  private map?: MaplibreMap;

  constructor(
    private fb: FormBuilder,
    private ref: DynamicDialogRef,
    private config: DynamicDialogConfig
  ) {
    this.landingSiteForm = this.fb.group({
      name: ['', Validators.required],
      description: [''],
      enabled: [true]
    });
    
    // Get mode and data from dialog config
    this.mode = this.config.data?.mode || 'create';
    
    if (this.config.data?.landingSite) {
      this.initializeWithLandingSite(this.config.data.landingSite);
    }
  }

  ngOnInit() {
    if (this.mode === 'view') {
      this.landingSiteForm.disable();
    }
  }

  ngAfterViewInit() {
    // Map will be initialized immediately since dialog is only created when needed
    setTimeout(() => {
      this.initializeMap();
    }, 100);
  }

  private initializeWithLandingSite(dto: LandingSiteResponseDto) {
    this.landingSiteForm.patchValue({
      name: dto.name,
      description: dto.description,
      enabled: dto.status === 'active'
    });
    
    if (dto.location) {
      this.currentLocation = dto.location;
      this.mapConfig.center = dto.location.coordinates as LngLatLike;
      this.mapConfig.zoom = 12;
    }
  }

  private initializeMap() {
    if (!this.mapComponent?.map) {
      console.error('Map component not ready');
      return;
    }

    this.map = this.mapComponent.map;
    
    // Add click handler for setting location (only in edit/create mode)
    if (this.mode !== 'view') {
      this.map.on('click', (e) => {
        const { lng, lat } = e.lngLat;
        this.updateLocation(lng, lat);
      });
    }
    
    // Add initial marker
    this.updateMarker();
    
    // Center map on location
    if (this.currentLocation) {
      this.map.flyTo({
        center: this.currentLocation.coordinates as LngLatLike,
        zoom: 12,
        duration: 1000
      });
    }
  }

  private updateLocation(lng: number, lat: number) {
    this.currentLocation = {
      type: 'Point',
      coordinates: [lng, lat]
    };
    this.updateMarker();
  }

  private updateMarker() {
    if (!this.map) return;
    
    // Remove existing marker
    if (this.marker) {
      this.marker.remove();
    }
    
    // Add new marker
    this.marker = new Marker({ color: '#FF0000' })
      .setLngLat(this.currentLocation.coordinates as LngLatLike)
      .addTo(this.map);
  }

  save() {
    if (this.landingSiteForm.valid) {
      const formValue = this.landingSiteForm.value;
      const result = {
        ...formValue,
        location: this.currentLocation
      };
      this.ref.close(result);
    }
  }

  cancel() {
    this.ref.close();
  }

  ngOnDestroy() {
    if (this.marker) {
      this.marker.remove();
    }
  }
}