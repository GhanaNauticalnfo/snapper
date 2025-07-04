import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, AfterViewInit, ViewChild, signal, OnChanges, SimpleChanges, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { InputSwitchModule } from 'primeng/inputswitch';
import { DividerModule } from 'primeng/divider';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { InputNumberModule } from 'primeng/inputnumber';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { SkeletonModule } from 'primeng/skeleton';
import { ConfirmationService } from 'primeng/api';
import { Route, Waypoint } from '../models/route.model';
import { MapComponent, MapConfig, OSM_STYLE, RouteLayerService, RouteData } from '@ghanawaters/map';
import { WaypointEditorDialogComponent } from './waypoint-editor-dialog.component';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-route-form',
  standalone: true,
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
    TableModule,
    InputNumberModule,
    MapComponent,
    WaypointEditorDialogComponent,
    ConfirmDialogModule
  ],
  providers: [RouteLayerService, ConfirmationService],
  template: `
    <div class="route-form-container">
      <form [formGroup]="routeForm" class="flex gap-3" style="height: 100%;">
        <!-- Left side: Map -->
        <div class="map-section" style="position: relative;">
          @if (mapReady()) {
            <lib-map 
              #mapComponent
              [config]="mapConfig()">
            </lib-map>
          } @else {
            <div class="map-skeleton">
              <p-skeleton width="100%" height="100%"></p-skeleton>
              <div class="loading-text">Loading map...</div>
            </div>
          }
        </div>

        <!-- Right side: Form fields and waypoints -->
        <div class="form-panel">
          <div class="form-content">
            <div class="field">
              <label for="name" class="block mb-2">Route Name *</label>
              <input 
                pInputText 
                id="name" 
                formControlName="name" 
                class="w-full"
                placeholder="Enter route name">
              @if (routeForm.get('name')?.invalid && routeForm.get('name')?.touched) {
                <small class="p-error">Route name is required</small>
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
                placeholder="Enter route description">
              </textarea>
            </div>

            <div class="field-checkbox">
              <p-inputSwitch 
                formControlName="enabled">
              </p-inputSwitch>
              <label class="ml-2">Active</label>
            </div>

            <p-divider></p-divider>

            <div class="waypoints-section">
              <div class="flex justify-between items-center mb-3">
                <h4 class="m-0">Waypoints ({{ waypoints().length }})</h4>
                @if (mode !== 'view') {
                  <div class="flex gap-2">
                    <button 
                      pButton 
                      type="button" 
                      icon="pi pi-pencil" 
                      label="Edit Waypoints"
                      class="p-button-outlined p-button-sm"
                      (click)="showWaypointEditor()">
                    </button>
                    <button 
                      pButton 
                      type="button" 
                      icon="pi pi-trash" 
                      label="Clear All"
                      class="p-button-danger p-button-sm"
                      (click)="clearWaypoints()"
                      [disabled]="waypoints().length === 0">
                    </button>
                  </div>
                }
              </div>

              <div class="waypoints-list">
                <p-table [value]="waypoints()" [scrollable]="true" scrollHeight="300px">
                  <ng-template pTemplate="header">
                    <tr>
                      <th style="width: 80px">ID</th>
                      <th>Latitude</th>
                      <th>Longitude</th>
                    </tr>
                  </ng-template>
                  <ng-template pTemplate="body" let-waypoint let-rowIndex="rowIndex">
                    <tr>
                      <td>WP{{ rowIndex + 1 }}</td>
                      <td>{{ waypoint.lat.toFixed(6) }}</td>
                      <td>{{ waypoint.lng.toFixed(6) }}</td>
                    </tr>
                  </ng-template>
                  <ng-template pTemplate="emptymessage">
                    <tr>
                      <td colspan="3" class="text-center">
                        No waypoints added yet
                      </td>
                    </tr>
                  </ng-template>
                </p-table>
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
                (click)="onCancel()">
              </button>
              <button 
                pButton 
                type="button" 
                label="Save" 
                icon="pi pi-check"
                (click)="saveRoute()"
                [disabled]="!canSave()">
              </button>
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
      
      <!-- Waypoint Editor Dialog -->
      <app-waypoint-editor-dialog
        [(visible)]="showWaypointEditorDialog"
        [waypoints]="waypoints()"
        (waypointsChange)="onWaypointsChange($event)">
      </app-waypoint-editor-dialog>
      
      <p-confirmDialog></p-confirmDialog>
    </div>
  `,
  styles: [`
    .route-form-container {
      height: 100%;
      overflow: hidden;
    }

    .route-form-container form {
      height: 100%;
    }

    .map-section {
      flex: 0 0 60%;
      min-width: 300px;
      height: 100%;
      display: flex;
      flex-direction: column;
      position: relative;
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

    .map-container {
      width: 100%;
      height: 100%;
      min-height: 500px;
      border-radius: var(--border-radius);
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

    .waypoints-section {
      flex: 1;
    }

    .waypoints-list {
      border: 1px solid var(--surface-border);
      border-radius: var(--border-radius);
    }

  `]
})
export class RouteFormComponent implements OnInit, OnDestroy, AfterViewInit, OnChanges {
  @Input() route: Route | null = null;
  @Input() mode: 'view' | 'edit' | 'create' = 'view';
  @Output() save = new EventEmitter<Route>();
  @Output() cancel = new EventEmitter<void>();
  
