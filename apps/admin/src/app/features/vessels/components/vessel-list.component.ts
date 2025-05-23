// features/vessels/components/vessel-list.component.ts
import { Component, OnInit, inject, signal, computed, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormsModule } from '@angular/forms';
import { VesselDatasetService } from '../services/vessel-dataset.service';
import { VesselDataset } from '../models/vessel-dataset.model';
import { OSM_STYLE } from '@snapper/map';
import { TimeAgoPipe } from '@snapper/shared';

interface DeviceToken {
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
      rejectButtonStyleClass="p-button-secondary">
    </p-confirmDialog>

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
              (ngModelChange)="searchTerm.set($event)"
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
            <th style="width: 25%">Actions</th>
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
            <td class="actions-column" (click)="$event.stopPropagation()">
              <p-button 
                label="View" 
                icon="pi pi-eye" 
                styleClass="p-button-text p-button-sm" 
                (onClick)="openViewDialog(vessel)">
              </p-button>
              <p-button 
                label="Edit" 
                icon="pi pi-pencil" 
                styleClass="p-button-text p-button-sm" 
                (onClick)="openEditDialog(vessel)">
              </p-button>
              <p-button 
                label="Delete" 
                icon="pi pi-trash" 
                styleClass="p-button-text p-button-sm" 
                (onClick)="confirmDelete(vessel)">
              </p-button>
            </td>
          </tr>
        </ng-template>

