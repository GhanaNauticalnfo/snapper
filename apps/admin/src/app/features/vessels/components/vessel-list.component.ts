// features/vessels/components/vessel-list.component.ts
import { Component, OnInit, inject, signal, computed, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormsModule } from '@angular/forms';
import { VesselDatasetService } from '../services/vessel-dataset.service';
import { VesselDataset } from '../models/vessel-dataset.model';
import { OSM_STYLE } from '@snapper/map';
import { TimeAgoPipe } from '@snapper/shared';

interface Device {
  device_id: string;
  device_token: string;
  activation_token: string;
  auth_token: string | null;
  is_activated: boolean;
  activated_at: Date | null;
  expires_at: Date;
  vessel_id: number;
  created_at: Date;
  updated_at: Date;
  activation_url?: string;
}

// PrimeNG imports
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ToastModule } from 'primeng/toast';
import { DialogModule } from 'primeng/dialog';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService, MessageService } from 'primeng/api';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/dropdown';
import { CheckboxModule } from 'primeng/checkbox';
import { TooltipModule } from 'primeng/tooltip';
import { SkeletonModule } from 'primeng/skeleton';
import { CalendarModule } from 'primeng/calendar';
import { InputNumberModule } from 'primeng/inputnumber';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { DividerModule } from 'primeng/divider';
import { TabViewModule } from 'primeng/tabview';