  @ViewChild('mapComponent') mapComponent!: MapComponent;

  routeForm: FormGroup;
  waypoints = signal<Waypoint[]>([]);
  mapConfig = signal<Partial<MapConfig>>({});
  showWaypointEditorDialog = false;
  mapReady = signal(false);
  
  private routeLayerService: RouteLayerService;
  private originalFormValue: any = {};
  private originalWaypoints: Waypoint[] = [];

  constructor(
    private fb: FormBuilder,
    routeLayerService: RouteLayerService,
    private confirmationService: ConfirmationService,
    private cdr: ChangeDetectorRef
  ) {
    this.routeForm = this.fb.nonNullable.group({
      name: this.fb.nonNullable.control('', Validators.required),
      description: this.fb.nonNullable.control(''),
      enabled: this.fb.nonNullable.control<boolean>(false)
    });
    
    this.routeLayerService = routeLayerService;
    
    // Initialize map configuration
    this.mapConfig.set({
      mapStyle: OSM_STYLE,
      center: [-0.4, 6.7], // Lake Volta region
      zoom: 7,
      height: '100%', // Use 100% to fill container
      showControls: false,
      showFullscreenControl: true,
      showCoordinateDisplay: true,
      availableLayers: [],
      initialActiveLayers: []
    });
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['mode']) {
      console.log('Mode changed from', changes['mode'].previousValue, 'to', changes['mode'].currentValue);
      this.updateFormState();
    }
    
