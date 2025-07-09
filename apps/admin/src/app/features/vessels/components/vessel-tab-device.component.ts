import { Component, Input, Output, EventEmitter, signal, OnInit, OnChanges, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { VesselDataset } from '../models/vessel-dataset.model';
import { Device } from '../models/device.model';
import { HttpClient } from '@angular/common/http';
import { ConfirmationService, MessageService } from 'primeng/api';
import { environment } from '../../../../environments/environment';
import { io, Socket } from 'socket.io-client';

// PrimeNG imports
import { ButtonModule } from 'primeng/button';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { PanelModule } from 'primeng/panel';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmDialogModule } from 'primeng/confirmdialog';

// QR Code import
import { QRCodeComponent } from 'angularx-qrcode';

@Component({
  selector: 'app-vessel-tab-device',
  standalone: true,
  imports: [
    CommonModule,
    ButtonModule,
    ProgressSpinnerModule,
    PanelModule,
    TooltipModule,
    ConfirmDialogModule,
    QRCodeComponent
  ],
  template: `
    <div class="view-dialog-content">
      <!-- Device Management Section -->
      <div class="device-section">
        @if (loadingDevices()) {
          <div class="text-center">
            <p-progressSpinner styleClass="w-4rem h-4rem"></p-progressSpinner>
          </div>
        } @else {
          <!-- Active Device Panel -->
          <p-panel styleClass="active-device-panel mb-3" [class.activation-success]="activationAnimation()">
            <ng-template pTemplate="header">
              <div class="panel-header-content">
                <div class="panel-title-section">
                  <span class="panel-title">Active Device</span>
                </div>
                @if (!pendingDevice()) {
                  <p-button 
                    label="New Device" 
                    icon="pi pi-plus" 
                    styleClass="p-button-success p-button-sm"
                    (onClick)="createDevice()"
                    [disabled]="loadingDevices()"
                  ></p-button>
                }
              </div>
            </ng-template>
            
            @if (activeDevice()) {
              <div class="device-info">
                <div class="device-row status-row">
                  <span class="device-label">Status:</span>
                  <span class="device-status active-status">
                    <i class="pi pi-circle-fill"></i>
                    Active & Reporting
                  </span>
                </div>
                
                <div class="device-row">
                  <span class="device-label">Device ID:</span>
                  <span class="detail-value font-mono">{{ activeDevice()!.device_id }}</span>
                </div>
                
                <div class="device-row">
                  <span class="device-label">Activated:</span>
                  <span class="detail-value">{{ activeDevice()!.activated_at | date:'dd/MM/yyyy HH:mm:ss' }}</span>
                </div>
                
                <div class="device-actions">
                  <p-button 
                    label="Retire Device" 
                    icon="pi pi-ban" 
                    styleClass="p-button-sm p-button-danger"
                    (onClick)="retireDevice(activeDevice()!)"
                    [disabled]="loadingDevices()"
                    pTooltip="Retire this device (deactivates device, cannot report positions anymore)"
                    tooltipPosition="top"
                  ></p-button>
                </div>
              </div>
            } @else {
              <div class="no-device-message active-empty">
                <i class="pi pi-mobile empty-icon"></i>
                <p class="empty-title">No Active Device</p>
              </div>
            }
          </p-panel>

          <!-- Pending Device Activation Panel - Only show if there's a pending device -->
          @if (pendingDevice()) {
            <p-panel styleClass="pending-device-panel">
              <ng-template pTemplate="header">
                <div class="panel-header-content">
                  <span class="panel-title"><i class="pi pi-clock"></i>
                      Awaiting Activation</span>
                </div>
              </ng-template>
              
              <div class="device-info">
                <!-- Status and Details Section -->
                <div class="device-header">
                  
                  <div class="device-details">
                    <div class="detail-row">
                      <span class="detail-label">Device ID:</span>
                      <span class="detail-value font-mono">{{ pendingDevice()!.device_id }}</span>
                    </div>
                    <div class="detail-row">
                      <span class="detail-label">Expires:</span>
                      <span class="detail-value">{{ pendingDevice()!.expires_at | date:'dd/MM/yyyy HH:mm' }}</span>
                    </div>
                  </div>
                </div>

                <!-- Activation Methods -->
                <div class="activation-panels">
                  <!-- QR Code Panel -->
                  <p-panel styleClass="activation-panel">
                    <ng-template pTemplate="header">
                      <div class="panel-title-content">
                        <i class="pi pi-qrcode panel-icon"></i>
                        <span class="panel-title">Scan this Code</span>
                      </div>
                    </ng-template>
                    
                    <div class="qr-container">
                      <qrcode 
                        [qrdata]="getPublicActivationUrl(pendingDevice()!)"
                        [width]="200"
                        [errorCorrectionLevel]="'H'"
                        [margin]="4"
                        cssClass="qr-code"
                        [imageSrc]="'assets/images/ghana-waters-logo.png'"
                        [imageWidth]="40"
                        [imageHeight]="40">
                      </qrcode>
                      <p class="activation-help-text">Install the Ghana Waters app on the vessel's device<br/>and scan this code with the camera to activate</p>
                    </div>
                  </p-panel>

                  <!-- Link Panel -->
                  <p-panel styleClass="activation-panel">
                    <ng-template pTemplate="header">
                      <div class="panel-title-content">
                        <i class="pi pi-link panel-icon"></i>
                        <span class="panel-title">Send this Code</span>
                      </div>
                    </ng-template>
                    
                    <div class="link-container">
                      <input 
                        type="text" 
                        class="url-input" 
                        [value]="getHttpsActivationUrl(pendingDevice()!)" 
                        readonly
                        (click)="copyToClipboard(getHttpsActivationUrl(pendingDevice()!))"
                      />
                      <p-button 
                        label="Copy Link" 
                        icon="pi pi-copy" 
                        styleClass="p-button-sm p-button-outlined copy-button"
                        (onClick)="copyToClipboard(getHttpsActivationUrl(pendingDevice()!))"
                        pTooltip="Copy activation link to clipboard"
                      ></p-button>
                      <p class="activation-help-text">If you do not have access to the device, share this link with the holder of device via SMS, WhatsApp, or email.<br/><strong>The Ghana Waters app must already be installed to use this link.</strong></p>
                    </div>
                  </p-panel>
                </div>
                
                <div class="device-actions">
                  <p-button 
                    label="Delete Activation Code" 
                    icon="pi pi-trash" 
                    styleClass="p-button-sm p-button-danger"
                    (onClick)="deleteDevice(pendingDevice()!)"
                    [disabled]="loadingDevices()"
                    pTooltip="Delete this activation code"
                    tooltipPosition="top"
                  ></p-button>
                </div>
              </div>
            </p-panel>
          }
        }
      </div>
    </div>
    
    <!-- Confirmation Dialog -->
    <p-confirmDialog></p-confirmDialog>
  `,
  styles: [`
    /* Device Section Styles */
    .device-section {
      margin-top: 1rem;
    }

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }

    .section-title {
      margin: 0 0 1rem 0;
      color: var(--text-color);
      font-size: 1.1rem;
      font-weight: 600;
    }

    /* Panel Header */
    .panel-header-content {
      display: flex;
      justify-content: space-between;
      align-items: center;
      width: 100%;
    }

    .panel-title-section {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .panel-title {
      font-size: 1rem;
      font-weight: 600;
      margin: 0;
    }

    /* Device Info Layout */
    .device-info {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .device-row {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.6rem 0;
      line-height: 1.4;
    }

    .device-label {
      font-weight: 600;
      font-size: 0.875rem;
      width: 130px;
      flex-shrink: 0;
      color: var(--text-color);
    }

    .detail-label {
      font-weight: 600;
      font-size: 0.875rem;
      color: var(--text-color);
      width: 130px;
      white-space: nowrap;
    }

    .detail-value {
      color: var(--text-color);
      font-size: 0.875rem;
      font-weight: 400;
      line-height: 1.4;
    }

    /* Device Status */
    .device-status {
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-size: 0.875rem;
      font-weight: 500;
    }

    .pending-status {
      color: var(--orange-600);
      font-weight: 500;
      font-size: 0.875rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .active-status {
      color: var(--green-600);
      font-weight: 500;
      font-size: 0.875rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .active-status i {
      color: var(--green-500);
      animation: pulse 2s infinite;
    }

    @keyframes pulse {
      0% { opacity: 1; }
      50% { opacity: 0.5; }
      100% { opacity: 1; }
    }

    .status-row {
      margin-bottom: 1rem !important;
    }

    /* Device Header Layout */
    .device-header {
      margin-bottom: 1.5rem;
      padding-bottom: 1rem;
      border-bottom: 1px solid var(--surface-border);
    }

    .status-section {
      margin-bottom: 1rem;
    }

    .device-details {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .detail-row {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    /* Activation Panels */
    .activation-panels {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
      margin-bottom: 1rem;
    }
    
    .activation-panel {
      height: 320px;
      display: flex;
      flex-direction: column;
    }

    /* Panel Headers */
    .panel-title-content {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .panel-icon {
      font-size: 1rem;
      color: var(--primary-color);
    }

    .panel-title {
      font-weight: 600;
      font-size: 0.9rem;
    }

    /* QR Code Container */
    .qr-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0.75rem;
      padding: 1.5rem;
      height: 100%;
      flex: 1;
    }

    /* Link Container */
    .link-container {
      display: flex;
      flex-direction: column;
      justify-content: center;
      gap: 1rem;
      padding: 1.5rem;
      height: 100%;
      flex: 1;
    }

    .url-input {
      width: 100%;
      padding: 1rem;
      border: 2px solid var(--surface-border);
      border-radius: 8px;
      font-family: monospace;
      font-size: 0.9rem;
      background: var(--surface-ground);
      color: var(--text-color);
      text-align: center;
      font-weight: 500;
    }

    .copy-button {
      align-self: stretch;
      margin: 0.5rem 0;
      padding: 0.75rem 1.5rem;
      font-size: 1rem;
      font-weight: 600;
    }

    .activation-help-text {
      margin: 0;
      font-size: 0.875rem;
      color: var(--text-color-secondary);
      text-align: center;
      line-height: 1.4;
    }

    /* Device Actions */
    .device-actions {
      display: flex;
      gap: 0.5rem;
      margin-top: 0.5rem;
      justify-content: flex-end;
    }

    /* Empty State Messages */
    .no-device-message {
      text-align: center;
      padding: 2rem 1.5rem;
      color: var(--text-color-secondary);
    }

    .empty-icon {
      font-size: 2.5rem;
      color: var(--surface-400);
      margin-bottom: 0.75rem;
      display: block;
    }

    .empty-title {
      font-size: 1rem;
      font-weight: 600;
      color: var(--text-color);
      margin: 0 0 0.5rem 0;
    }

    .empty-description {
      font-size: 0.875rem;
      color: var(--text-color-secondary);
      margin: 0;
      line-height: 1.4;
    }

    .pending-empty {
      background: var(--orange-25);
    }

    .active-empty {
      background: var(--green-25);
    }

    .font-mono {
      font-family: monospace;
    }

    /* QR Code Styling */
    :host ::ng-deep .qr-code {
      border: 2px solid var(--surface-border);
      border-radius: 8px;
      padding: 0.5rem;
      background: white;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }

    /* Responsive Design */
    @media (max-width: 767px) {
      .activation-panels {
        grid-template-columns: 1fr;
        gap: 1rem;
      }
      
      .activation-panel {
        height: auto;
        min-height: 280px;
      }
    }
    
    @media (min-width: 768px) {
      .device-details {
        flex-direction: row;
        gap: 2rem;
      }
    }

    /* Panel styling overrides */
    :host ::ng-deep .activation-panel {
      height: 100%;
      display: flex;
      flex-direction: column;
    }
    
    :host ::ng-deep .activation-panel .p-panel-content {
      padding: 0;
      flex: 1;
      display: flex;
      flex-direction: column;
    }

    :host ::ng-deep .activation-panel .p-panel-header {
      background: var(--surface-100);
      border-bottom: 1px solid var(--surface-border);
      flex-shrink: 0;
    }

    /* Activation success animation */
    :host ::ng-deep .active-device-panel.activation-success {
      animation: activationPulse 2s ease-in-out;
    }

    @keyframes activationPulse {
      0% {
        box-shadow: 0 0 0 0 var(--green-500);
      }
      25% {
        box-shadow: 0 0 0 10px rgba(34, 197, 94, 0.3);
      }
      50% {
        box-shadow: 0 0 0 15px rgba(34, 197, 94, 0.2);
        border-color: var(--green-500);
      }
      75% {
        box-shadow: 0 0 0 20px rgba(34, 197, 94, 0.1);
      }
      100% {
        box-shadow: 0 0 0 0 rgba(34, 197, 94, 0);
      }
    }

    /* Success state indicator */
    .active-status.success-glow {
      animation: statusGlow 2s ease-in-out;
    }

    @keyframes statusGlow {
      0%, 100% {
        color: var(--green-600);
      }
      50% {
        color: var(--green-400);
        text-shadow: 0 0 10px var(--green-400);
      }
    }
  `]
})
export class VesselTabDeviceComponent implements OnInit, OnChanges, OnDestroy {
  @Input() vessel: VesselDataset | null = null;
  @Output() deviceUpdated = new EventEmitter<void>();

