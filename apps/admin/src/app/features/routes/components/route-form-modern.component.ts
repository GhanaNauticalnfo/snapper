import { Component, input, output, OnInit, OnDestroy, AfterViewInit, viewChild, signal, effect, computed, ChangeDetectionStrategy, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
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
import { MapComponent, MapConfig, OSM_STYLE, RouteLayerService } from '@ghanawaters/map';
import { WaypointEditorDialogComponent } from './waypoint-editor-dialog.component';
import { RouteValidators } from '../validators/route.validators';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-route-form',
  standalone: true,
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
                @if (mode() !== 'view') {
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
                      label="Clear Waypoints"
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
            @if (mode() !== 'view') {
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
  host: {
    class: 'route-form-host'
  },
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
export class RouteFormComponent implements OnInit, OnDestroy, AfterViewInit {
  // Dependency injection using inject()
  private fb = inject(FormBuilder);
  private routeLayerService = inject(RouteLayerService);
  private confirmationService = inject(ConfirmationService);
  private cdr = inject(ChangeDetectorRef);
  
  // Inputs and outputs using new functions
  route = input<Route | null>(null);
  mode = input<'view' | 'edit' | 'create'>('view');
  save = output<Route>();
  cancel = output<void>();
  
  // View children
  mapComponent = viewChild<MapComponent>('mapComponent');

  // State
  routeForm: FormGroup;
  waypoints = signal<Waypoint[]>([]);
  mapConfig = signal<Partial<MapConfig>>({});
  showWaypointEditorDialog = false;
  mapReady = signal(false);
  
  // Simple change tracking
  formChanged = signal(false);
  originalWaypointCount = signal(0);
  
  // Computed values
  waypointsChanged = computed(() => {
    return this.waypoints().length !== this.originalWaypointCount();
  });
  
  canSave = computed(() => {
    // For edit mode: form must be valid and have changes
    if (this.mode() === 'edit') {
      return this.routeForm.valid && (this.formChanged() || this.waypointsChanged());
    }
    
    // For create mode: form must be valid and have at least 2 waypoints
    if (this.mode() === 'create') {
      return this.routeForm.valid && this.waypoints().length >= 2;
    }
    
    return false;
  });

  constructor() {
    // Initialize form with validators
    this.routeForm = this.fb.nonNullable.group({
      name: this.fb.nonNullable.control('', RouteValidators.routeName()),
      description: this.fb.nonNullable.control('', RouteValidators.routeDescription()),
      enabled: this.fb.nonNullable.control<boolean>(true)
    });
    
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
    
    // Effects to watch for changes
    effect(() => {
      const currentMode = this.mode();
      this.updateFormState();
    });
    
    effect(() => {
      const currentRoute = this.route();
      if (currentRoute !== null || this.mode() === 'create') {
        this.resetFormWithRouteData();
      }
    });
  }

  ngOnInit(): void {
    // Watch for form changes to update route display and track changes
    this.routeForm.valueChanges.subscribe(() => {
      this.updateRouteDisplay();
      // Mark form as changed when any value changes
      this.formChanged.set(true);
    });
  }

  ngAfterViewInit(): void {
    // Focus on the first input field
    const firstInput = document.querySelector('#name') as HTMLInputElement;
    if (firstInput) {
      firstInput.focus();
    }
  }

  ngOnDestroy(): void {
    // Reset map state for next time
    this.mapReady.set(false);
  }

  // Public method to prepare the map - called by parent component when dialog is shown
  public prepareMap(): void {
    this.mapReady.set(true);
    
    // Force change detection to ensure map container renders with proper dimensions
    this.cdr.detectChanges();
    
    // Initialize map with minimal delay like landing sites
    setTimeout(() => {
      this.initializeMapIntegration();
    }, 0);
  }

  private initializeMapIntegration(): void {
    const mapComponentRef = this.mapComponent();
    if (!mapComponentRef?.map) {
      console.error('Map component not ready');
      return;
    }

    const map = mapComponentRef.map;
    
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
        mapComponentRef.resize();
      }, 100);
    } else {
      map.once('styledata', () => {
        initializeRoute();
        // Ensure map layout is correct after initialization
        setTimeout(() => {
          mapComponentRef.resize();
        }, 100);
      });
    }
  }

  private resetFormWithRouteData(): void {
    const currentRoute = this.route();
    if (currentRoute) {
      // Reset form with route data
      const formData = {
        name: currentRoute.name || '',
        description: currentRoute.description || '',
        enabled: Boolean(currentRoute.enabled)
      };
      this.routeForm.reset(formData);
      
      // Force change detection to ensure PrimeNG InputSwitch updates
      this.cdr.detectChanges();
      
      this.waypoints.set(currentRoute.waypoints || []);
      
      // Reset change tracking
      this.formChanged.set(false);
      this.originalWaypointCount.set(currentRoute.waypoints?.length || 0);
    } else {
      // Reset form to default values for create mode
      const formData = {
        name: '',
        description: '',
        enabled: true
      };
      this.routeForm.reset(formData);
      this.waypoints.set([]);
      
      // Reset change tracking for create mode
      this.formChanged.set(false);
      this.originalWaypointCount.set(0);
    }
    
    // Update route display after form reset
    // Only update if map is ready, otherwise it will be updated when map initializes
    if (this.mapReady()) {
      setTimeout(() => {
        this.updateRouteDisplay();
        this.fitMapToWaypoints();
      }, 100);
    }
  }

  private updateFormState(): void {
    // Enable/disable form based on mode
    if (this.mode() === 'view') {
      this.routeForm.disable();
    } else {
      this.routeForm.enable();
    }
  }

  private updateRouteDisplay(): void {
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
      id: this.route()?.id,
      name: routeName,
      description: description,
      waypoints: routeWaypoints,
      enabled: enabled
    });
  }

  private fitMapToWaypoints(): void {
    if (this.waypoints().length === 0) return;
    
    // Add a small delay to ensure map is fully rendered
    setTimeout(() => {
      this.routeLayerService.fitToRoute();
    }, 200);
  }

  clearWaypoints(): void {
    this.waypoints.set([]);
    this.updateRouteDisplay();
  }

  showWaypointEditor(): void {
    this.showWaypointEditorDialog = true;
  }

  onWaypointsChange(newWaypoints: Waypoint[]): void {
    this.waypoints.set(newWaypoints);
    this.updateRouteDisplay();
    this.fitMapToWaypoints();
  }

  onCancel(): void {
    if (this.mode() !== 'view' && (this.formChanged() || this.waypointsChanged())) {
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

  saveRoute(): void {
    if (this.canSave()) {
      const formValue = this.routeForm.value;
      const currentRoute = this.route();
      
      // Only send fields that the API accepts
      const route: Route = {
        name: formValue.name,
        description: formValue.description,
        waypoints: this.waypoints(),
        enabled: formValue.enabled
      };
      
      // Add ID if this is an update (parent needs it to know which route to update)
      if (currentRoute?.id) {
        route.id = currentRoute.id;
      }
      
      this.save.emit(route);
      // Reset map state in case dialog closes
      this.mapReady.set(false);
      
      // Reset change tracking after save
      this.formChanged.set(false);
      this.originalWaypointCount.set(this.waypoints().length);
    }
  }
}