    // Handle route data changes (when switching between different routes)
    if (changes['route']) {
      console.log('Route data changed:', changes['route'].currentValue);
      this.resetFormWithRouteData();
    }
  }

  ngOnInit() {
    console.log('RouteForm initialized with mode:', this.mode);
    console.log('Route data:', this.route);
    
    // Initial form setup
    this.resetFormWithRouteData();
    
    // Watch for form changes to update route display
    this.routeForm.valueChanges.subscribe(() => {
      this.updateRouteDisplay();
    });
  }

  private resetFormWithRouteData() {
    if (this.route) {
      // Reset form with route data
      const formData = {
        name: this.route.name || '',
        description: this.route.description || '',
        enabled: !!this.route.enabled
      };
      this.routeForm.reset(formData);
      
      // Force change detection to ensure PrimeNG InputSwitch updates
      this.cdr.detectChanges();
      
      this.waypoints.set(this.route.waypoints || []);
      
      // Store original values for change detection
      this.originalFormValue = { ...formData };
      this.originalWaypoints = [...(this.route.waypoints || [])];
    } else {
      // Reset form to default values for create mode
      const formData = {
        name: '',
        description: '',
        enabled: false
      };
      this.routeForm.reset(formData);
      this.waypoints.set([]);
      
      // Store original values for change detection
      this.originalFormValue = { ...formData };
      this.originalWaypoints = [];
    }
    
    // Update route display after form reset
    setTimeout(() => {
      this.updateRouteDisplay();
      this.fitMapToWaypoints();
    }, 100);
  }

  ngAfterViewInit() {
    // Focus on the first input field
    const firstInput = document.querySelector('#name') as HTMLInputElement;
    if (firstInput) {
      firstInput.focus();
    }
  }

  private initializeMapIntegration() {
    if (!this.mapComponent?.map) {
      console.error('Map component not ready');
      return;
    }

    const map = this.mapComponent.map;
    
    // Wait for map style to be loaded
    const initializeRoute = () => {
      // Initialize the route layer with the map
      this.routeLayerService.initialize(map);
      
      // Configure API URL for route color fetching
      this.routeLayerService.configureApiUrl(environment.apiUrl);
      
      // Update the display with current waypoints
      this.updateRouteDisplay();
      
      // Delay fitting to waypoints to ensure map is fully ready
      if (this.waypoints().length > 0) {
        setTimeout(() => {
          this.fitMapToWaypoints();
        }, 300);
      }
    };
    
    if (map.isStyleLoaded()) {
      initializeRoute();
      // Ensure map layout is correct after initialization
      setTimeout(() => {
        this.mapComponent.resize();
      }, 100);
    } else {
      map.once('styledata', () => {
        initializeRoute();
        // Ensure map layout is correct after initialization
        setTimeout(() => {
          this.mapComponent.resize();
        }, 100);
      });
    }
  }

  private updateFormState() {
    // Enable/disable form based on mode
    if (this.mode === 'view') {
      console.log('Disabling form for view mode');
      this.routeForm.disable();
    } else {
      console.log('Enabling form for mode:', this.mode);
      // Explicitly enable for create and edit modes
      this.routeForm.enable();
      // Force change detection
      this.routeForm.updateValueAndValidity();
    }
  }


  ngOnDestroy() {
    // Reset map state for next time
    this.mapReady.set(false);
    // Cleanup is handled by the shared map component
  }

  // Public method to prepare the map - called by parent component when dialog is shown
  public prepareMap(): void {
    this.mapReady.set(true);
    
    // Force update the enabled field to ensure InputSwitch displays correctly
    const currentValue = this.routeForm.get('enabled')?.value;
    this.routeForm.get('enabled')?.setValue(currentValue, { emitEvent: false });
    this.cdr.detectChanges();
    
    // Initialize map after a longer delay to ensure it's fully ready
    setTimeout(() => {
      this.initializeMapIntegration();
    }, 200);
  }


  private updateRouteDisplay() {
    const waypointList = this.waypoints();
    const routeName = this.routeForm.get('name')?.value || 'Route';
    const description = this.routeForm.get('description')?.value || '';
    const enabled = this.routeForm.get('enabled')?.value as boolean;
    
    // Convert Waypoint[] to RouteWaypoint[]
    const routeWaypoints = waypointList.map(wp => ({
      id: wp.id || crypto.randomUUID(),
      lat: wp.lat,
      lng: wp.lng,
      order: wp.order,
      name: wp.name || `Waypoint ${wp.order + 1}`
    }));
    
    this.routeLayerService.setRouteData({
      id: this.route?.id,
      name: routeName,
      description: description,
      waypoints: routeWaypoints,
      enabled: enabled
    });
  }

  private fitMapToWaypoints() {
    if (this.waypoints().length === 0) return;
    
    // Add a small delay to ensure map is fully rendered
    setTimeout(() => {
      this.routeLayerService.fitToRoute();
    }, 200);
  }


  clearWaypoints() {
    this.waypoints.set([]);
    this.updateRouteDisplay();
  }

  showWaypointEditor() {
    this.showWaypointEditorDialog = true;
  }

  onWaypointsChange(newWaypoints: Waypoint[]) {
    this.waypoints.set(newWaypoints);
    this.updateRouteDisplay();
    this.fitMapToWaypoints();
  }

  hasUnsavedChanges(): boolean {
    // Check form changes
    const currentFormValue = this.routeForm.value;
    const formChanged = 
      currentFormValue.name !== this.originalFormValue.name ||
      currentFormValue.description !== this.originalFormValue.description ||
      currentFormValue.enabled !== this.originalFormValue.enabled;
    
    // Check waypoint changes
    const currentWaypoints = this.waypoints();
    const waypointsChanged = 
      currentWaypoints.length !== this.originalWaypoints.length ||
      !currentWaypoints.every((wp, i) => 
        this.originalWaypoints[i] && 
        wp.lat === this.originalWaypoints[i].lat && 
        wp.lng === this.originalWaypoints[i].lng
      );
    
    return formChanged || waypointsChanged;
  }

  canSave(): boolean {
    // Basic validation: form must be valid and have changes
    if (this.routeForm.invalid || !this.hasUnsavedChanges()) {
      return false;
    }
    
    // For create mode: must have at least 2 waypoints
    if (this.mode === 'create') {
      return this.waypoints().length >= 2;
    }
    
    // For edit mode: allow saving even with 0 waypoints if that's a change
    // (user might want to clear all waypoints from an existing route)
    // But still require at least 2 waypoints if adding new ones
    const currentWaypointCount = this.waypoints().length;
    const originalWaypointCount = this.originalWaypoints.length;
    
    // If clearing waypoints (had some, now have none), allow save
    if (originalWaypointCount > 0 && currentWaypointCount === 0) {
      return true;
    }
    
    // Otherwise, require at least 2 waypoints
    return currentWaypointCount >= 2;
  }

  onCancel() {
    if (this.mode !== 'view' && this.hasUnsavedChanges()) {
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


  saveRoute() {
    console.log('Save button clicked');
    console.log('Form valid:', this.routeForm.valid);
    console.log('Form value:', this.routeForm.value);
    console.log('Form errors:', this.routeForm.errors);
    console.log('Waypoints count:', this.waypoints().length);
    console.log('Can save:', this.canSave());
    
    if (this.canSave()) {
      const formValue = this.routeForm.value;
      const route: Route = {
        ...this.route,
        ...formValue,
        waypoints: this.waypoints()
      };
      this.save.emit(route);
      // Reset map state in case dialog closes
      this.mapReady.set(false);
      
      // Update original values to reflect the saved state
      this.originalFormValue = { ...formValue };
      this.originalWaypoints = [...this.waypoints()];
    } else {
      console.log('Cannot save - validation failed');
      if (!this.routeForm.valid) {
        Object.keys(this.routeForm.controls).forEach(key => {
          const control = this.routeForm.get(key);
          if (control && control.errors) {
            console.log(`Field ${key} errors:`, control.errors);
          }
        });
      }
      if (!this.hasUnsavedChanges()) {
        console.log('No changes detected');
      }
      if (this.waypoints().length < 2 && !(this.mode === 'edit' && this.originalWaypoints.length > 0 && this.waypoints().length === 0)) {
        console.log('Not enough waypoints');
      }
    }
  }
}