  // Device management signals
  loadingDevices = signal(false);
  pendingDevice = signal<Device | null>(null);
  activeDevice = signal<Device | null>(null);
  
  // WebSocket for real-time updates
  private deviceSocket?: Socket;
  activationAnimation = signal(false);

  constructor(
    private http: HttpClient,
    private confirmationService: ConfirmationService,
    private messageService: MessageService
  ) {}

  ngOnInit() {
    if (this.vessel) {
      this.loadDevices();
      this.setupDeviceSocket();
    }
  }

  ngOnChanges() {
    if (this.vessel) {
      this.loadDevices();
      // Reconnect WebSocket if vessel changes
      this.disconnectDeviceSocket();
      this.setupDeviceSocket();
    }
  }

  ngOnDestroy() {
    this.disconnectDeviceSocket();
  }

  loadDevices() {
    if (!this.vessel) return;
    
    this.loadingDevices.set(true);
    this.http.get<Device[]>(`${environment.apiUrl}/devices?vessel_id=${this.vessel.id}`).subscribe({
      next: (devices: Device[]) => {
        const pending = devices.find(d => d.state === 'pending');
        const active = devices.find(d => d.state === 'active');
        
        this.pendingDevice.set(pending || null);
        this.activeDevice.set(active || null);
      },
      error: (error: any) => {
        console.error('Error loading devices:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load device information'
        });
      },
      complete: () => {
        this.loadingDevices.set(false);
      }
    });
  }

  createDevice() {
    if (!this.vessel) return;
    
    this.loadingDevices.set(true);
    this.http.post<Device>(`${environment.apiUrl}/devices`, { vessel_id: this.vessel.id }).subscribe({
      next: (device: Device) => {
        this.pendingDevice.set(device);
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Device activation token created successfully'
        });
        this.deviceUpdated.emit();
      },
      error: (error: any) => {
        console.error('Error creating device:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to create device activation token'
        });
      },
      complete: () => {
        this.loadingDevices.set(false);
      }
    });
  }

  deleteDevice(device: Device) {
    this.confirmationService.confirm({
      message: 'Are you sure you want to delete this pending activation token?',
      header: 'Delete Activation Token',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.loadingDevices.set(true);
        this.http.delete(`${environment.apiUrl}/devices/${device.device_id}`).subscribe({
          next: () => {
            this.pendingDevice.set(null);
            this.messageService.add({
              severity: 'success',
              summary: 'Success',
              detail: 'Activation token deleted successfully'
            });
            this.deviceUpdated.emit();
          },
          error: (error: any) => {
            console.error('Error deleting device:', error);
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'Failed to delete activation token'
            });
          },
          complete: () => {
            this.loadingDevices.set(false);
          }
        });
      }
    });
  }

  retireDevice(device: Device) {
    this.confirmationService.confirm({
      message: 'Are you sure you want to retire this active device? The device will no longer be able to report positions.',
      header: 'Retire Device',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.loadingDevices.set(true);
        this.http.delete(`${environment.apiUrl}/devices/${device.device_id}`).subscribe({
          next: () => {
            this.activeDevice.set(null);
            this.messageService.add({
              severity: 'success',
              summary: 'Success',
              detail: 'Device retired successfully'
            });
            this.deviceUpdated.emit();
          },
          error: (error: any) => {
            console.error('Error retiring device:', error);
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'Failed to retire device'
            });
          },
          complete: () => {
            this.loadingDevices.set(false);
          }
        });
      }
    });
  }

  getPublicActivationUrl(device: Device): string {
    return `ghanawaters://auth?token=${device.activation_token}`;
  }

  getHttpsActivationUrl(device: Device): string {
    return `${environment.frontendUrl}/activate?token=${device.activation_token}`;
  }

  copyToClipboard(text: string) {
    navigator.clipboard.writeText(text).then(() => {
      this.messageService.add({
        severity: 'success',
        summary: 'Copied',
        detail: 'Activation link copied to clipboard'
      });
    }).catch(() => {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to copy to clipboard'
      });
    });
  }

  private setupDeviceSocket() {
    if (!this.vessel) return;
    
    // Derive WebSocket URL from API URL
    const wsUrl = environment.apiUrl
      .replace('/api', '')
      .replace('https://', 'wss://')
      .replace('http://', 'ws://');
    
    this.deviceSocket = io(`${wsUrl}/devices`, {
      transports: ['websocket']
    });

    this.deviceSocket.on('connect', () => {
      console.log('Connected to device updates');
      // Subscribe to this vessel's device updates
      this.deviceSocket?.emit('subscribe-vessel-devices', this.vessel?.id);
    });

    this.deviceSocket.on('disconnect', () => {
      console.log('Disconnected from device updates');
    });

    // Handle device activation
    this.deviceSocket.on('device-activated', (data: any) => {
      console.log('Device activated event received:', data);
      if (data.vesselId === this.vessel?.id && data.device) {
        // Update UI with animation
        this.activationAnimation.set(true);
        this.pendingDevice.set(null);
        this.activeDevice.set(data.device);
        
        // Show success notification
        this.messageService.add({
          severity: 'success',
          summary: 'Device Activated!',
          detail: `Device ${data.device.device_id} has been successfully activated`,
          life: 5000
        });
        
        // Emit update event
        this.deviceUpdated.emit();
        
        // Reset animation after delay
        setTimeout(() => this.activationAnimation.set(false), 3000);
      }
    });

    // Handle device creation
    this.deviceSocket.on('device-created', (data: any) => {
      console.log('Device created event received:', data);
      if (data.vesselId === this.vessel?.id && data.device) {
        this.pendingDevice.set(data.device);
      }
    });

    // Handle device retirement
    this.deviceSocket.on('device-retired', (data: any) => {
      console.log('Device retired event received:', data);
      if (data.vesselId === this.vessel?.id) {
        this.activeDevice.set(null);
        this.messageService.add({
          severity: 'info',
          summary: 'Device Retired',
          detail: 'The active device has been retired',
          life: 3000
        });
        this.deviceUpdated.emit();
      }
    });

    // Handle device deletion
    this.deviceSocket.on('device-deleted', (data: any) => {
      console.log('Device deleted event received:', data);
      if (data.vesselId === this.vessel?.id) {
        const pending = this.pendingDevice();
        if (pending && pending.device_id === data.deviceId) {
          this.pendingDevice.set(null);
        }
      }
    });

    this.deviceSocket.on('error', (error: any) => {
      console.error('Device WebSocket error:', error);
    });
  }

  private disconnectDeviceSocket() {
    if (this.deviceSocket) {
      if (this.vessel?.id) {
        this.deviceSocket.emit('unsubscribe-vessel-devices', this.vessel.id);
      }
      this.deviceSocket.disconnect();
      this.deviceSocket = undefined;
    }
  }
}