@Component({
  selector: 'app-vessel-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    FormsModule,
    TableModule,
    ButtonModule,
    ProgressSpinnerModule,
    ToastModule,
    DialogModule,
    ConfirmDialogModule,
    CardModule,
    InputTextModule,
    DropdownModule,
    CheckboxModule,
    TooltipModule,
    SkeletonModule,
    CalendarModule,
    InputNumberModule,
    IconFieldModule,
    InputIconModule,
    DividerModule,
    TabViewModule,
    TimeAgoPipe
  ],
  providers: [ConfirmationService, MessageService],
  template: `
    <p-toast></p-toast>
    <p-confirmDialog
      header="Confirm Deletion" 
      icon="pi pi-exclamation-triangle" 
      acceptButtonStyleClass="p-button-danger" 
      acceptIcon="pi pi-trash"
      rejectButtonStyleClass="p-button-secondary"
      [style]="{width: '50vw', 'max-width': '600px'}">
    </p-confirmDialog>

    <!-- Vessel List View -->
    @if (!vesselDialogVisible) {
      <div class="vessel-list-container">
        <div class="flex justify-content-between align-items-center mb-3">
          <h4>Vessels</h4>
        <div class="flex gap-2 align-items-center">
          <p-iconField iconPosition="left">
            <p-inputIcon>
              <i class="pi pi-search"></i>
            </p-inputIcon>
            <input 
              type="text" 
              pInputText 
              placeholder="Search by vessel name..." 
              [ngModel]="searchTerm()"
              (ngModelChange)="onSearchChange($event)"
              class="search-input"
            />
          </p-iconField>
          <p-button 
            label="Add New Vessel" 
            icon="pi pi-plus" 
            styleClass="p-button-success" 
            (onClick)="openNewDialog()">
          </p-button>
        </div>
      </div>

      @if (loading() && datasets().length === 0) {
        <div class="loading-container">
          <p-progressSpinner></p-progressSpinner>
        </div>
      }

      <p-table
        [value]="filteredDatasets()"
        [tableStyle]="{ 'min-width': '50rem' }"
        [paginator]="filteredDatasets().length > 10"
        [rows]="10"
        styleClass="p-datatable-sm p-datatable-striped"
        [rowHover]="true"
        [loading]="loading()"
      >
        <ng-template pTemplate="header">
          <tr>
            <th pSortableColumn="id" style="width: 10%">ID <p-sortIcon field="id"></p-sortIcon></th>
            <th pSortableColumn="name" style="width: 20%">Name <p-sortIcon field="name"></p-sortIcon></th>
            <th pSortableColumn="type" style="width: 15%">Type <p-sortIcon field="type"></p-sortIcon></th>
            <th pSortableColumn="last_seen" style="width: 20%">Last Seen <p-sortIcon field="last_seen"></p-sortIcon></th>
            <th pSortableColumn="enabled" style="width: 10%">Enabled <p-sortIcon field="enabled"></p-sortIcon></th>
          </tr>
        </ng-template>

        <ng-template pTemplate="body" let-vessel>
          <tr class="clickable-row" (click)="openViewDialog(vessel)">
            <td><span class="font-mono">{{ vessel.id }}</span></td>
            <td>{{ vessel.name }}</td>
            <td>
              <span [class]="vessel.type === 'Canoe' ? 'type-badge type-cannoo' : 'type-badge type-vessel'">
                {{ vessel.type }}
              </span>
            </td>
            <td>
              {{ vessel.last_seen | date:'dd/MM/yyyy HH:mm:ss' }}
              <span class="text-muted"> ({{ vessel.last_seen | timeAgo }})</span>
            </td>
            <td>
              <span [class]="vessel.enabled ? 'status-badge status-enabled' : 'status-badge status-disabled'">
                {{ vessel.enabled ? 'Yes' : 'No' }}
              </span>
            </td>
          </tr>
        </ng-template>

        <ng-template pTemplate="emptymessage">
          <tr>
            <td colspan="5" class="text-center p-4">
              @if (!loading() && !error() && searchTerm()) {
                No vessels found matching "{{ searchTerm() }}".
              } @else if (!loading() && !error()) {
                No vessels found.
              } @else if (error()) {
                <div class="p-error">{{ error() }}</div>
              } @else {
                <span></span>
              }
            </td>
          </tr>
        </ng-template>
        <ng-template pTemplate="loadingbody">
          @for (item of [1, 2, 3]; track $index) {
            <tr>
              <td><p-skeleton></p-skeleton></td>
              <td><p-skeleton></p-skeleton></td>
              <td><p-skeleton></p-skeleton></td>
              <td><p-skeleton></p-skeleton></td>
              <td><p-skeleton></p-skeleton></td>
            </tr>
          }
        </ng-template>
      </p-table>
      </div>
    }

    <!-- Vessel Details View -->
    @if (vesselDialogVisible && selectedVessel()) {
      <div class="vessel-details-container">
        <!-- Header with Back Button -->
        <div class="vessel-details-header">
          <div class="mb-3">
            <p-button 
              label="Back to Vessels" 
              icon="pi pi-arrow-left" 
              styleClass="p-button-secondary" 
              (onClick)="closeVesselDialog()">
            </p-button>
          </div>
          <h4 class="mb-3">{{ selectedVessel()?.name }} ({{ selectedVessel()?.type }})</h4>
        </div>
      @if (selectedVessel()) {
        <p-tabView [(activeIndex)]="activeTabIndex" (onChange)="onTabChange($event)" styleClass="vessel-tabs">
          <!-- Info Tab -->
          <p-tabPanel header="Info" leftIcon="pi pi-info-circle">
            <div class="view-dialog-content">
              <!-- Basic Information Section -->
              <div class="vessel-info-section">
                <h5 class="section-title">Vessel Information</h5>
            <form [formGroup]="vesselForm" class="vessel-details-form">
              <div class="info-rows">
                <!-- Name with rename button -->
                <div class="info-row">
                  <label class="field-label">Name</label>
                  <div class="field-content">
                    <input 
                      type="text" 
                      pInputText 
                      formControlName="name" 
                      class="field-input"
                      placeholder="Enter vessel name"
                    />
                    <p-button 
                      label="Rename" 
                      styleClass="p-button-sm"
                      (onClick)="saveName()"
                      [loading]="savingName()"
                    ></p-button>
                    @if (nameUpdateStatus() === 'success') {
                      <i class="pi pi-check status-icon success-icon"></i>
                    } @else if (nameUpdateStatus() === 'error') {
                      <i class="pi pi-times status-icon error-icon"></i>
                    }
                  </div>
                </div>

                <!-- Type -->
                <div class="info-row">
                  <label for="vessel-type" class="field-label">Type</label>
                  <div class="field-content">
                    <p-dropdown
                      id="vessel-type"
                      formControlName="type"
                      [options]="vesselTypes"
                      optionLabel="label"
                      optionValue="value"
                      placeholder="Select type"
                      class="inline-dropdown"
                      (onChange)="updateType()"
                    ></p-dropdown>
                    @if (typeUpdateStatus() === 'saving') {
                      <p-progressSpinner styleClass="status-spinner"></p-progressSpinner>
                    } @else if (typeUpdateStatus() === 'success') {
                      <i class="pi pi-check status-icon success-icon"></i>
                    } @else if (typeUpdateStatus() === 'error') {
                      <i class="pi pi-times status-icon error-icon"></i>
                    }
                  </div>
                </div>

                <!-- Status -->
                <div class="info-row">
                  <label for="vessel-enabled" class="field-label">Status</label>
                  <div class="field-content">
                    <div class="checkbox-wrapper">
                      <p-checkbox
                        id="vessel-enabled"
                        formControlName="enabled"
                        [binary]="true"
                        (onChange)="updateEnabled()"
                      ></p-checkbox>
                      <label for="vessel-enabled" class="checkbox-label">Enabled</label>
                    </div>
                    @if (enabledUpdateStatus() === 'saving') {
                      <p-progressSpinner styleClass="status-spinner"></p-progressSpinner>
                    } @else if (enabledUpdateStatus() === 'success') {
                      <i class="pi pi-check status-icon success-icon"></i>
                    } @else if (enabledUpdateStatus() === 'error') {
                      <i class="pi pi-times status-icon error-icon"></i>
                    }
                  </div>
                </div>

                <!-- Created -->
                <div class="info-row">
                  <label class="field-label">Created</label>
                  <div class="field-content">
                    <span class="field-value readonly">{{ selectedVessel()?.created | date:'dd/MM/yyyy HH:mm:ss' }}</span>
                  </div>
                </div>
              </div>
            </form>
          </div>
            </div>
          </p-tabPanel>
          
          <!-- Device Tab -->
          <p-tabPanel header="Device" leftIcon="pi pi-mobile">
            <div class="view-dialog-content">
              <!-- Device Management Section -->
              <div class="device-section">
            <div class="section-header">
              <h5 class="section-title">Devices</h5>
              <p-button 
                label="Add Device" 
                icon="pi pi-plus" 
                styleClass="p-button-success action-button"
                (onClick)="createDevice()"
                [disabled]="loadingDevices()"
              ></p-button>
            </div>
            
            @if (loadingDevices()) {
              <div class="text-center">
                <p-progressSpinner styleClass="w-4rem h-4rem"></p-progressSpinner>
              </div>
            } @else if (devices().length === 0) {
              <div class="no-devices-message">
                <i class="pi pi-mobile"></i>
                <p>No devices created yet.</p>
                <p class="text-muted">Create a device to allow mobile devices to report vessel positions.</p>
              </div>
            } @else {
              <div class="devices-list">
                @for (device of devices(); track device.device_id) {
                  <p-card>
                    <div class="device-info">
                      <div class="device-row">
                        <span class="device-label">Status:</span>
                        <span 
                          class="device-status"
                          [ngClass]="getDeviceStatusClass(device)"
                        >
                          {{ getDeviceStatus(device) }}
                        </span>
                        @if (!isDeviceExpired(device) && !device.is_activated) {
                          <span class="time-remaining ml-2">
                            Expires {{ device.expires_at | date:'dd/MM/yyyy HH:mm' }}
                          </span>
                        }
                      </div>
                      
                      <div class="device-row">
                        <span class="device-label">Device ID:</span>
                        <span class="detail-value font-mono">{{ device.device_id }}</span>
                      </div>
                      
                      @if (!device.is_activated && !isDeviceExpired(device)) {
                        <div class="device-row activation-url-row">
                          <span class="device-label">Activation Link:</span>
                          <div class="url-container">
                            <input 
                              type="text" 
                              class="url-input" 
                              [value]="getPublicActivationUrl(device)" 
                              readonly
                            />
                            <p-button 
                              icon="pi pi-copy" 
                              styleClass="p-button-sm p-button-outlined"
                              (onClick)="copyToClipboard(getPublicActivationUrl(device))"
                              pTooltip="Copy activation link"
                            ></p-button>
                            <a 
                              [href]="getPublicActivationUrl(device)"
                              target="_blank"
                              class="activation-link-button"
                              pTooltip="Open activation page"
                            >
                              <p-button 
                                icon="pi pi-external-link" 
                                styleClass="p-button-sm p-button-success"
                                label="Open"
                              ></p-button>
                            </a>
                          </div>
                        </div>
                      }
                      
                      @if (device.is_activated && device.activated_at) {
                        <div class="device-row">
                          <span class="device-label">Activated:</span>
                          <span class="detail-value">{{ device.activated_at | date:'dd/MM/yyyy HH:mm:ss' }}</span>
                        </div>
                      }
                      
                      <div class="device-actions">
                        @if (!isDeviceExpired(device)) {
                          <p-button 
                            label="Regenerate" 
                            icon="pi pi-refresh" 
                            styleClass="p-button-sm p-button-warning"
                            (onClick)="regenerateDevice(device)"
                            [disabled]="loadingDevices()"
                          ></p-button>
                        }
                        <p-button 
                          label="Delete" 
                          icon="pi pi-trash" 
                          styleClass="p-button-sm p-button-danger"
                          (onClick)="deleteDevice(device)"
                          [disabled]="loadingDevices()"
                        ></p-button>
                      </div>
                    </div>
                  </p-card>
                }
              </div>
              }
              </div>
            </div>
          </p-tabPanel>
          
          <!-- Track Tab -->
          <p-tabPanel header="Track" leftIcon="pi pi-map-marker">
            <div class="tracking-dialog-content">
              <!-- Tracking Header with Key Info -->
              <div class="tracking-header">
                <div class="vessel-summary">
                  <div class="vessel-title">
                    <h4>{{ selectedVessel()?.name }}</h4>
                    <span class="vessel-type-badge" [class.type-canoe]="selectedVessel()?.type === 'Canoe'" [class.type-vessel]="selectedVessel()?.type === 'Vessel'">
                      {{ selectedVessel()?.type }}
                    </span>
                  </div>
                  <div class="tracking-stats">
                    <div class="stat-item">
                      <span class="stat-label">Last Report:</span>
                      <span class="stat-value">
                        {{ selectedVessel()?.last_seen | date:'dd/MM/yyyy HH:mm:ss' }}
                        <span class="time-ago">({{ selectedVessel()?.last_seen | timeAgo }})</span>
                      </span>
                    </div>
                    <div class="stat-item">
                      <span class="stat-label">Coordinates:</span>
                      <span class="stat-value coordinates">
                        {{ selectedVessel()?.last_position?.latitude?.toFixed(6) || 'N/A' }}, 
                        {{ selectedVessel()?.last_position?.longitude?.toFixed(6) || 'N/A' }}
                      </span>
                    </div>
                    <div class="stat-item">
                      <p-button 
                        label="Show Nearby Vessels" 
                        icon="pi pi-map-marker" 
                        styleClass="p-button-secondary action-button"
                        (onClick)="openNearbyDialog()"
                        [badge]="nearbyVessels().length > 0 ? nearbyVessels().length.toString() : undefined"
                      ></p-button>
                      <span class="nearby-info">Within {{ NEARBY_RADIUS_KM }}km in last {{ NEARBY_TIME_WINDOW_DAYS }} days</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Map Container -->
              <div class="tracking-map-container">
                <div #trackingMapContainer class="tracking-map"></div>
              </div>
            </div>
          </p-tabPanel>
          
          <!-- Danger Zone Tab -->
          <p-tabPanel header="Danger Zone" leftIcon="pi pi-exclamation-triangle">
            <div class="view-dialog-content">
              <div class="danger-zone-section">
                <h5 class="section-title danger-zone-title">Danger Zone</h5>
                <div class="danger-zone">
                  <p class="danger-zone-description">
                    Permanently delete this vessel and all associated data. This action cannot be undone.
                  </p>
                  <p-button 
                    label="Delete Vessel Permanently" 
                    icon="pi pi-trash" 
                    styleClass="p-button-danger action-button" 
                    (onClick)="confirmDelete(selectedVessel()!)">
                  </p-button>
                </div>
              </div>
            </div>
          </p-tabPanel>
        </p-tabView>
      }
      </div>
    }

    <!-- Create Dialog (for new vessels only) -->
    <p-dialog
      [(visible)]="formDialogVisible"
      [style]="{width: '70vw', 'max-width': '800px'}"
      [modal]="true"
      [draggable]="false"
      [resizable]="false"
      [closeOnEscape]="true"
      [closable]="true"
      header="Create New Vessel"
      (onHide)="closeFormDialog()"
    >
      <form [formGroup]="vesselForm" class="form-container">
        <div class="form-group">
          <label for="name" class="form-label">Name <span class="required-asterisk">*</span></label>
          <span class="p-input-icon-left w-full">
            <i class="pi pi-tag"></i>
            <input
              type="text"
              pInputText
              id="name"
              formControlName="name"
              placeholder="Enter a name for the vessel"
              class="w-full"
              [ngClass]="{'ng-invalid ng-dirty': vesselForm.controls['name'].invalid && vesselForm.controls['name'].touched}"
            />
          </span>
           @if (vesselForm.controls['name'].invalid && vesselForm.controls['name'].touched) {
             <small class="p-error block mt-1">Name is required.</small>
           }
        </div>

        <div class="form-group">
          <label for="type" class="form-label">Type <span class="required-asterisk">*</span></label>
          <p-dropdown
            id="type"
            formControlName="type"
            [options]="vesselTypes"
            optionLabel="label"
            optionValue="value"
            placeholder="Select vessel type"
            [style]="{'width':'100%'}"
            [ngClass]="{'ng-invalid ng-dirty': vesselForm.controls['type'].invalid && vesselForm.controls['type'].touched}"
          ></p-dropdown>
          @if (vesselForm.controls['type'].invalid && vesselForm.controls['type'].touched) {
            <small class="p-error block mt-1">Type is required.</small>
          }
        </div>

        <div class="form-group">
          <label for="enabled" class="form-label">Status</label>
          <div class="p-field-checkbox">
            <p-checkbox
              formControlName="enabled"
              [binary]="true"
              inputId="enabled"
            ></p-checkbox>
            <label for="enabled" class="ml-2">Enabled</label>
          </div>
        </div>
      </form>

      <ng-template pTemplate="footer">
        <p-button
          icon="pi pi-save"
          label="Create"
          styleClass="p-button-success mr-2"
          (onClick)="saveVessel()"
          [disabled]="vesselForm.invalid || saving()"
          [loading]="saving()"
        ></p-button>
        <p-button
          icon="pi pi-times"
          label="Cancel"
          styleClass="p-button-secondary"
          (onClick)="closeFormDialog()"
          [disabled]="saving()"
        ></p-button>
      </ng-template>
    </p-dialog>


    <!-- Nearby Vessels Dialog -->
    <p-dialog
      [(visible)]="nearbyDialogVisible"
      [style]="{width: '85vw', 'max-width': '1200px', height: '80vh'}"
      [modal]="true"
      [draggable]="false"
      [resizable]="false"
      [closeOnEscape]="true"
      [closable]="true"
      header="Nearby Vessels"
      (onHide)="closeNearbyDialog()"
    >
      <div class="nearby-dialog-content">
        <div class="nearby-header">
          <h5>Vessels within {{ NEARBY_RADIUS_KM }}km of {{ selectedVessel()?.name }}</h5>
          <p class="text-muted">Showing vessels that reported position in the last {{ NEARBY_TIME_WINDOW_DAYS }} days</p>
        </div>
        
        <div class="nearby-container">
          <div class="nearby-list">
            @if (nearbyVessels().length === 0) {
              <div class="no-vessels-message">
                <i class="pi pi-info-circle"></i>
                <p>No vessels found within the specified range and time period.</p>
              </div>
            } @else {
              <div class="vessel-count">Found {{ nearbyVessels().length }} vessel{{ nearbyVessels().length > 1 ? 's' : '' }}</div>
              @for (vessel of nearbyVessels(); track vessel.id) {
                <div class="nearby-vessel-card" (click)="selectNearbyVessel(vessel)" [class.selected]="selectedNearbyVessel()?.id === vessel.id">
                  <div class="vessel-header">
                    <strong>{{ vessel.name }}</strong>
                    <span class="vessel-type-badge" [class.type-canoe]="vessel.type === 'Canoe'" [class.type-vessel]="vessel.type === 'Vessel'">{{ vessel.type }}</span>
                  </div>
                  <div class="vessel-info-row">
                    <i class="pi pi-map-marker"></i>
                    <span>{{ vessel.last_position?.latitude?.toFixed(4) }}°, {{ vessel.last_position?.longitude?.toFixed(4) }}°</span>
                  </div>
                  <div class="vessel-info-row">
                    <i class="pi pi-clock"></i>
                    <span>{{ vessel.last_seen | timeAgo }}</span>
                    <span class="exact-time">({{ vessel.last_seen | date:'dd/MM HH:mm' }})</span>
                  </div>
                  <div class="vessel-info-row">
                    <i class="pi pi-compass"></i>
                    @if (selectedVessel()?.last_position?.latitude && selectedVessel()?.last_position?.longitude && vessel.last_position?.latitude && vessel.last_position?.longitude) {
                      <span>{{ calculateDistance(
                        selectedVessel()!.last_position!.latitude,
                        selectedVessel()!.last_position!.longitude,
                        vessel.last_position!.latitude,
                        vessel.last_position!.longitude
                      ).toFixed(1) }} km away</span>
                    } @else {
                      <span>Distance unavailable</span>
                    }
                  </div>
                </div>
              }
            }
          </div>
          
          <div class="nearby-map">
            <div #nearbyMapContainer class="nearby-map-container"></div>
          </div>
        </div>
      </div>
      
      <ng-template pTemplate="footer">
        <p-button label="Close" icon="pi pi-times" styleClass="p-button-secondary" (onClick)="closeNearbyDialog()"></p-button>
      </ng-template>
    </p-dialog>
  `,
  styles: [`
    :host { display: block; }
    .vessel-list-container { margin-top: 0; }
    .vessel-details-container { margin-top: 0; }
    .vessel-details-header { margin-top: 0; }
    .font-mono { font-family: monospace; background-color: var(--surface-100); padding: 0.1rem 0.3rem; border-radius: 3px; }
    
    /* PrimeNG datatable styling */
    :host ::ng-deep .p-datatable-sm .p-datatable-tbody > tr > td { padding: 0.6rem 0.8rem; vertical-align: middle; }
    :host ::ng-deep .p-datatable .p-datatable-thead > tr > th {
      text-align: left;
      background-color: var(--surface-100) !important;
      font-size: 0.85rem;
      padding: 0.6rem 0.8rem;
      white-space: nowrap;
      cursor: pointer;
    }
    :host ::ng-deep .p-datatable .p-sortable-column:not(.p-highlight):hover {
      background-color: var(--surface-200) !important;
      color: var(--text-color);
    }
    :host ::ng-deep .p-datatable .p-sortable-column.p-highlight {
      background-color: var(--surface-100) !important;
      color: var(--text-color);
    }
    :host ::ng-deep .p-tag { font-size: 0.8rem; }
    :host ::ng-deep .p-sortable-column .p-sortable-column-icon { margin-left: 0.5em; vertical-align: middle; }
    
    p-message { margin-bottom: 1rem; }
    .text-center { text-align: center; }
    
    .loading-container {
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 2rem;
      min-height: 200px;
    }

    .status-badge, .type-badge {
      border-radius: 4px;
      padding: 0.25rem 0.5rem;
      text-transform: uppercase;
      font-weight: 700;
      font-size: 0.75rem;
      letter-spacing: 0.3px;
      display: inline-block;
    }

    .status-enabled {
      background-color: var(--green-100, #C8E6C9);
      color: var(--green-700, #256029);
    }

    .status-disabled {
      background-color: var(--red-100, #FFCDD2);
      color: var(--red-700, #C63737);
    }

    .type-cannoo {
      background-color: var(--blue-100, #BBDEFB);
      color: var(--blue-700, #1565C0);
    }

    .type-vessel {
      background-color: var(--orange-100, #FFE0B2);
      color: var(--orange-700, #E65100);
    }

    .detail-item {
      margin-bottom: 1rem;
      display: flex;
      align-items: flex-start;
      gap: 0.5rem;
    }

    .detail-label {
      font-weight: 600;
      min-width: 120px;
      flex-shrink: 0;
    }
    .detail-value {
      font-size: 0.875rem;
      word-break: break-word;
    }

    .form-container {
      padding: 0.5rem 0;
    }

    .form-group {
      margin-bottom: 1.5rem;
    }

    .form-label {
      display: block;
      margin-bottom: 0.5rem;
      font-weight: 500;
    }

    .required-asterisk {
      color: var(--red-500, #f44336);
    }

    .p-field-checkbox {
      display: flex;
      align-items: center;
    }

    /* Utility classes */
    .w-full { width: 100%; }
    .mr-2 { margin-right: 0.5rem; }
    .ml-2 { margin-left: 0.5rem; }
    .mt-1 { margin-top: 0.25rem; }
    .block { display: block; }
    .flex { display: flex; }
    .justify-content-between { justify-content: space-between; }
    .align-items-center { align-items: center; }
    .mb-3 { margin-bottom: 1rem; }
    .gap-2 { gap: 0.5rem; }
    
    .search-input {
      width: 300px;
    }

    /* PrimeNG Input Validation Highlighting */
    .ng-invalid.ng-dirty {
       border-color: var(--red-500, #f44336);
    }

    .grid { display: flex; flex-wrap: wrap; margin-right: -0.5rem; margin-left: -0.5rem; row-gap: 0.5rem; }
    .col-12 { flex: 0 0 100%; padding: 0 0.5rem; max-width: 100%; }

    @media (min-width: 768px) {
      .md\\:col-6 { flex: 0 0 50%; max-width: 50%; }
    }

    .map-container {
      height: 300px;
      width: 100%;
      border: 1px solid var(--surface-300);
      border-radius: 4px;
      margin-top: 1rem;
    }

    h5 {
      margin-bottom: 1rem;
      color: var(--text-color);
    }
    
    .text-muted {
      color: var(--text-color-secondary, #6c757d);
      font-size: 0.9em;
    }
    
    .nearby-vessels-list {
      background: var(--surface-100);
      border: 1px solid var(--surface-300);
      border-radius: 4px;
      padding: 1rem;
    }
    
    .nearby-vessels-list h6 {
      margin: 0 0 0.75rem 0;
      color: var(--text-color);
    }
    
    .nearby-vessel-item {
      padding: 0.5rem;
      border-bottom: 1px solid var(--surface-200);
    }
    
    .nearby-vessel-item:last-child {
      border-bottom: none;
    }
    
    .vessel-info {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 0.25rem;
    }
    
    .vessel-type-badge {
      font-size: 0.7rem;
      padding: 0.1rem 0.3rem;
      border-radius: 3px;
      font-weight: 600;
    }
    
    .vessel-type-badge.type-canoe {
      background-color: var(--blue-100);
      color: var(--blue-700);
    }
    
    .vessel-type-badge.type-vessel {
      background-color: var(--orange-100);
      color: var(--orange-700);
    }
    
    .vessel-details {
      display: flex;
      justify-content: space-between;
      font-size: 0.85rem;
      color: var(--text-color-secondary);
    }
    
    .coordinates {
      font-family: monospace;
    }
    
    .mb-3 { margin-bottom: 1rem; }
    .mt-3 { margin-top: 1rem; }
    
    /* Device Styles */
    .device-section {
      margin-top: 1rem;
    }
    
    .device-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }
    
    .devices-list {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    
    .device-info {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    
    .device-row {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    
    .device-label {
      font-weight: 600;
      font-size: 0.875rem;
      min-width: 80px;
      flex-shrink: 0;
    }
    
    .device-status {
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-size: 0.8rem;
      font-weight: 600;
    }
    
    .device-status.pending {
      background-color: var(--orange-100);
      color: var(--orange-700);
    }
    
    .device-status.activated {
      background-color: var(--green-100);
      color: var(--green-700);
    }
    
    .device-status.expired {
      background-color: var(--red-100);
      color: var(--red-700);
    }
    
    .activation-url-row {
      align-items: flex-start;
    }
    
    .url-container {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex: 1;
    }
    
    .url-input {
      flex: 1;
      padding: 0.5rem;
      border: 1px solid var(--surface-border);
      border-radius: 4px;
      font-family: monospace;
      font-size: 0.9rem;
      background: var(--surface-ground);
      color: var(--text-color);
    }
    
    .device-actions {
      display: flex;
      gap: 0.5rem;
      margin-top: 0.5rem;
    }
    
    .time-remaining {
      font-size: 0.85rem;
      opacity: 0.7;
    }
    
    .no-devices-message {
      text-align: center;
      padding: 2rem;
      color: var(--text-color-secondary);
      background: var(--surface-ground);
      border-radius: 4px;
    }
    
    .no-devices-message i {
      font-size: 2rem;
      margin-bottom: 0.5rem;
      display: block;
      opacity: 0.5;
    }
    
    /* Clickable row styles */
    .clickable-row {
      cursor: pointer !important;
      transition: background-color 0.2s ease;
    }
    
    .clickable-row:hover {
      background-color: var(--surface-100) !important;
    }
    
    .activation-link-button {
      text-decoration: none;
      margin-left: 0.5rem;
    }
    
    /* Dialog footer styles */
    :host ::ng-deep .p-dialog-footer {
      padding: 1rem 1.5rem;
      border-top: 1px solid var(--surface-300);
    }
    
    .dialog-footer {
      display: flex;
      justify-content: flex-end;
      align-items: center;
      width: 100%;
    }
    
    .footer-right {
      display: flex;
      gap: 0.75rem;
      align-items: center;
    }
    
    /* Consistent button styling */
    .action-button {
      height: 40px;
      padding: 0 1rem;
      font-size: 0.875rem;
      font-weight: 500;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
    }
    
    /* Section styling */
    .vessel-info-section,
    .device-section,
    .position-section {
      margin-bottom: 1.5rem;
    }
    
    .section-title {
      margin: 0 0 1rem 0;
      color: var(--text-color);
      font-size: 1.1rem;
      font-weight: 600;
    }
    
    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }
    
    /* Info rows layout */
    .info-rows {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    
    .info-row {
      display: flex;
      align-items: center;
      gap: 1rem;
    }
    
    .field-label {
      font-weight: 600;
      font-size: 0.875rem;
      color: var(--text-color);
      min-width: 80px;
      flex-shrink: 0;
    }
    
    .field-content {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex: 1;
    }
    
    .field-value {
      font-size: 0.875rem;
      color: var(--text-color);
    }
    
    .field-value.readonly {
      color: var(--text-color-secondary);
      font-style: italic;
    }
    
    /* Field input styles */
    .field-input {
      width: 200px;
      height: 32px;
      padding: 0 0.5rem;
      border: 1px solid var(--surface-border);
      border-radius: 4px;
      background: var(--surface-card);
      color: var(--text-color);
      font-size: 0.875rem;
    }
    
    .field-input:focus {
      border-color: var(--primary-color);
      box-shadow: 0 0 0 2px var(--primary-color-transparent);
      outline: none;
    }
    
    .inline-dropdown {
      flex: 1;
      max-width: 200px;
    }
    
    :host ::ng-deep .inline-dropdown .p-dropdown {
      height: 32px;
      width: 100%;
    }
    
    .checkbox-wrapper {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    
    .checkbox-label {
      font-size: 0.875rem;
      color: var(--text-color);
      margin: 0;
    }
    
    /* Status indicators */
    .status-icon {
      font-size: 1rem;
      margin-left: 0.5rem;
    }
    
    .success-icon {
      color: var(--green-500);
    }
    
    .error-icon {
      color: var(--red-500);
    }
    
    .status-spinner {
      width: 16px !important;
      height: 16px !important;
      margin-left: 0.5rem;
    }
    
    :host ::ng-deep .status-spinner .p-progress-spinner-circle {
      stroke-width: 4;
    }
    
    /* Tracking Dialog Styles */
    .tracking-dialog-content {
      height: 100%;
      display: flex;
      flex-direction: column;
    }
    
    .tracking-header {
      padding: 1.5rem;
      border-bottom: 1px solid var(--surface-300);
      background: var(--surface-50);
    }
    
    .vessel-summary {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    
    .vessel-title {
      display: flex;
      align-items: center;
      gap: 1rem;
    }
    
    .vessel-title h4 {
      margin: 0;
      color: var(--text-color);
      font-size: 1.5rem;
    }
    
    .vessel-type-badge {
      padding: 0.25rem 0.75rem;
      border-radius: 12px;
      font-size: 0.875rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.025em;
    }
    
    .vessel-type-badge.type-canoe {
      background: var(--blue-100);
      color: var(--blue-700);
    }
    
    .vessel-type-badge.type-vessel {
      background: var(--orange-100);
      color: var(--orange-700);
    }
    
    .tracking-stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 1rem;
      align-items: center;
    }
    
    .stat-item {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }
    
    .stat-item:last-child {
      flex-direction: row;
      align-items: center;
      gap: 0.75rem;
    }
    
    .stat-label {
      font-weight: 600;
      font-size: 0.875rem;
      color: var(--text-color-secondary);
    }
    
    .stat-value {
      font-size: 1rem;
      color: var(--text-color);
    }
    
    .coordinates {
      font-family: monospace;
      background: var(--surface-ground);
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-size: 0.875rem;
      color: var(--text-color);
    }
    
    .time-ago {
      color: var(--text-color-secondary);
      font-size: 0.875rem;
    }
    
    .nearby-info {
      color: var(--text-color-secondary);
      font-size: 0.875rem;
    }
    
    .tracking-map-container {
      flex: 1;
      position: relative;
      overflow: hidden;
    }
    
    .tracking-map {
      width: 100%;
      height: 100%;
      min-height: 500px;
    }

    /* Danger Zone Styles */
    .danger-zone-section {
      margin-bottom: 1.5rem;
    }
    
    .danger-zone {
      padding: 1rem;
      border: 1px solid var(--red-400);
      border-radius: 8px;
      background: var(--red-50);
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    
    .danger-zone-title {
      color: var(--red-700);
    }
    
    .danger-zone-description {
      margin: 0;
      color: var(--red-600);
      font-size: 0.875rem;
      line-height: 1.4;
    }
    
    /* Dark mode adjustments for danger zone */
    @media (prefers-color-scheme: dark) {
      .danger-zone {
        background: rgba(var(--red-500-rgb), 0.1);
        border-color: var(--red-400);
      }
      
      .danger-zone-title {
        color: var(--red-400);
      }
      
      .danger-zone-description {
        color: var(--red-300);
      }
    }

    /* Confirm dialog size */
    :host ::ng-deep .p-confirmdialog {
      width: 50vw !important;
      max-width: 600px !important;
    }
    
    :host ::ng-deep .p-confirmdialog .p-dialog-content {
      white-space: pre-line;
      max-height: 60vh;
      overflow-y: auto;
    }
    
    /* Tab Styles */
    .vessel-tabs {
      height: 100%;
      display: flex;
      flex-direction: column;
    }
    
    :host ::ng-deep .vessel-tabs .p-tabview-nav {
      border-bottom: 2px solid var(--surface-300);
      background: var(--surface-50);
      padding: 0;
    }
    
    :host ::ng-deep .vessel-tabs .p-tabview-panels {
      flex: 1;
      overflow: hidden;
      padding: 0;
    }
    
    :host ::ng-deep .vessel-tabs .p-tabview-panel {
      height: 100%;
      overflow: auto;
      padding: 0;
    }
    
    /* Tab content padding */
    .vessel-tabs .view-dialog-content {
      padding: 1.5rem;
      height: 100%;
      overflow: auto;
    }
    
    /* Track tab special handling */
    .vessel-tabs .tracking-dialog-content {
      height: 100%;
      overflow: hidden;
      padding: 0;
    }
  `]
})
export class VesselListComponent implements OnInit {
  // Configurable values for nearby vessels feature
  readonly NEARBY_RADIUS_KM = 100; // Distance in kilometers
  readonly NEARBY_TIME_WINDOW_DAYS = 31; // Time window in days
  
