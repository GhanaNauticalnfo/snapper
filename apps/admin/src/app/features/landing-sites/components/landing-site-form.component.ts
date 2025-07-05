import { Component, ChangeDetectionStrategy, input, output, OnInit, OnDestroy, AfterViewInit, viewChild, signal, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { InputSwitchModule } from 'primeng/inputswitch';
import { DividerModule } from 'primeng/divider';
import { CardModule } from 'primeng/card';
import { SkeletonModule } from 'primeng/skeleton';
import { LandingSite } from '../models/landing-site.model';
import { MapComponent, MapConfig, OSM_STYLE } from '@ghanawaters/map';
import { GeoPoint } from '@ghanawaters/shared-models';
import { Map as MaplibreMap, Marker, LngLatLike } from 'maplibre-gl';

@Component({
  selector: 'app-landing-site-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    SkeletonModule,
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    ButtonModule,
    InputTextModule,
    TextareaModule,
    InputSwitchModule,
    DividerModule,
    CardModule,
    MapComponent
  ],
  template: `
    <div class="landing-site-form-container">
      <form [formGroup]="landingSiteForm" class="flex gap-3" style="height: 100%;">
        <!-- Left side: Map -->
        <div class="map-section" style="position: relative;">
          @if (mapReady()) {
            <lib-map 
              #mapComponent
              [config]="mapConfig()">
            </lib-map>
            @if (mode() !== 'view') {
              <div class="map-instructions">
                <i class="pi pi-info-circle"></i> Click on the map to set the landing site location
              </div>
            }
          } @else {
            <div class="map-skeleton">
              <p-skeleton width="100%" height="100%"></p-skeleton>
              <div class="loading-text">Loading map...</div>
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
                  <span class="location-value">{{ currentLocation().coordinates[1].toFixed(6) }}°</span>
                </div>
                <div class="location-item">
                  <span class="location-label">Longitude:</span>
                  <span class="location-value">{{ currentLocation().coordinates[0].toFixed(6) }}°</span>
                </div>
              </div>
            </div>
          </div>

          <div class="form-actions">
            @if (mode() !== 'view') {
              <button 
                pButton 
                type="button" 
                label="Cancel" 
                class="p-button-text"
                (click)="cancel.emit()">
              </button>
              <button 
                pButton 
                type="button" 
                label="Save" 
                icon="pi pi-check"
                (click)="saveLandingSite()"
                [disabled]="landingSiteForm.invalid">
              </button>
            } @else {
              <button 
                pButton 
                type="button" 
                label="Close" 
                class="p-button-text"
                (click)="cancel.emit()">
              </button>
            }
          </div>
        </div>
      </form>
    </div>
  `,
  styles: [`
    .landing-site-form-container {
      height: 100%;
      overflow: hidden;
    }

    .landing-site-form-container form {
      height: 100%;
    }

    .map-section {
      flex: 0 0 60%;
      min-width: 300px;
      position: relative;
      height: 100%;
      display: flex;
      flex-direction: column;
    }

    .map-section lib-map {
      flex: 1;
      min-height: 500px;
    }

    .map-skeleton {
      width: 100%;
      height: 100%;
      min-height: 500px;
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .loading-text {
      position: absolute;
      color: var(--text-color-secondary);
      font-size: 1.2rem;
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
export class LandingSiteFormComponent implements OnInit, OnDestroy, AfterViewInit {
  // Input/Output signals
  landingSite = input<LandingSite | null>(null);
  mode = input<'view' | 'edit' | 'create'>('view');
  save = output<LandingSite>();
  cancel = output<void>();
  
  // Services
  private fb = inject(FormBuilder);
  
  // View child
  mapComponent = viewChild.required<MapComponent>('mapComponent');

  landingSiteForm: FormGroup;
  mapConfig = signal<Partial<MapConfig>>({});
  currentLocation = signal<GeoPoint>({
    type: 'Point',
    coordinates: [-0.4, 5.6]
  });
  mapReady = signal(false);
  
  private marker?: Marker;
  private map?: MaplibreMap;

  // Effects for input changes
  private modeEffect = effect(() => {
    const currentMode = this.mode();
    this.updateFormState();
  });

  private landingSiteEffect = effect(() => {
    const site = this.landingSite();
    this.resetFormWithLandingSiteData();
  });

  constructor() {
    this.landingSiteForm = this.fb.group({
      name: ['', Validators.required],
      description: [''],
      enabled: [true]
    });
    
    // Initialize map configuration
    this.mapConfig.set({
      mapStyle: OSM_STYLE,
      center: [-0.4, 5.6], // Ghana coast
      zoom: 7,
      height: '600px',
      showControls: false,
      showFullscreenControl: true,
      showCoordinateDisplay: true,
      availableLayers: [],
      initialActiveLayers: []
    });
  }

  ngOnInit() {
    this.resetFormWithLandingSiteData();
  }

  private resetFormWithLandingSiteData() {
    const site = this.landingSite();
    if (site) {
      this.landingSiteForm.patchValue({
        name: site.name || '',
        description: site.description || '',
        enabled: site.enabled !== undefined ? site.enabled : true
      });
      
      if (site.location) {
        this.currentLocation.set(site.location);
      }
    } else {
      this.landingSiteForm.patchValue({
        name: '',
        description: '',
        enabled: true
      });
      this.currentLocation.set({
        type: 'Point',
        coordinates: [-0.4, 5.6]
      });
    }
  }

  ngAfterViewInit() {
    // Focus on the first input field
    const firstInput = document.querySelector('#name') as HTMLInputElement;
    if (firstInput) {
      firstInput.focus();
    }
  }

  public initializeMapIntegration() {
    const mapComponentRef = this.mapComponent();
    if (!mapComponentRef?.map) {
      console.error('Map component not ready');
      return;
    }

    this.map = mapComponentRef.map;
    
    // Add click handler for setting location (only in edit/create mode)
    if (this.mode() !== 'view') {
      this.map.on('click', (e) => {
        const { lng, lat } = e.lngLat;
        this.updateLocation(lng, lat);
      });
    }
    
    // Add initial marker
    this.updateMarker();
    
    // Center map on location
    this.fitMapToLocation();
  }

  private updateFormState() {
    if (this.mode() === 'view') {
      this.landingSiteForm.disable();
    } else {
      this.landingSiteForm.enable();
      this.landingSiteForm.updateValueAndValidity();
    }
  }

  ngOnDestroy() {
    // Reset map state for next time
    this.mapReady.set(false);
    if (this.marker) {
      this.marker.remove();
    }
  }

  // Public method to prepare the map - called by parent component when dialog is shown
  public prepareMap(): void {
    this.mapReady.set(true);
    // Initialize map after next tick when it's rendered
    setTimeout(() => {
      this.initializeMapIntegration();
    }, 0);
  }

  private updateLocation(lng: number, lat: number) {
    this.currentLocation.set({
      type: 'Point',
      coordinates: [lng, lat]
    });
    this.updateMarker();
  }

  private updateMarker() {
    if (!this.map) return;
    
    // Remove existing marker
    if (this.marker) {
      this.marker.remove();
    }
    
    // Add new marker
    const location = this.currentLocation();
    this.marker = new Marker({ color: '#FF0000' })
      .setLngLat(location.coordinates as LngLatLike)
      .addTo(this.map);
  }

  private fitMapToLocation() {
    if (!this.map) return;
    
    const location = this.currentLocation();
    this.map.flyTo({
      center: location.coordinates as LngLatLike,
      zoom: 12,
      duration: 1000
    });
  }

  saveLandingSite() {
    if (this.landingSiteForm.valid) {
      const formValue = this.landingSiteForm.value;
      const site = this.landingSite();
      const landingSite: LandingSite = {
        ...site,
        ...formValue,
        location: this.currentLocation()
      };
      this.save.emit(landingSite);
      // Reset map state in case dialog closes
      this.mapReady.set(false);
    }
  }
}