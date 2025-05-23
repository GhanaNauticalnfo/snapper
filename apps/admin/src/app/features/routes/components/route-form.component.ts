import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, AfterViewInit, ViewChild, ElementRef, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { InputSwitchModule } from 'primeng/inputswitch';
import { DividerModule } from 'primeng/divider';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { InputNumberModule } from 'primeng/inputnumber';
import { ColorPickerModule } from 'primeng/colorpicker';
import { Route, Waypoint } from '../models/route.model';
import { OSM_STYLE } from '@snapper/map';

@Component({
  selector: 'app-route-form',
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
    CardModule,
    TableModule,
    InputNumberModule,
    ColorPickerModule
  ],
  template: `
    <div class="route-form-container">
      <form [formGroup]="routeForm" class="flex gap-3" style="height: 100%;">
        <!-- Left side: Map -->
        <div class="flex-1" style="position: relative;">
          <div #mapContainer class="map-container"></div>
          @if (mode !== 'view') {
            <div class="map-instructions">
              <p class="m-0">Click on the map to add waypoints</p>
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

            <div class="flex gap-4 align-items-center">
              <div class="field-checkbox">
                <p-inputSwitch 
                  formControlName="enabled">
                </p-inputSwitch>
                <label class="ml-2">Active</label>
              </div>

              <div class="field flex align-items-center gap-2">
                <label>Route Color</label>
                <p-colorPicker 
                  formControlName="color">
                </p-colorPicker>
              </div>
            </div>

            <p-divider></p-divider>

            <div class="waypoints-section">
              <div class="flex justify-content-between align-items-center mb-3">
                <h4 class="m-0">Waypoints ({{ waypoints().length }})</h4>
                @if (mode !== 'view') {
                  <button 
                    pButton 
                    type="button" 
                    icon="pi pi-trash" 
                    label="Clear All"
                    class="p-button-danger p-button-sm"
                    (click)="clearWaypoints()"
                    [disabled]="waypoints().length === 0">
                  </button>
                }
              </div>

              <div class="waypoints-list">
                <p-table [value]="waypoints()" [scrollable]="true" scrollHeight="300px">
                  <ng-template pTemplate="header">
                    <tr>
                      <th style="width: 50px">#</th>
                      <th>Name</th>
                      <th style="width: 100px">Latitude</th>
                      <th style="width: 100px">Longitude</th>
                      @if (mode !== 'view') {
                        <th style="width: 80px">Actions</th>
                      }
                    </tr>
                  </ng-template>
                  <ng-template pTemplate="body" let-waypoint let-rowIndex="rowIndex">
                    <tr>
                      <td>{{ rowIndex + 1 }}</td>
                      <td>
                        @if (mode !== 'view') {
                          <input 
                            pInputText 
                            [(ngModel)]="waypoint.name" 
                            [ngModelOptions]="{standalone: true}"
                            placeholder="Waypoint name"
                            class="w-full p-inputtext-sm">
                        } @else {
                          {{ waypoint.name || '-' }}
                        }
                      </td>
                      <td>{{ waypoint.lat.toFixed(6) }}</td>
                      <td>{{ waypoint.lng.toFixed(6) }}</td>
                      @if (mode !== 'view') {
                        <td>
                          <button 
                            pButton 
                            type="button" 
                            icon="pi pi-arrow-up" 
                            class="p-button-text p-button-sm"
                            (click)="moveWaypoint(rowIndex, -1)"
                            [disabled]="rowIndex === 0"
                            pTooltip="Move up">
                          </button>
                          <button 
                            pButton 
                            type="button" 
                            icon="pi pi-arrow-down" 
                            class="p-button-text p-button-sm"
                            (click)="moveWaypoint(rowIndex, 1)"
                            [disabled]="rowIndex === waypoints().length - 1"
                            pTooltip="Move down">
                          </button>
                          <button 
                            pButton 
                            type="button" 
                            icon="pi pi-trash" 
                            class="p-button-text p-button-danger p-button-sm"
                            (click)="removeWaypoint(rowIndex)"
                            pTooltip="Remove">
                          </button>
                        </td>
                      }
                    </tr>
                  </ng-template>
                  <ng-template pTemplate="emptymessage">
                    <tr>
                      <td [attr.colspan]="mode === 'view' ? 4 : 5" class="text-center">
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
                (click)="cancel.emit()">
              </button>
              <button 
                pButton 
                type="button" 
                label="Save" 
                icon="pi pi-check"
                (click)="saveRoute()"
                [disabled]="routeForm.invalid || waypoints().length < 2">
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
    .route-form-container {
      height: 100%;
      overflow: hidden;
    }

    .map-container {
      width: 100%;
      height: 100%;
      min-height: 500px;
      border-radius: var(--border-radius);
    }

    .map-instructions {
      position: absolute;
      top: 10px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0, 0, 0, 0.7);
      color: #ffffff;
      padding: 0.5rem 1rem;
      border-radius: var(--border-radius);
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      font-weight: 500;
    }

    .form-panel {
      width: 400px;
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

    :host ::ng-deep .p-colorpicker-preview {
      width: 2rem;
      height: 2rem;
    }
  `]
})
export class RouteFormComponent implements OnInit, OnDestroy, AfterViewInit {
  @Input() route: Route | null = null;
  @Input() mode: 'view' | 'edit' | 'create' = 'view';
  @Output() save = new EventEmitter<Route>();
  @Output() cancel = new EventEmitter<void>();
  