  @ViewChild('nearbyMapContainer') nearbyMapContainer!: ElementRef<HTMLDivElement>;
  @ViewChild('trackingMapContainer') trackingMapContainer!: ElementRef<HTMLDivElement>;
  private map: any;
  private nearbyMap: any;
  private trackingMap: any;
  private marker: any;
  private maplibregl: any;
  private nearbyMarkers: any[] = [];
  selectedNearbyVessel = signal<VesselDataset | null>(null);
  
  private vesselDatasetService = inject(VesselDatasetService);
  private confirmationService = inject(ConfirmationService);
  private messageService = inject(MessageService);
  private fb = inject(FormBuilder);

  // Data signals
  datasets = signal<VesselDataset[]>([]);
  loading = signal<boolean>(false);
  saving = signal<boolean>(false);
  error = signal<string | null>(null);
  searchTerm = signal<string>('');
  
  // Computed signal for filtered datasets
  filteredDatasets = computed(() => {
    const term = this.searchTerm().toLowerCase().trim();
    const allVessels = this.datasets();
    console.log('Search term:', term, 'Total vessels:', allVessels.length);
    
    if (!term) {
      return allVessels;
    }
    
    const filtered = allVessels.filter(vessel => 
      vessel.name?.toLowerCase().includes(term)
    );
    console.log('Filtered vessels:', filtered.length);
    return filtered;
  });