        <ng-template pTemplate="emptymessage">
          <tr>
            <td colspan="6" class="text-center p-4">
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
              <td><p-skeleton></p-skeleton></td>
              <td><p-skeleton></p-skeleton></td>
            </tr>
          }
        </ng-template>
      </p-table>
    </div>

    <!-- View Dialog -->
    <p-dialog
      [(visible)]="viewDialogVisible"
      [style]="{width: '80vw', 'max-width': '900px'}"
      [modal]="true"
      [draggable]="false"
      [resizable]="false"
      [closeOnEscape]="true"
      [closable]="true"
      header="View Vessel"
      (onHide)="closeViewDialog()"
    >
      @if (selectedVessel()) {
        <div class="view-dialog-content">
          <!-- Basic Information Section -->
          <div class="grid">
            <div class="col-12 md:col-6">
              <div class="detail-item">
                <span class="detail-label">ID:</span>
                <span class="detail-value">{{ selectedVessel()?.id }}</span>
              </div>
            </div>

            <div class="col-12 md:col-6">
              <div class="detail-item">
                <span class="detail-label">Name:</span>
                <span class="detail-value">{{ selectedVessel()?.name }}</span>
              </div>
            </div>

            <div class="col-12 md:col-6">
              <div class="detail-item">
                <span class="detail-label">Type:</span>
                <span [class]="selectedVessel()?.type === 'Canoe' ? 'type-badge type-cannoo' : 'type-badge type-vessel'">
                  {{ selectedVessel()?.type }}
                </span>
              </div>
            </div>

            <div class="col-12 md:col-6">
              <div class="detail-item">
                <span class="detail-label">Enabled:</span>
                <span [class]="selectedVessel()?.enabled ? 'status-badge status-enabled' : 'status-badge status-disabled'">
                  {{ selectedVessel()?.enabled ? 'Yes' : 'No' }}
                </span>
              </div>
            </div>

            <div class="col-12">
              <div class="detail-item">
                <span class="detail-label">Created:</span>
                <span class="detail-value">{{ selectedVessel()?.created | date:'dd/MM/yyyy HH:mm:ss' }}</span>
              </div>
            </div>
          </div>

          <p-divider></p-divider>

          <!-- Device Token Management Section -->
          <div class="device-token-section">
            <div class="device-token-header">
              <h5>Device Tokens</h5>
              <p-button 
                label="Create Device Token" 
                icon="pi pi-plus" 
                styleClass="p-button-sm p-button-success"
                (onClick)="createDeviceToken()"
                [disabled]="loadingDeviceTokens()"
              ></p-button>
            </div>
            
            @if (loadingDeviceTokens()) {
              <div class="text-center">
                <p-progressSpinner styleClass="w-4rem h-4rem"></p-progressSpinner>
              </div>
            } @else if (deviceTokens().length === 0) {
              <div class="no-tokens-message">
                <i class="pi pi-mobile"></i>
                <p>No device tokens created yet.</p>
                <p class="text-muted">Create a device token to allow mobile devices to report vessel positions.</p>
              </div>
            } @else {
              <div class="device-tokens-list">
                @for (token of deviceTokens(); track token.device_id) {
                  <p-card>
                    <div class="token-info">
                      <div class="token-row">
                        <span class="token-label">Status:</span>
                        <span 
                          class="token-status"
                          [ngClass]="getTokenStatusClass(token)"
                        >
                          {{ getTokenStatus(token) }}
                        </span>
                        @if (!isTokenExpired(token) && !token.is_activated) {
                          <span class="time-remaining ml-2">
                            Expires {{ token.expires_at | date:'dd/MM/yyyy HH:mm' }}
                          </span>
                        }
                      </div>
                      
                      <div class="token-row">
                        <span class="token-label">Device ID:</span>
                        <span class="detail-value font-mono">{{ token.device_id }}</span>
                      </div>
                      
                      @if (!token.is_activated && !isTokenExpired(token)) {
                        <div class="token-row activation-url-row">
                          <span class="token-label">Simple Link:</span>
                          <div class="url-container">
                            <input 
                              type="text" 
                              class="url-input" 
                              [value]="getPublicActivationUrl(token)" 
                              readonly
                            />
                            <p-button 
                              icon="pi pi-copy" 
                              styleClass="p-button-sm p-button-outlined"
                              (onClick)="copyToClipboard(getPublicActivationUrl(token))"
                              pTooltip="Copy simple activation link"
                            ></p-button>
                            <a 
                              [href]="getPublicActivationUrl(token)"
                              target="_blank"
                              class="activation-link-button"
                              pTooltip="Open simple activation page"
                            >
                              <p-button 
                                icon="pi pi-external-link" 
                                styleClass="p-button-sm p-button-success"
                                label="Open"
                              ></p-button>
                            </a>
                          </div>
                        </div>
                        
                        <div class="token-row">
                          <span class="token-label">App URL:</span>
                          <div class="url-container">
                            <input 
                              type="text" 
                              class="url-input" 
                              [value]="getActivationUrl(token)" 
                              readonly
                            />
                            <p-button 
                              icon="pi pi-copy" 
                              styleClass="p-button-sm p-button-outlined"
                              (onClick)="copyToClipboard(getActivationUrl(token))"
                              pTooltip="Copy direct app activation URL"
                            ></p-button>
                          </div>
                        </div>
                      }
                      
                      @if (token.is_activated && token.activated_at) {
                        <div class="token-row">
                          <span class="token-label">Activated:</span>
                          <span class="detail-value">{{ token.activated_at | date:'dd/MM/yyyy HH:mm:ss' }}</span>
                        </div>
                      }
                      
                      <div class="token-actions">
                        @if (!isTokenExpired(token)) {
                          <p-button 
                            label="Regenerate" 
                            icon="pi pi-refresh" 
                            styleClass="p-button-sm p-button-warning"
                            (onClick)="regenerateToken(token)"
                            [disabled]="loadingDeviceTokens()"
                          ></p-button>
                        }
                        <p-button 
                          label="Delete" 
                          icon="pi pi-trash" 
                          styleClass="p-button-sm p-button-danger"
                          (onClick)="deleteDeviceToken(token)"
                          [disabled]="loadingDeviceTokens()"
                        ></p-button>
                      </div>
                    </div>
                  </p-card>
                }
              </div>
            }
          </div>

          <p-divider></p-divider>

          <!-- Position Information Section -->
          <h5>Position Information</h5>
          <div class="grid">
            <div class="col-12 md:col-6">
              <div class="detail-item">
                <span class="detail-label">Last Report:</span>
                <span class="detail-value">
                  {{ selectedVessel()?.last_seen | date:'dd/MM/yyyy HH:mm:ss' }}
                  <span class="text-muted"> ({{ selectedVessel()?.last_seen | timeAgo }})</span>
                </span>
              </div>
            </div>

            <div class="col-12 md:col-6">
              <div class="detail-item">
                <span class="detail-label">Coordinates:</span>
                <span class="detail-value">
                  {{ selectedVessel()?.last_position?.latitude?.toFixed(6) || 'N/A' }}, 
                  {{ selectedVessel()?.last_position?.longitude?.toFixed(6) || 'N/A' }}
                </span>
              </div>
            </div>

            <div class="col-12">
              <div class="mb-3">
                <p-button 
                  label="Show Nearby Vessels" 
                  icon="pi pi-map-marker" 
                  styleClass="p-button-secondary p-button-sm"
                  (onClick)="openNearbyDialog()"
                  [badge]="nearbyVessels().length > 0 ? nearbyVessels().length.toString() : undefined"
                ></p-button>
                <span class="ml-2 text-muted">Within {{ NEARBY_RADIUS_KM }}km in last {{ NEARBY_TIME_WINDOW_DAYS }} days</span>
              </div>
              <div #mapContainer class="map-container"></div>
            </div>
          </div>
        </div>
      }

      <ng-template pTemplate="footer">
        <div class="flex justify-content-between">
          <p-button label="Back to List" icon="pi pi-arrow-left" styleClass="p-button-secondary" (onClick)="closeViewDialog()"></p-button>
          <p-button label="Edit" icon="pi pi-pencil" styleClass="p-button-success" (onClick)="openEditDialog(selectedVessel())"></p-button>
        </div>
      </ng-template>
    </p-dialog>

    <!-- Edit/Create Dialog -->
    <p-dialog
      [(visible)]="formDialogVisible"
      [style]="{width: '70vw', 'max-width': '800px'}"
      [modal]="true"
      [draggable]="false"
      [resizable]="false"
      [closeOnEscape]="true"
      [closable]="true"
      [header]="isEditMode() ? 'Edit Vessel' : 'Create New Vessel'"
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
          label="Save"
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
                    <span>{{ calculateDistance(
                      selectedVessel()!.last_position!.latitude,
                      selectedVessel()!.last_position!.longitude,
                      vessel.last_position!.latitude,
                      vessel.last_position!.longitude
                    ).toFixed(1) }} km away</span>
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
    .vessel-list-container { margin-top: 1rem; }
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
    
    /* Device Token Styles */
    .device-token-section {
      margin-top: 1rem;
    }
    
    .device-token-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }
    
    .device-tokens-list {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    
    .token-info {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    
    .token-row {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    
    .token-label {
      font-weight: 600;
      min-width: 80px;
      flex-shrink: 0;
    }
    
    .token-status {
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-size: 0.8rem;
      font-weight: 600;
    }
    
    .token-status.pending {
      background-color: var(--orange-100);
      color: var(--orange-700);
    }
    
    .token-status.activated {
      background-color: var(--green-100);
      color: var(--green-700);
    }
    
    .token-status.expired {
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
      border: 1px solid var(--surface-300);
      border-radius: 4px;
      font-family: monospace;
      font-size: 0.9rem;
      background: var(--surface-100);
    }
    
    .token-actions {
      display: flex;
      gap: 0.5rem;
      margin-top: 0.5rem;
    }
    
    .time-remaining {
      font-size: 0.85rem;
      opacity: 0.7;
    }
    
    .no-tokens-message {
      text-align: center;
      padding: 2rem;
      color: var(--text-color-secondary);
      background: var(--surface-100);
      border-radius: 4px;
    }
    
    .no-tokens-message i {
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
    
    .actions-column {
      cursor: default !important;
    }
    
    .activation-link-button {
      text-decoration: none;
      margin-left: 0.5rem;
    }
  `]
})
export class VesselListComponent implements OnInit {
  // Configurable values for nearby vessels feature
  readonly NEARBY_RADIUS_KM = 100; // Distance in kilometers
  readonly NEARBY_TIME_WINDOW_DAYS = 31; // Time window in days
  
  @ViewChild('mapContainer') mapContainer!: ElementRef<HTMLDivElement>;
  @ViewChild('nearbyMapContainer') nearbyMapContainer!: ElementRef<HTMLDivElement>;
  private map: any;
  private nearbyMap: any;
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
    if (!term) {
      return this.datasets();
    }
    return this.datasets().filter(vessel => 
      vessel.name?.toLowerCase().includes(term)
    );
  });

  // Dialog control properties
  viewDialogVisible = false;
  formDialogVisible = false;
  nearbyDialogVisible = false;

  // Other signals
  isEditMode = signal<boolean>(false);
  selectedVessel = signal<VesselDataset | null>(null);
  nearbyVessels = signal<VesselDataset[]>([]);
  deviceTokens = signal<DeviceToken[]>([]);
  loadingDeviceTokens = signal<boolean>(false);

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

  // --- View Dialog Methods ---
  openViewDialog(vessel: VesselDataset): void {
    this.selectedVessel.set(vessel);
    this.viewDialogVisible = true;
    
    // Load device tokens for this vessel
    this.loadDeviceTokens(vessel.id);
    
    // Initialize map after dialog is shown
    setTimeout(() => {
      this.initializeMap(vessel);
    }, 100);
  }

  closeViewDialog(): void {
    this.viewDialogVisible = false;
    
    // Clean up map
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
  }

  // --- Form Dialog Methods ---
  openNewDialog(): void {
    this.isEditMode.set(false);
    this.selectedVessel.set(null);
    this.vesselForm.reset({
      name: '',
      type: '',
      enabled: true
    });
    this.formDialogVisible = true;
  }

  openEditDialog(vessel: VesselDataset | null): void {
    if (!vessel) return;

    this.isEditMode.set(true);
    this.selectedVessel.set(vessel);
    this.vesselForm.patchValue({
      name: vessel.name || '',
      type: vessel.type,
      enabled: vessel.enabled
    });
    this.formDialogVisible = true;

    if (this.viewDialogVisible) {
      this.viewDialogVisible = false;
    }
  }

  closeFormDialog(): void {
    this.formDialogVisible = false;
    this.selectedVessel.set(null);
  }

  // --- Save Data Method ---
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

    if (this.isEditMode() && this.selectedVessel()) {
      const vesselId = this.selectedVessel()?.id;

      if (vesselId) {
        this.vesselDatasetService.update(vesselId, vesselData).subscribe({
          next: (updatedData) => {
            console.log('Vessel updated:', updatedData);
            this.datasets.update(currentDatasets =>
              currentDatasets.map(item =>
                item.id === updatedData.id ? updatedData : item
              )
            );
            this.messageService.add({
              severity: 'success',
              summary: 'Success',
              detail: 'Vessel updated successfully',
              life: 3000
            });
            this.closeFormDialog();
          },
          error: (err) => {
            console.error('Error updating vessel:', err);
            this.messageService.add({
              severity: 'error',
              summary: 'Update Error',
              detail: err.error?.message || 'Failed to update vessel',
              life: 5000
            });
          },
          complete: () => {
            this.saving.set(false);
          }
        });
      } else {
        console.error("Save error: Edit mode is true but vessel ID is missing.");
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Cannot update vessel: ID missing.' });
        this.saving.set(false);
      }
    } else {
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
  }

  // --- Delete Confirmation ---
  confirmDelete(vessel: VesselDataset): void {
    if (!vessel || vessel.id === undefined) return;

    this.confirmationService.confirm({
      message: `Are you sure you want to delete the vessel "${vessel.name}" (ID: ${vessel.id})? This action cannot be undone.`,
      header: 'Confirm Deletion',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      acceptLabel: 'Delete',
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
          summary: 'Deleted',
          detail: 'Vessel deleted successfully',
          life: 3000
        });
        if (this.selectedVessel()?.id === id) {
            this.selectedVessel.set(null);
            this.closeViewDialog();
        }
      },
      error: (err) => {
        console.error('Error deleting vessel:', err);
        this.messageService.add({
          severity: 'error',
          summary: 'Delete Error',
          detail: err.error?.message || 'Failed to delete vessel',
          life: 5000
        });
      },
      complete: () => {
         this.loading.set(false);
      }
    });
  }

  private async initializeMap(vessel: VesselDataset): Promise<void> {
    if (!vessel.last_position?.latitude || !vessel.last_position?.longitude) {
      return;
    }

    // Dynamically import MapLibre
    const maplibregl = await import('maplibre-gl');

    // Initialize map
    this.map = new maplibregl.Map({
      container: this.mapContainer.nativeElement,
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
        currentVessel.last_position.latitude,
        currentVessel.last_position.longitude,
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
  
  // Device Token Management Methods
  loadDeviceTokens(vesselId: number): void {
    this.loadingDeviceTokens.set(true);
    
    // Call API to get device tokens for this vessel
    fetch(`/api/device-tokens?vessel_id=${vesselId}`)
      .then(response => response.json())
      .then(tokens => {
        this.deviceTokens.set(tokens);
      })
      .catch(error => {
        console.error('Error loading device tokens:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load device tokens',
          life: 3000
        });
      })
      .finally(() => {
        this.loadingDeviceTokens.set(false);
      });
  }
  
  createDeviceToken(): void {
    const vessel = this.selectedVessel();
    if (!vessel) return;
    
    this.loadingDeviceTokens.set(true);
    
    fetch('/api/device-tokens', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        vessel_id: vessel.id,
        expires_in_days: 3
      })
    })
      .then(response => response.json())
      .then(newToken => {
        this.deviceTokens.update(tokens => [...tokens, newToken]);
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Device token created successfully',
          life: 3000
        });
      })
      .catch(error => {
        console.error('Error creating device token:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to create device token',
          life: 3000
        });
      })
      .finally(() => {
        this.loadingDeviceTokens.set(false);
      });
  }
  
  regenerateToken(token: DeviceToken): void {
    this.loadingDeviceTokens.set(true);
    
    fetch(`/api/device-tokens/${token.device_id}/regenerate`, {
      method: 'POST'
    })
      .then(response => response.json())
      .then(updatedToken => {
        this.deviceTokens.update(tokens => 
          tokens.map(t => t.device_id === token.device_id ? updatedToken : t)
        );
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Device token regenerated successfully',
          life: 3000
        });
      })
      .catch(error => {
        console.error('Error regenerating token:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to regenerate token',
          life: 3000
        });
      })
      .finally(() => {
        this.loadingDeviceTokens.set(false);
      });
  }
  
  deleteDeviceToken(token: DeviceToken): void {
    this.confirmationService.confirm({
      message: 'Are you sure you want to delete this device token? This action cannot be undone.',
      header: 'Confirm Deletion',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        fetch(`/api/device-tokens/${token.device_id}`, {
          method: 'DELETE'
        })
          .then(() => {
            this.deviceTokens.update(tokens => 
              tokens.filter(t => t.device_id !== token.device_id)
            );
            this.messageService.add({
              severity: 'success',
              summary: 'Success',
              detail: 'Device token deleted successfully',
              life: 3000
            });
          })
          .catch(error => {
            console.error('Error deleting token:', error);
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'Failed to delete token',
              life: 3000
            });
          });
      }
    });
  }
  
  getTokenStatus(token: DeviceToken): string {
    if (this.isTokenExpired(token)) {
      return 'Expired';
    }
    return token.is_activated ? 'Activated' : 'Pending';
  }
  
  getTokenStatusClass(token: DeviceToken): string {
    if (this.isTokenExpired(token)) {
      return 'expired';
    }
    return token.is_activated ? 'activated' : 'pending';
  }
  
  isTokenExpired(token: DeviceToken): boolean {
    return new Date(token.expires_at) < new Date();
  }
  
  getActivationUrl(token: DeviceToken): string {
    return `ghmaritimeapp://auth?token=${token.activation_token}`;
  }
  
  getPublicActivationUrl(token: DeviceToken): string {
    // Frontend runs on port 4200, accessible from phone's IP
    return `http://192.168.1.247:4200/activate?token=${token.activation_token}`;
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
}