  @ViewChild('mapContainer', { static: false }) mapContainer!: ElementRef<HTMLDivElement>;

  routeForm: FormGroup;
  waypoints = signal<Waypoint[]>([]);
  map: any; // Made public for resize access
  private markers: any[] = [];
  private routeLine: any;

  constructor(private fb: FormBuilder) {
    this.routeForm = this.fb.group({
      name: ['', Validators.required],
      description: [''],
      enabled: [true],
      color: ['#FF0000']
    });
  }

  ngOnInit() {
    if (this.route) {
      this.routeForm.patchValue({
        name: this.route.name,
        description: this.route.description,
        enabled: this.route.enabled,
        color: this.route.color || '#FF0000'
      });
      this.waypoints.set(this.route.waypoints || []);
    }
    
    // Disable form controls if in view mode
    if (this.mode === 'view') {
      this.routeForm.disable();
    }
  }

  ngAfterViewInit() {
    // Initialize map after view is ready and dialog is visible
    setTimeout(() => {
      this.initializeMap();
    }, 300);
  }

  ngOnDestroy() {
    if (this.map) {
      this.map.remove();
    }
  }

  async initializeMap() {
    const maplibre = await import('maplibre-gl');
    
    if (!this.mapContainer?.nativeElement) {
      console.error('Map container not found');
      return;
    }

    this.map = new maplibre.Map({
      container: this.mapContainer.nativeElement,
      style: OSM_STYLE as any,
      center: [-0.4, 6.7],
      zoom: 7
    });

    this.map.addControl(new maplibre.NavigationControl());

    if (this.mode !== 'view') {
      this.map.on('click', (e: any) => {
        const waypoint: Waypoint = {
          id: crypto.randomUUID(),
          lat: e.lngLat.lat,
          lng: e.lngLat.lng,
          order: this.waypoints().length
        };
        this.waypoints.update(waypoints => [...waypoints, waypoint]);
        this.updateMapDisplay();
      });
    }

    this.map.on('load', () => {
      // Ensure map is properly sized
      this.map.resize();
      this.updateMapDisplay();
      this.fitMapToWaypoints();
    });
  }

  updateMapDisplay() {
    if (!this.map) return;

    // Clear existing markers
    this.markers.forEach(marker => marker.remove());
    this.markers = [];

    // Remove existing route line
    if (this.map.getSource('route')) {
      this.map.removeLayer('route-line');
      this.map.removeSource('route');
    }

    const waypointList = this.waypoints();
    
    // Add markers for waypoints
    waypointList.forEach((waypoint, index) => {
      const el = document.createElement('div');
      el.className = 'waypoint-marker';
      el.style.width = '30px';
      el.style.height = '30px';
      el.style.borderRadius = '50%';
      el.style.backgroundColor = this.routeForm.get('color')?.value || '#FF0000';
      el.style.border = '3px solid white';
      el.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
      el.style.display = 'flex';
      el.style.alignItems = 'center';
      el.style.justifyContent = 'center';
      el.style.color = 'white';
      el.style.fontWeight = 'bold';
      el.style.fontSize = '12px';
      el.textContent = (index + 1).toString();

      const marker = new (window as any).maplibregl.Marker({ element: el })
        .setLngLat([waypoint.lng, waypoint.lat])
        .addTo(this.map);
      
      this.markers.push(marker);
    });

    // Draw route line if we have at least 2 waypoints
    if (waypointList.length >= 2) {
      const coordinates = waypointList.map(wp => [wp.lng, wp.lat]);
      
      this.map.addSource('route', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: coordinates
          }
        }
      });

      this.map.addLayer({
        id: 'route-line',
        type: 'line',
        source: 'route',
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': this.routeForm.get('color')?.value || '#FF0000',
          'line-width': 4,
          'line-opacity': 0.8
        }
      });
    }
  }

  fitMapToWaypoints() {
    if (!this.map || this.waypoints().length === 0) return;

    const bounds = new (window as any).maplibregl.LngLatBounds();
    this.waypoints().forEach(waypoint => {
      bounds.extend([waypoint.lng, waypoint.lat]);
    });

    this.map.fitBounds(bounds, { padding: 50 });
  }

  removeWaypoint(index: number) {
    this.waypoints.update(waypoints => {
      const updated = [...waypoints];
      updated.splice(index, 1);
      // Update order
      updated.forEach((wp, i) => wp.order = i);
      return updated;
    });
    this.updateMapDisplay();
  }

  moveWaypoint(index: number, direction: number) {
    this.waypoints.update(waypoints => {
      const updated = [...waypoints];
      const newIndex = index + direction;
      if (newIndex >= 0 && newIndex < updated.length) {
        [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
        // Update order
        updated.forEach((wp, i) => wp.order = i);
      }
      return updated;
    });
    this.updateMapDisplay();
  }

  clearWaypoints() {
    this.waypoints.set([]);
    this.updateMapDisplay();
  }

  saveRoute() {
    if (this.routeForm.valid && this.waypoints().length >= 2) {
      const formValue = this.routeForm.value;
      const route: Route = {
        ...this.route,
        ...formValue,
        waypoints: this.waypoints()
      };
      this.save.emit(route);
    }
  }
}