  // Dialog control properties
  vesselDialogVisible = false;
  formDialogVisible = false;
  nearbyDialogVisible = false;
  activeTabIndex = 0; // 0 for info, 1 for device, 2 for track, 3 for danger zone

  // Other signals
  selectedVessel = signal<VesselDataset | null>(null);
  nearbyVessels = signal<VesselDataset[]>([]);
  devices = signal<Device[]>([]);
  loadingDevices = signal<boolean>(false);
  
  // Real-time editing signals
  savingName = signal<boolean>(false);
  nameUpdateStatus = signal<'idle' | 'saving' | 'success' | 'error'>('idle');
  typeUpdateStatus = signal<'idle' | 'saving' | 'success' | 'error'>('idle');
  enabledUpdateStatus = signal<'idle' | 'saving' | 'success' | 'error'>('idle');

  // Dropdown options
  vesselTypes = [
    { label: 'Canoe', value: 'Canoe' },
    { label: 'Vessel', value: 'Vessel' }
  ];

  // Reactive Form Group
  vesselForm: FormGroup;

  constructor() {
    this.vesselForm = this.fb.group({
      name: ['', Validators.required],
      type: ['', Validators.required],
      enabled: [true]
    });
  }

  ngOnInit(): void {
    this.loadVessels();
  }

