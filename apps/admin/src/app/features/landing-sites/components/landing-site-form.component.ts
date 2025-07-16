import { Component, ChangeDetectionStrategy, input, output, OnInit, OnDestroy, AfterViewInit, viewChild, signal, inject, effect, computed, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputGroupModule } from 'primeng/inputgroup';
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
    InputGroupModule,
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
              <div class="map-instructions text-sm">
                <i class="pi pi-info-circle"></i> Click on the map to set the landing site location
              </div>
            }
          } @else {
            <div class="map-skeleton">
              <p-skeleton width="100%" height="100%"></p-skeleton>
              <div class="loading-text text-xl">Loading map...</div>
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

            <div class="field">
              <label class="block mb-2">Location</label>
              <div class="location-inputs">
                <div class="location-input-group">
                  <label for="latitude" class="location-input-label">Latitude:</label>
                  <div class="p-inputgroup location-input">
                    <input 
                      pInputText
                      type="text"
                      id="latitude"
                      formControlName="latitudeText"
                      placeholder="-90 to 90"
                      class="p-inputtext-sm">
                    <span class="p-inputgroup-addon">°</span>
                  </div>
                </div>
                <div class="location-input-group">
                  <label for="longitude" class="location-input-label">Longitude:</label>
                  <div class="p-inputgroup location-input">
                    <input 
                      pInputText
                      type="text"
                      id="longitude"
                      formControlName="longitudeText"
                      placeholder="-180 to 180"
                      class="p-inputtext-sm">
                    <span class="p-inputgroup-addon">°</span>
                  </div>
                </div>
              </div>
              @if (mode() === 'view') {
                <small class="text-color-secondary">Location coordinates</small>
              } @else {
                <small class="text-color-secondary">Click on the map or enter coordinates manually</small>
                @if (landingSiteForm.get('latitudeText')?.errors && landingSiteForm.get('latitudeText')?.touched) {
                  <small class="p-error block mt-1">
                    @if (landingSiteForm.get('latitudeText')?.errors?.['invalidNumber']) {
                      Latitude must be a valid number
                    }
                    @if (landingSiteForm.get('latitudeText')?.errors?.['outOfRange']) {
                      Latitude must be between -90 and 90
                    }
                  </small>
                }
                @if (landingSiteForm.get('longitudeText')?.errors && landingSiteForm.get('longitudeText')?.touched) {
                  <small class="p-error block mt-1">
                    @if (landingSiteForm.get('longitudeText')?.errors?.['invalidNumber']) {
                      Longitude must be a valid number
                    }
                    @if (landingSiteForm.get('longitudeText')?.errors?.['outOfRange']) {
                      Longitude must be between -180 and 180
                    }
                  </small>
                }
              }
            </div>

            <div class="field-checkbox">
              <p-inputSwitch 
                formControlName="enabled">
              </p-inputSwitch>
              <label class="ml-2">Active</label>
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
    }

    .map-instructions {
      position: absolute;
      top: 10px;
      left: 10px;
      background: rgba(255, 255, 255, 0.9);
      padding: 8px 12px;
      border-radius: 4px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
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

    .location-inputs {
      display: flex;
      gap: 1.5rem;
      align-items: center;
    }

    .location-input-group {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex: 1;
    }

    .location-input-label {
      font-weight: 500;
      color: var(--text-color-secondary);
      white-space: nowrap;
    }

    .location-input {
      flex: 1;
    }

    .location-input ::ng-deep .p-inputnumber-input {
      width: 100%;
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
    
    // Check if the form is valid (including lat/lon validation)
    const isFormValid = this.landingSiteForm.valid;
    
    if (!hasValidName || !isFormValid) {
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
  currentFormValues = signal<{ name: string; description: string; enabled: boolean; latitude: number; longitude: number }>({ 
    name: '', 
    description: '', 
    enabled: true,
    latitude: 5.6,
    longitude: -0.4
  });
  originalFormValues = signal<{ name: string; description: string; enabled: boolean; latitude: number; longitude: number } | null>(null);
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
      enabled: [true],
      latitudeText: ['5.6', [Validators.required, this.latitudeValidator]],
      longitudeText: ['-0.4', [Validators.required, this.longitudeValidator]]
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
      this.currentFormValues.set({
        name: values.name,
        description: values.description,
        enabled: values.enabled,
        latitude: parseFloat(values.latitudeText) || 0,
        longitude: parseFloat(values.longitudeText) || 0
      });
    });
    
    // Watch for latitude/longitude text changes to update map
    this.landingSiteForm.get('latitudeText')?.valueChanges.subscribe((latText) => {
      const lat = parseFloat(latText);
      if (!isNaN(lat) && lat >= -90 && lat <= 90) {
        const lng = this.currentLocation().coordinates[0];
        // Only update if the value actually changed (to avoid infinite loops)
        if (Math.abs(lat - this.currentLocation().coordinates[1]) > 0.000001) {
          this.updateLocation(lng, lat);
        }
      }
    });
    
    this.landingSiteForm.get('longitudeText')?.valueChanges.subscribe((lngText) => {
      const lng = parseFloat(lngText);
      if (!isNaN(lng) && lng >= -180 && lng <= 180) {
        const lat = this.currentLocation().coordinates[1];
        // Only update if the value actually changed (to avoid infinite loops)
        if (Math.abs(lng - this.currentLocation().coordinates[0]) > 0.000001) {
          this.updateLocation(lng, lat);
        }
      }
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
        current.enabled !== originalForm.enabled ||
        Math.abs(current.latitude - originalForm.latitude) > 0.000001 ||
        Math.abs(current.longitude - originalForm.longitude) > 0.000001
      );
      
      if (formChanged) return true;
    }
    
    // Check location changes (this is now redundant since we track lat/lon in form)
    if (originalLoc && currentLoc) {
      return (
        Math.abs(currentLoc.coordinates[0] - originalLoc.coordinates[0]) > 0.000001 ||
        Math.abs(currentLoc.coordinates[1] - originalLoc.coordinates[1]) > 0.000001
      );
    }
    
    return false;
  }

  private resetFormWithLandingSiteData() {
    const site = this.landingSite();
    if (site) {
      const location = site.location || { type: 'Point', coordinates: [-0.4, 5.6] };
      const formData = {
        name: site.name || '',
        description: site.description || '',
        enabled: site.enabled !== undefined ? site.enabled : true,
        latitudeText: location.coordinates[1].toString(),
        longitudeText: location.coordinates[0].toString()
      };
      this.landingSiteForm.reset(formData);
      
      // Force change detection to ensure PrimeNG InputSwitch updates
      this.cdr.detectChanges();
      
      if (site.location) {
        this.currentLocation.set(site.location);
      }
      
      // Store both current and original values for change tracking
      this.currentFormValues.set({ 
        name: formData.name,
        description: formData.description,
        enabled: formData.enabled,
        latitude: location.coordinates[1],
        longitude: location.coordinates[0]
      });
      this.originalFormValues.set({ 
        name: formData.name,
        description: formData.description,
        enabled: formData.enabled,
        latitude: location.coordinates[1],
        longitude: location.coordinates[0]
      });
      // Deep copy location to track changes
      this.originalLocation.set(site.location ? { ...site.location, coordinates: [...site.location.coordinates] } : null);
    } else {
      const defaultLocation: GeoPoint = {
        type: 'Point',
        coordinates: [-0.4, 5.6]
      };
      const formData = {
        name: '',
        description: '',
        enabled: true,
        latitudeText: defaultLocation.coordinates[1].toString(),
        longitudeText: defaultLocation.coordinates[0].toString()
      };
      this.landingSiteForm.reset(formData);
      this.currentLocation.set(defaultLocation);
      
      // For create mode, set current values and original to null
      this.currentFormValues.set({ 
        name: '',
        description: '',
        enabled: true,
        latitude: defaultLocation.coordinates[1],
        longitude: defaultLocation.coordinates[0]
      });
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
  
  // Custom validators
  private latitudeValidator = (control: any) => {
    const value = control.value;
    if (!value) return null;
    
    const num = parseFloat(value);
    if (isNaN(num)) {
      return { invalidNumber: true };
    }
    if (num < -90 || num > 90) {
      return { outOfRange: true };
    }
    return null;
  }
  
  private longitudeValidator = (control: any) => {
    const value = control.value;
    if (!value) return null;
    
    const num = parseFloat(value);
    if (isNaN(num)) {
      return { invalidNumber: true };
    }
    if (num < -180 || num > 180) {
      return { outOfRange: true };
    }
    return null;
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
    
    // Update form controls without triggering valueChanges (to avoid infinite loops)
    this.landingSiteForm.get('latitudeText')?.setValue(lat.toString(), { emitEvent: false });
    this.landingSiteForm.get('longitudeText')?.setValue(lng.toString(), { emitEvent: false });
    
    this.updateMarker();
    
    // Update map view to center on the new location
    if (this.map) {
      this.map.setCenter([lng, lat]);
    }
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
    }
  }
}