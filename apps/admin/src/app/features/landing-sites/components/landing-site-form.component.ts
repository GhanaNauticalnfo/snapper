import { Component, ChangeDetectionStrategy, input, output, OnInit, OnDestroy, AfterViewInit, viewChild, signal, inject, effect, computed, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { InputSwitchModule } from 'primeng/inputswitch';
import { DividerModule } from 'primeng/divider';
import { CardModule } from 'primeng/card';
import { SkeletonModule } from 'primeng/skeleton';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
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
    MapComponent,
    ConfirmDialogModule
  ],
  providers: [ConfirmationService],
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
              <div class="flex items-center justify-between w-full">
                <div class="text-sm text-gray-500">
                  @if (mode() === 'create' && !landingSiteForm.valid) {
                    <span class="text-orange-500">Please enter a landing site name</span>
                  } @else if (mode() === 'edit' && !hasChanges()) {
                    <span class="text-gray-500">No changes made</span>
                  }
                </div>
                <div class="flex gap-2">
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
                    label="Save" 
                    icon="pi pi-check"
                    (click)="saveLandingSite()"
                    [disabled]="!canSave()">
                  </button>
                </div>
              </div>
            } @else {
              <button 
                pButton 
                type="button" 
                label="Close" 
                class="p-button-text"
                (click)="onCancel()">
              </button>
            }
          </div>
        </div>
      </form>
      
      <p-confirmDialog></p-confirmDialog>
    </div>
  `,
  host: {
    class: 'landing-site-form-host'
  },
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
      position: relative;
      display: block;
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
  // Computed values
  canSave = computed(() => {
    const mode = this.mode();
    const current = this.currentFormValues();
    
    // Basic validation: name must not be empty
    const hasValidName = current.name && current.name.trim().length > 0;
    
    if (!hasValidName) {
      return false;
    }
    
    // For edit mode, also require changes
    if (mode === 'edit') {
      return this.hasChanges();
    }
    
    // For create mode, basic requirements are enough
    return true;
  });

  // Input/Output signals
  landingSite = input<LandingSite | null>(null);
  mode = input<'view' | 'edit' | 'create'>('view');
  save = output<LandingSite>();
  cancel = output<void>();
  
  // Services
  private fb = inject(FormBuilder);
  private confirmationService = inject(ConfirmationService);
  private cdr = inject(ChangeDetectorRef);
  
  // View child
  mapComponent = viewChild<MapComponent>('mapComponent');

  landingSiteForm: FormGroup;
  mapConfig = signal<Partial<MapConfig>>({});
  currentLocation = signal<GeoPoint>({
    type: 'Point',
    coordinates: [-0.4, 5.6]
  });
  mapReady = signal(false);
  
  // Change tracking
  currentFormValues = signal<{ name: string; description: string; enabled: boolean }>({ 
    name: '', 
    description: '', 
    enabled: true 
  });
  originalFormValues = signal<{ name: string; description: string; enabled: boolean } | null>(null);
  originalLocation = signal<GeoPoint | null>(null);
  
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
      height: '100%', // Use 100% to fill container
      showControls: false,
      showFullscreenControl: true,
      showCoordinateDisplay: true,
      availableLayers: [],
      initialActiveLayers: []
    });
  }

  ngOnInit() {
    this.resetFormWithLandingSiteData();
    
    // Watch for form changes to update current values signal
    this.landingSiteForm.valueChanges.subscribe((values) => {
      this.currentFormValues.set(values);
    });
  }
  
  // Unified change detection method
  hasChanges(): boolean {
    const current = this.currentFormValues();
    const originalForm = this.originalFormValues();
    const currentLoc = this.currentLocation();
    const originalLoc = this.originalLocation();
    
    // Check form changes
    if (originalForm) {
      const formChanged = (
        current.name !== originalForm.name ||
        current.description !== originalForm.description ||
        current.enabled !== originalForm.enabled
      );
      
      if (formChanged) return true;
    }
    
    // Check location changes
    if (originalLoc && currentLoc) {
      return (
        currentLoc.coordinates[0] !== originalLoc.coordinates[0] ||
        currentLoc.coordinates[1] !== originalLoc.coordinates[1]
      );
    }
    
    return false;
  }

  private resetFormWithLandingSiteData() {
    const site = this.landingSite();
    if (site) {
      const formData = {
        name: site.name || '',
        description: site.description || '',
        enabled: site.enabled !== undefined ? site.enabled : true
      };
      this.landingSiteForm.reset(formData);
      
      // Force change detection to ensure PrimeNG InputSwitch updates
      this.cdr.detectChanges();
      
      if (site.location) {
        this.currentLocation.set(site.location);
      }
      
      // Store both current and original values for change tracking
      this.currentFormValues.set({ ...formData });
      this.originalFormValues.set({ ...formData });
      // Deep copy location to track changes
      this.originalLocation.set(site.location ? { ...site.location, coordinates: [...site.location.coordinates] } : null);
    } else {
      const formData = {
        name: '',
        description: '',
        enabled: true
      };
      this.landingSiteForm.reset(formData);
      const defaultLocation: GeoPoint = {
        type: 'Point',
        coordinates: [-0.4, 5.6]
      };
      this.currentLocation.set(defaultLocation);
      
      // For create mode, set current values and original to null
      this.currentFormValues.set({ ...formData });
      this.originalFormValues.set(null);
      this.originalLocation.set(null);
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
    
    // Wait for map style to be loaded
    const initializeLandingSite = () => {
      // Add click handler for setting location (only in edit/create mode)
      if (this.mode() !== 'view') {
        this.map!.on('click', (e) => {
          const { lng, lat } = e.lngLat;
          this.updateLocation(lng, lat);
        });
      }
      
      // Add initial marker
      this.updateMarker();
      
      // Delay fitting to location to ensure map is fully ready
      setTimeout(() => {
        this.fitMapToLocation();
      }, 300);
    };
    
    if (this.map.isStyleLoaded()) {
      initializeLandingSite();
      // Ensure map layout is correct after initialization
      setTimeout(() => {
        mapComponentRef.resize();
      }, 100);
    } else {
      this.map.once('styledata', () => {
        initializeLandingSite();
        // Ensure map layout is correct after initialization
        setTimeout(() => {
          mapComponentRef.resize();
        }, 100);
      });
    }
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
    
    // Force change detection to ensure map container renders with proper dimensions
    this.cdr.detectChanges();
    
    // Initialize map with minimal delay like routes
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

  onCancel(): void {
    if (this.mode() !== 'view' && this.hasChanges()) {
      this.confirmationService.confirm({
        message: 'You have unsaved changes. Are you sure you want to cancel?',
        header: 'Unsaved Changes',
        icon: 'pi pi-exclamation-triangle',
        accept: () => {
          this.mapReady.set(false);
          this.cancel.emit();
        }
      });
    } else {
      this.mapReady.set(false);
      this.cancel.emit();
    }
  }
  
  saveLandingSite() {
    if (this.canSave()) {
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
      
      // Update both current and original values to reflect the saved state
      const savedFormValues = {
        name: formValue.name,
        description: formValue.description,
        enabled: formValue.enabled
      };
      this.currentFormValues.set(savedFormValues);
      this.originalFormValues.set({ ...savedFormValues });
      // Deep copy location to update original state
      const currentLoc = this.currentLocation();
      this.originalLocation.set({ ...currentLoc, coordinates: [...currentLoc.coordinates] });
    }
  }
}