  onSearchChange(value: string): void {
    console.log('Search input changed:', value);
    this.searchTerm.set(value);
  }

  loadVessels(): void {
    this.loading.set(true);
    this.error.set(null);
    this.datasets.set([]);

    this.vesselDatasetService.getAll().subscribe({
      next: (data) => {
        this.datasets.set(data);
        console.log('Vessels loaded:', data.length);
      },
      error: (err) => {
        this.error.set('Failed to load vessels. Please try again later.');
        console.error('Error loading vessels:', err);
        this.messageService.add({
          severity: 'error',
          summary: 'Load Error',
          detail: 'Failed to load vessels',
          life: 3000
        });
      },
      complete: () => {
        this.loading.set(false);
      }
    });
  }

  // --- Vessel Dialog Methods ---
  openViewDialog(vessel: VesselDataset): void {
    this.selectedVessel.set(vessel);
    
    // Initialize the form with vessel data
    const formData = {
      name: vessel.name || '',
      type: vessel.type,
      enabled: vessel.enabled
    };
    this.vesselForm.patchValue(formData);
    
    this.activeTabIndex = 0; // Open on vessel info tab
    this.vesselDialogVisible = true;
    
    // Load devices for this vessel
    this.loadDevices(vessel.id);
    
    // Find nearby vessels
    this.findNearbyVessels();
    
    // Initialize map after dialog is shown
    setTimeout(() => {
      this.initializeMap(vessel);
    }, 100);
  }

  closeVesselDialog(): void {
    this.vesselDialogVisible = false;
    this.selectedVessel.set(null);
    
    // Reset editing states
    this.savingName.set(false);
    this.nameUpdateStatus.set('idle');
    this.typeUpdateStatus.set('idle');
    this.enabledUpdateStatus.set('idle');
    
    // Clean up maps
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
    if (this.trackingMap) {
      this.trackingMap.remove();
      this.trackingMap = null;
    }
  }

  // --- Form Dialog Methods ---
  openNewDialog(): void {
    this.selectedVessel.set(null);
    this.vesselForm.reset({
      name: '',
      type: '',
      enabled: true
    });
    this.formDialogVisible = true;
  }


  closeFormDialog(): void {
    this.formDialogVisible = false;
  }

  // --- Save Data Method (for new vessels only) ---
  saveVessel(): void {
    if (this.vesselForm.invalid) {
      this.vesselForm.markAllAsTouched();
      this.messageService.add({
        severity: 'warn',
        summary: 'Validation Error',
        detail: 'Please fill in all required fields correctly.',
        life: 3000
      });
      return;
    }

    this.saving.set(true);
    const formValue = this.vesselForm.value;
    
    // Create the data object
    const vesselData = {
      name: formValue.name,
      type: formValue.type,
      enabled: formValue.enabled
    };

    this.vesselDatasetService.create(vesselData).subscribe({
      next: (newData) => {
        console.log('Vessel created:', newData);
        this.datasets.update(currentDatasets =>
          [...currentDatasets, newData]
        );
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Vessel created successfully',
          life: 3000
        });
        this.closeFormDialog();
      },
      error: (err) => {
        console.error('Error creating vessel:', err);
        this.messageService.add({
          severity: 'error',
          summary: 'Create Error',
          detail: err.error?.message || 'Failed to create vessel',
          life: 5000
        });
      },
      complete: () => {
        this.saving.set(false);
      }
    });
  }

  // --- Delete Confirmation ---
  confirmDelete(vessel: VesselDataset): void {
    if (!vessel || vessel.id === undefined) return;

    const warningMessage = `Are you sure you want to delete the vessel "${vessel.name}" (ID: ${vessel.id})?<br><br>This will permanently delete:<br><br><ul style="margin: 0; padding-left: 20px;"><li>The vessel record and all its information</li><li>All associated devices and their authentication tokens</li><li>All tracking data and position history</li></ul><br><strong>⚠️ This action cannot be undone and all data will be lost forever.</strong>`;

    this.confirmationService.confirm({
      message: warningMessage,
      header: 'Delete Vessel - Permanent Action',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      acceptLabel: 'Delete Permanently',
      rejectLabel: 'Cancel',
      accept: () => this.deleteVessel(vessel.id),
    });
  }

  deleteVessel(id: number): void {
    this.loading.set(true);
    this.vesselDatasetService.delete(id).subscribe({
      next: () => {
        this.datasets.update(currentDatasets =>
          currentDatasets.filter(vessel => vessel.id !== id)
        );
        console.log('Vessel deleted:', id);
        this.messageService.add({
          severity: 'success',
          summary: 'Vessel Deleted',
          detail: 'Vessel and all associated data have been permanently deleted',
          life: 4000
        });
        
        // Close the view dialog if we're currently viewing the deleted vessel
        if (this.selectedVessel()?.id === id) {
          this.selectedVessel.set(null);
          this.closeVesselDialog();
        }
      },
      error: (err) => {
        console.error('Error deleting vessel:', err);
        this.messageService.add({
          severity: 'error',
          summary: 'Delete Error',
          detail: err.error?.message || 'Failed to delete vessel. Please try again.',
          life: 5000
        });
      },
      complete: () => {
         this.loading.set(false);
      }
    });
  }

  private async initializeTrackingMap(vessel: VesselDataset): Promise<void> {
    if (!vessel.last_position?.latitude || !vessel.last_position?.longitude) {
      return;
    }

    // Dynamically import MapLibre
    const maplibregl = await import('maplibre-gl');

    // Initialize tracking map
    this.trackingMap = new maplibregl.Map({
      container: this.trackingMapContainer.nativeElement,
      style: OSM_STYLE as any,
      center: [vessel.last_position.longitude, vessel.last_position.latitude],
      zoom: 12
    });

    // Add navigation controls
    this.trackingMap.addControl(new maplibregl.NavigationControl());

    // Add marker for vessel position
    new maplibregl.Marker({
      color: vessel.type === 'Canoe' ? '#1565C0' : '#E65100'
    })
      .setLngLat([vessel.last_position.longitude, vessel.last_position.latitude])
      .setPopup(
        new maplibregl.Popup().setHTML(
          `<strong>${vessel.name}</strong><br/>
           Type: ${vessel.type}<br/>
           Last seen: ${new Date(vessel.last_seen).toLocaleString('en-GB', { hour12: false })}`
        )
      )
      .addTo(this.trackingMap);

    // Store maplibregl for later use
    this.maplibregl = maplibregl;
  }

  private async initializeMap(vessel: VesselDataset): Promise<void> {
    if (!vessel.last_position?.latitude || !vessel.last_position?.longitude) {
      return;
    }

    // Dynamically import MapLibre
    const maplibregl = await import('maplibre-gl');

    // Initialize map
    this.map = new maplibregl.Map({
      container: this.trackingMapContainer.nativeElement,
      style: OSM_STYLE as any,
      center: [vessel.last_position.longitude, vessel.last_position.latitude],
      zoom: 12
    });

    // Add navigation controls
    this.map.addControl(new maplibregl.NavigationControl());

    // Add marker for vessel position
    this.marker = new maplibregl.Marker({
      color: vessel.type === 'Canoe' ? '#1565C0' : '#E65100'
    })
      .setLngLat([vessel.last_position.longitude, vessel.last_position.latitude])
      .setPopup(
        new maplibregl.Popup().setHTML(
          `<strong>${vessel.name}</strong><br/>
           Type: ${vessel.type}<br/>
           Last seen: ${new Date(vessel.last_seen).toLocaleString('en-GB', { hour12: false })}`
        )
      )
      .addTo(this.map);

    // Show popup by default
    this.marker.togglePopup();
    
    // Store maplibregl for later use
    this.maplibregl = maplibregl;
  }
  
  openNearbyDialog(): void {
    this.findNearbyVessels();
    this.nearbyDialogVisible = true;
    
    // Initialize nearby map after dialog is shown
    setTimeout(() => {
      this.initializeNearbyMap();
    }, 100);
  }
  
  closeNearbyDialog(): void {
    this.nearbyDialogVisible = false;
    this.selectedNearbyVessel.set(null);
    
    // Clean up nearby map
    if (this.nearbyMap) {
      this.nearbyMap.remove();
      this.nearbyMap = null;
    }
  }
  
  selectNearbyVessel(vessel: VesselDataset): void {
    this.selectedNearbyVessel.set(vessel);
    
    // Center map on selected vessel
    if (this.nearbyMap && vessel.last_position) {
      this.nearbyMap.flyTo({
        center: [vessel.last_position.longitude, vessel.last_position.latitude],
        zoom: 14
      });
    }
  }
  
  private async initializeNearbyMap(): Promise<void> {
    if (!this.nearbyMapContainer || !this.maplibregl) return;
    
    const currentVessel = this.selectedVessel();
    if (!currentVessel?.last_position) return;
    
    // Initialize map
    this.nearbyMap = new this.maplibregl.Map({
      container: this.nearbyMapContainer.nativeElement,
      style: OSM_STYLE as any,
      center: [currentVessel.last_position.longitude, currentVessel.last_position.latitude],
      zoom: 10
    });
    
    // Add navigation controls
    this.nearbyMap.addControl(new this.maplibregl.NavigationControl());
    
    // Add marker for current vessel
    new this.maplibregl.Marker({
      color: currentVessel.type === 'Canoe' ? '#1565C0' : '#E65100'
    })
      .setLngLat([currentVessel.last_position.longitude, currentVessel.last_position.latitude])
      .setPopup(
        new this.maplibregl.Popup().setHTML(
          `<strong>${currentVessel.name}</strong> (Current)<br/>
           Type: ${currentVessel.type}<br/>
           Last seen: ${new Date(currentVessel.last_seen).toLocaleString('en-GB', { hour12: false })}`
        )
      )
      .addTo(this.nearbyMap);
    
    // Add markers for nearby vessels
    this.nearbyVessels().forEach(vessel => {
      if (!vessel.last_position) return;
      
      new this.maplibregl.Marker({
        color: vessel.type === 'Canoe' ? '#64B5F6' : '#FFB74D'
      })
        .setLngLat([vessel.last_position.longitude, vessel.last_position.latitude])
        .setPopup(
          new this.maplibregl.Popup().setHTML(
            `<strong>${vessel.name}</strong><br/>
             Type: ${vessel.type}<br/>
             Last seen: ${new Date(vessel.last_seen).toLocaleString('en-GB', { hour12: false })}<br/>
             Distance: ${this.calculateDistance(
               currentVessel.last_position!.latitude,
               currentVessel.last_position!.longitude,
               vessel.last_position.latitude,
               vessel.last_position.longitude
             ).toFixed(1)} km`
          )
        )
        .addTo(this.nearbyMap);
    });
    
    // Fit bounds to show all markers
    if (this.nearbyVessels().length > 0) {
      const bounds = new this.maplibregl.LngLatBounds();
      bounds.extend([currentVessel.last_position.longitude, currentVessel.last_position.latitude]);
      
      this.nearbyVessels().forEach(vessel => {
        if (vessel.last_position) {
          bounds.extend([vessel.last_position.longitude, vessel.last_position.latitude]);
        }
      });
      
      this.nearbyMap.fitBounds(bounds, { padding: 50 });
    }
  }
  
  private findNearbyVessels(): void {
    const currentVessel = this.selectedVessel();
    if (!currentVessel?.last_position) return;
    
    const now = new Date();
    const timeWindowAgo = new Date(now.getTime() - this.NEARBY_TIME_WINDOW_DAYS * 24 * 60 * 60 * 1000);
    
    // Filter vessels within configured radius and time window
    const nearby = this.datasets().filter(vessel => {
      // Skip current vessel
      if (vessel.id === currentVessel.id) return false;
      
      // Check if reported within time window
      if (!vessel.last_seen || new Date(vessel.last_seen) < timeWindowAgo) return false;
      
      // Check distance
      if (!vessel.last_position?.latitude || !vessel.last_position?.longitude) return false;
      
      const distance = this.calculateDistance(
        currentVessel.last_position!.latitude,
        currentVessel.last_position!.longitude,
        vessel.last_position.latitude,
        vessel.last_position.longitude
      );
      
      return distance <= this.NEARBY_RADIUS_KM;
    });
    
    this.nearbyVessels.set(nearby);
  }
  
  // Haversine formula to calculate distance between two coordinates in km
  calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
  
  private toRad(deg: number): number {
    return deg * (Math.PI / 180);
  }
  
  // Device Management Methods
  loadDevices(vesselId: number): void {
    this.loadingDevices.set(true);
    console.log(`Loading devices for vessel ID: ${vesselId}`);
    
    // Call API to get devices for this vessel
    fetch(`/api/devices?vessel_id=${vesselId}`)
      .then(response => {
        console.log(`Device API response status: ${response.status}`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then(devices => {
        console.log('Devices loaded:', devices);
        // Ensure devices is an array
        this.devices.set(Array.isArray(devices) ? devices : []);
      })
      .catch(error => {
        console.error('Error loading devices:', error);
        this.devices.set([]); // Set empty array on error
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: `Failed to load devices: ${error.message}`,
          life: 3000
        });
      })
      .finally(() => {
        this.loadingDevices.set(false);
      });
  }
  
  createDevice(): void {
    const vessel = this.selectedVessel();
    if (!vessel) return;
    
    this.loadingDevices.set(true);
    
    fetch('/api/devices', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        vessel_id: vessel.id,
        expires_in_days: 3
      })
    })
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then(newDevice => {
        this.devices.update(devices => [...devices, newDevice]);
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Device created successfully',
          life: 3000
        });
      })
      .catch(error => {
        console.error('Error creating device:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: `Failed to create device: ${error.message}`,
          life: 3000
        });
      })
      .finally(() => {
        this.loadingDevices.set(false);
      });
  }
  
  regenerateDevice(device: Device): void {
    this.loadingDevices.set(true);
    
    fetch(`/api/devices/${device.device_id}/regenerate`, {
      method: 'POST'
    })
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then(updatedDevice => {
        this.devices.update(devices => 
          devices.map(d => d.device_id === device.device_id ? updatedDevice : d)
        );
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Device regenerated successfully',
          life: 3000
        });
      })
      .catch(error => {
        console.error('Error regenerating device:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: `Failed to regenerate device: ${error.message}`,
          life: 3000
        });
      })
      .finally(() => {
        this.loadingDevices.set(false);
      });
  }
  
  deleteDevice(device: Device): void {
    this.confirmationService.confirm({
      message: 'Are you sure you want to delete this device? This action cannot be undone.',
      header: 'Confirm Deletion',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        fetch(`/api/devices/${device.device_id}`, {
          method: 'DELETE'
        })
          .then(response => {
            if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
          })
          .then(() => {
            this.devices.update(devices => 
              devices.filter(d => d.device_id !== device.device_id)
            );
            this.messageService.add({
              severity: 'success',
              summary: 'Success',
              detail: 'Device deleted successfully',
              life: 3000
            });
          })
          .catch(error => {
            console.error('Error deleting device:', error);
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: `Failed to delete device: ${error.message}`,
              life: 3000
            });
          });
      }
    });
  }
  
  getDeviceStatus(device: Device): string {
    if (this.isDeviceExpired(device)) {
      return 'Expired';
    }
    return device.is_activated ? 'Activated' : 'Pending';
  }
  
  getDeviceStatusClass(device: Device): string {
    if (this.isDeviceExpired(device)) {
      return 'expired';
    }
    return device.is_activated ? 'activated' : 'pending';
  }
  
  isDeviceExpired(device: Device): boolean {
    return new Date(device.expires_at) < new Date();
  }
  
  getActivationUrl(device: Device): string {
    return `ghmaritimeapp://auth?token=${device.activation_token}`;
  }
  
  getPublicActivationUrl(device: Device): string {
    // Frontend runs on port 4200, accessible from phone's IP
    return `http://192.168.1.247:4200/activate?token=${device.activation_token}`;
  }
  

  onTabChange(event: any): void {
    if (event.index === 2 && this.selectedVessel()) {
      // When switching to track tab (index 2), initialize tracking map
      setTimeout(() => {
        this.initializeTrackingMap(this.selectedVessel()!);
      }, 100);
    }
  }
  
  copyToClipboard(text: string): void {
    navigator.clipboard.writeText(text).then(() => {
      this.messageService.add({
        severity: 'success',
        summary: 'Copied',
        detail: 'Activation URL copied to clipboard',
        life: 2000
      });
    }).catch(() => {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to copy to clipboard',
        life: 3000
      });
    });
  }

  // Real-time editing methods

  saveName(): void {
    const vessel = this.selectedVessel();
    if (!vessel || this.vesselForm.controls['name'].invalid) return;

    this.savingName.set(true);
    this.nameUpdateStatus.set('saving');
    
    const newName = this.vesselForm.value.name;
    
    this.vesselDatasetService.update(vessel.id, { name: newName }).subscribe({
      next: (updatedVessel) => {
        this.datasets.update(datasets =>
          datasets.map(v => v.id === vessel.id ? updatedVessel : v)
        );
        this.selectedVessel.set(updatedVessel);
        this.nameUpdateStatus.set('success');
        
        // Clear success status after 2 seconds
        setTimeout(() => this.nameUpdateStatus.set('idle'), 2000);
      },
      error: (err) => {
        this.nameUpdateStatus.set('error');
        this.messageService.add({
          severity: 'error',
          summary: 'Update Error',
          detail: 'Failed to update vessel name',
          life: 3000
        });
        // Clear error status after 3 seconds
        setTimeout(() => this.nameUpdateStatus.set('idle'), 3000);
      },
      complete: () => {
        this.savingName.set(false);
      }
    });
  }

  updateType(): void {
    const vessel = this.selectedVessel();
    if (!vessel) return;

    this.typeUpdateStatus.set('saving');
    const newType = this.vesselForm.value.type;
    
    this.vesselDatasetService.update(vessel.id, { type: newType }).subscribe({
      next: (updatedVessel) => {
        this.datasets.update(datasets =>
          datasets.map(v => v.id === vessel.id ? updatedVessel : v)
        );
        this.selectedVessel.set(updatedVessel);
        this.typeUpdateStatus.set('success');
        
        // Clear success status after 2 seconds
        setTimeout(() => this.typeUpdateStatus.set('idle'), 2000);
      },
      error: (err) => {
        this.typeUpdateStatus.set('error');
        this.messageService.add({
          severity: 'error',
          summary: 'Update Error',
          detail: 'Failed to update vessel type',
          life: 3000
        });
        // Reset form to original value
        this.vesselForm.patchValue({ type: vessel.type });
        // Clear error status after 3 seconds
        setTimeout(() => this.typeUpdateStatus.set('idle'), 3000);
      }
    });
  }

  updateEnabled(): void {
    const vessel = this.selectedVessel();
    if (!vessel) return;

    this.enabledUpdateStatus.set('saving');
    const newEnabled = this.vesselForm.value.enabled;
    
    this.vesselDatasetService.update(vessel.id, { enabled: newEnabled }).subscribe({
      next: (updatedVessel) => {
        this.datasets.update(datasets =>
          datasets.map(v => v.id === vessel.id ? updatedVessel : v)
        );
        this.selectedVessel.set(updatedVessel);
        this.enabledUpdateStatus.set('success');
        
        // Clear success status after 2 seconds
        setTimeout(() => this.enabledUpdateStatus.set('idle'), 2000);
      },
      error: (err) => {
        this.enabledUpdateStatus.set('error');
        this.messageService.add({
          severity: 'error',
          summary: 'Update Error',
          detail: 'Failed to update vessel status',
          life: 3000
        });
        // Reset form to original value
        this.vesselForm.patchValue({ enabled: vessel.enabled });
        // Clear error status after 3 seconds
        setTimeout(() => this.enabledUpdateStatus.set('idle'), 3000);
      }
    });
  }

}