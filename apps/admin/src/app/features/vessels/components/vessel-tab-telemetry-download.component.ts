import { Component, Input, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';

// PrimeNG imports
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { RadioButtonModule } from 'primeng/radiobutton';
import { ProgressBarModule } from 'primeng/progressbar';
import { MessageModule } from 'primeng/message';
import { CardModule } from 'primeng/card';
import { DividerModule } from 'primeng/divider';
import { DialogModule } from 'primeng/dialog';
import { CheckboxModule } from 'primeng/checkbox';
import { MessageService } from 'primeng/api';

import { VesselDataset } from '../models/vessel-dataset.model';
import { VesselDatasetService } from '../services/vessel-dataset.service';

interface ExportStats {
  totalRecords: number;
  dateRange: {
    min: string;
    max: string;
  };
}

@Component({
  selector: 'app-vessel-tab-telemetry-download',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    ButtonModule,
    DatePickerModule,
    RadioButtonModule,
    ProgressBarModule,
    MessageModule,
    CardModule,
    DividerModule,
    DialogModule,
    CheckboxModule
  ],
  providers: [MessageService],
  template: `
    <div class="telemetry-download-container p-4">
      <div class="grid">
        <div class="col-12">
          <p-card header="Telemetry Data Export" styleClass="mb-4">
            @if (vessel && !hasVesselTelemetrySignal()) {
              <div class="telemetry-empty-state">
                <div class="empty-state-content">
                  <div class="empty-state-icon-wrapper">
                    <i class="pi pi-chart-line empty-state-icon"></i>
                  </div>
                  <h3 class="empty-state-title">No Telemetry Data Available</h3>
                  <p class="empty-state-description">
                    No telemetry has been received for vessel <strong>"{{ vessel.name }}"</strong>
                  </p>
                  <div class="empty-state-info">
                    <div class="info-item">
                      <i class="pi pi-info-circle text-blue-500"></i>
                      <span>Telemetry data appears once the vessel device starts reporting</span>
                    </div>
                    <div class="info-item">
                      <i class="pi pi-clock text-blue-500"></i>
                      <span>Data collection begins immediately after device activation</span>
                    </div>
                  </div>
                </div>
              </div>
            } @else {
              <p class="text-600 mb-4">
                Export vessel telemetry data as a zipped CSV file. Data includes position, speed, heading, 
                and status information.
              </p>

              <form [formGroup]="exportForm">
              <!-- Date Range Selection -->
              <div class="field">
                <label class="block text-900 font-medium mb-3">Date Range</label>
                <div class="flex gap-3 items-end">
                  <div class="flex-1">
                    <label class="block text-600 text-sm mb-2">From Date & Time</label>
                    <p-datePicker 
                      formControlName="startDate"
                      [showTime]="true"
                      hourFormat="24"
                      [showIcon]="true"
                      placeholder="Start date and time"
                      styleClass="w-full"
                      dateFormat="dd/mm/yy"
                      [minDate]="minDate()"
                      [maxDate]="maxDate()">
                    </p-datePicker>
                  </div>
                  <div class="flex-1">
                    <label class="block text-600 text-sm mb-2">To Date & Time</label>
                    <p-datePicker 
                      formControlName="endDate"
                      [showTime]="true"
                      hourFormat="24"
                      [showIcon]="true"
                      placeholder="End date and time"
                      styleClass="w-full"
                      dateFormat="dd/mm/yy"
                      [minDate]="minDate()"
                      [maxDate]="maxDate()">
                    </p-datePicker>
                  </div>
                </div>
                @if (exportForm.get('startDate')?.errors?.['required'] || exportForm.get('endDate')?.errors?.['required']) {
                  <small class="p-error mt-2 block">Both start and end dates are required</small>
                }
              </div>

              <p-divider></p-divider>

              <!-- Current Vessel Info -->
              <div class="field">
                <label class="block text-900 font-medium mb-3">Export Scope</label>
                @if (vessel) {
                  <p-card styleClass="surface-50">
                    <div class="flex items-center">
                      <i class="pi pi-compass text-2xl mr-3 text-blue-500"></i>
                      <div>
                        <div class="text-900 font-semibold">{{ vessel.name }}</div>
                        <div class="text-600 text-sm">{{ vessel.type }} • ID: {{ vessel.id }}</div>
                      </div>
                    </div>
                  </p-card>
                  <small class="text-600 mt-2 block">
                    <i class="pi pi-info-circle mr-1"></i>
                    Telemetry data will be exported for this vessel only.
                  </small>
                }
              </div>


              <!-- Progress Bar -->
              @if (downloadProgress() > 0 && downloadProgress() < 100) {
                <div class="field">
                  <label class="block text-900 font-medium mb-2">Download Progress</label>
                  <p-progressBar [value]="downloadProgress()"></p-progressBar>
                </div>
              }

              <!-- Error Messages -->
              @if (errorMessage()) {
                <div class="field">
                  <p-message severity="error" [text]="errorMessage() || ''"></p-message>
                </div>
              }

              <!-- Action Buttons -->
              <div class="flex gap-2 justify-content-end">
                <p-button 
                  label="Prepare Download"
                  icon="pi pi-cog"
                  type="button"
                  [loading]="loading()"
                  [disabled]="!exportForm.valid"
                  (click)="onPrepareDownload()">
                </p-button>
              </div>
            </form>
            }
          </p-card>
        </div>
      </div>
    </div>

    <!-- Download Confirmation Dialog -->
    <p-dialog 
      header="Download Telemetry Data" 
      [(visible)]="showDownloadDialog"
      [modal]="true"
      [style]="{width: '500px'}"
      [dismissableMask]="true"
      [closeOnEscape]="true">
      
      @if (exportStats()) {
        <div class="field">
          <p-card header="Export Information" styleClass="surface-50 mb-3">
            <div class="grid">
              <div class="col-6">
                <strong>Total Records:</strong><br>
                <span class="text-xl">{{ exportStats()?.totalRecords | number }}</span>
              </div>
              <div class="col-6">
                <strong>Estimated Size:</strong><br>
                <span class="text-xl">{{ getEstimatedSize() }}</span>
              </div>
              <div class="col-12 mt-2">
                <strong>Data Range:</strong><br>
                <small class="text-600">
                  @if (exportStats()?.dateRange?.min && exportStats()?.dateRange?.max) {
                    {{ formatDate(exportStats()!.dateRange.min) }} to {{ formatDate(exportStats()!.dateRange.max) }}
                  }
                </small>
              </div>
            </div>
          </p-card>
        </div>

        <div class="field">
          <label class="block text-900 font-medium mb-3">Export Options</label>
          <div class="flex align-items-center">
            <p-checkbox 
              inputId="zipOption"
              [(ngModel)]="zipDownload"
              binary="true">
            </p-checkbox>
            <label for="zipOption" class="ml-2">Compress as ZIP file (recommended)</label>
          </div>
          <small class="text-600 block mt-1">
            ZIP compression reduces file size and download time for large datasets.
          </small>
        </div>

        @if (downloadProgress() > 0 && downloadProgress() < 100) {
          <div class="field">
            <label class="block text-900 font-medium mb-2">Download Progress</label>
            <p-progressBar [value]="downloadProgress()"></p-progressBar>
          </div>
        }

        @if (errorMessage()) {
          <div class="field">
            <p-message severity="error" [text]="errorMessage() || ''"></p-message>
          </div>
        }
      }

      <ng-template pTemplate="footer">
        <div class="flex gap-2">
          <p-button 
            label="Cancel"
            icon="pi pi-times"
            styleClass="p-button-secondary"
            (click)="closeDownloadDialog()"
            [disabled]="downloading()">
          </p-button>
          
          <p-button 
            label="Download"
            icon="pi pi-download"
            [loading]="downloading()"
            [disabled]="!exportStats() || exportStats()?.totalRecords === 0"
            (click)="startDownload()">
          </p-button>
        </div>
      </ng-template>
    </p-dialog>
  `,
  styles: [`
    .telemetry-download-container {
      max-width: 800px;
      margin: 0 auto;
    }
    
    .field {
      margin-bottom: 1.5rem;
    }
    
    .flex.gap-3 {
      gap: 1rem;
    }
    
    .flex-1 {
      flex: 1;
    }
    
    .align-items-end {
      align-items: flex-end;
    }

    /* Enhanced Empty State Styles */
    .telemetry-empty-state {
      padding: 3rem 2rem;
      text-align: center;
      background: linear-gradient(135deg, var(--surface-50, #fafafa) 0%, var(--surface-100, #f5f5f5) 100%);
      border-radius: 12px;
      border: 2px dashed var(--surface-300, #e0e0e0);
      position: relative;
      overflow: hidden;
    }

    .telemetry-empty-state::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 4px;
      background: linear-gradient(90deg, var(--blue-500, #2196f3) 0%, var(--blue-300, #64b5f6) 100%);
    }

    .empty-state-content {
      position: relative;
      z-index: 1;
    }

    .empty-state-icon-wrapper {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 80px;
      height: 80px;
      background: linear-gradient(135deg, var(--blue-100, #bbdefb) 0%, var(--blue-50, #e3f2fd) 100%);
      border-radius: 50%;
      margin-bottom: 1.5rem;
      box-shadow: 0 4px 20px rgba(33, 150, 243, 0.15);
    }

    .empty-state-icon {
      font-size: 2.5rem;
      color: var(--blue-600, #1976d2);
    }

    .empty-state-title {
      font-size: 1.5rem;
      font-weight: 600;
      color: var(--text-color, #212529);
      margin: 0 0 1rem 0;
      line-height: 1.3;
    }

    .empty-state-description {
      font-size: 1rem;
      color: var(--text-color-secondary, #6c757d);
      margin: 0 0 2rem 0;
      line-height: 1.5;
      max-width: 400px;
      margin-left: auto;
      margin-right: auto;
    }

    .empty-state-info {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      max-width: 450px;
      margin: 0 auto;
    }

    .info-item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem 1rem;
      background: var(--surface-0, #ffffff);
      border-radius: 8px;
      border-left: 3px solid var(--blue-500, #2196f3);
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      text-align: left;
    }

    .info-item i {
      font-size: 1.1rem;
      flex-shrink: 0;
    }

    .info-item span {
      color: var(--text-color-secondary, #6c757d);
      font-size: 0.9rem;
      line-height: 1.4;
    }

    /* Responsive adjustments */
    @media (max-width: 768px) {
      .telemetry-empty-state {
        padding: 2rem 1rem;
      }
      
      .empty-state-icon-wrapper {
        width: 60px;
        height: 60px;
      }
      
      .empty-state-icon {
        font-size: 2rem;
      }
      
      .empty-state-title {
        font-size: 1.25rem;
      }
      
      .info-item {
        padding: 0.6rem 0.8rem;
      }
    }
    
    :host ::ng-deep .p-datepicker {
      width: 100%;
    }
    
    :host ::ng-deep .p-datepicker .p-inputtext {
      width: 100%;
    }
    
    :host ::ng-deep .p-multiselect {
      width: 100%;
    }
  `]
})
export class VesselTabTelemetryDownloadComponent implements OnInit, OnDestroy {
  @Input() vessel: VesselDataset | null = null;
  @Input() allVessels: VesselDataset[] = [];

  private fb = inject(FormBuilder);
  private vesselDatasetService = inject(VesselDatasetService);
  private messageService = inject(MessageService);
  private destroy$ = new Subject<void>();

  // Signals
  exportStats = signal<ExportStats | null>(null);
  loading = signal(false);
  downloading = signal(false);
  downloadProgress = signal(0);
  errorMessage = signal<string | null>(null);
  showDownloadDialog = signal(false);
  
  // Properties
  zipDownload = true; // Default to ZIP compression
  
  // Computed
  minDate = computed(() => {
    const stats = this.exportStats();
    return stats ? new Date(stats.dateRange.min) : new Date('2020-01-01');
  });
  
  maxDate = computed(() => new Date());
  
  hasVesselTelemetrySignal = computed(() => {
    return !!(this.vessel && 'last_position' in this.vessel && this.vessel.last_position);
  });

  exportForm: FormGroup;

  constructor() {
    // Set default date range (last 30 days)
    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    startDate.setHours(0, 0, 0, 0);

    this.exportForm = this.fb.group({
      startDate: [startDate, Validators.required],
      endDate: [endDate, Validators.required]
    });
  }

  ngOnInit(): void {
    // Watch for form changes to clear any previous errors
    this.exportForm.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.errorMessage.set(null);
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }


  onPrepareDownload(): void {
    if (!this.exportForm.valid) return;

    this.loading.set(true);
    this.errorMessage.set(null);

    const filters = this.buildFilters();
    
    this.vesselDatasetService.getTelemetryExportStats(filters)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (stats) => {
          this.exportStats.set(stats);
          this.loading.set(false);
          
          if (stats.totalRecords === 0) {
            this.messageService.add({
              severity: 'info',
              summary: 'No Data',
              detail: 'No telemetry data found for the selected criteria'
            });
          } else {
            this.showDownloadDialog.set(true);
          }
        },
        error: (error) => {
          console.error('Error loading export stats:', error);
          this.errorMessage.set('Failed to load export statistics');
          this.loading.set(false);
        }
      });
  }

  closeDownloadDialog(): void {
    this.showDownloadDialog.set(false);
    this.downloadProgress.set(0);
    this.errorMessage.set(null);
  }

  startDownload(): void {
    if (!this.exportForm.valid || !this.exportStats() || this.exportStats()?.totalRecords === 0) {
      console.warn('Download validation failed:', {
        formValid: this.exportForm.valid,
        hasStats: !!this.exportStats(),
        totalRecords: this.exportStats()?.totalRecords
      });
      return;
    }

    console.log('Starting download for vessel:', this.vessel?.name, 'with ZIP:', this.zipDownload);
    this.downloading.set(true);
    this.downloadProgress.set(0);
    this.errorMessage.set(null);

    const filters = this.buildFilters();
    console.log('Download filters:', filters);
    
    // For now, we'll always use the ZIP download since the backend only supports ZIP
    // The checkbox is prepared for future enhancement when we add non-ZIP support
    this.vesselDatasetService.downloadTelemetryExport(filters)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (progressOrComplete) => {
          if (typeof progressOrComplete === 'number') {
            // Progress update
            this.downloadProgress.set(progressOrComplete);
          } else {
            // Download complete
            this.downloadProgress.set(100);
            this.downloading.set(false);
            
            this.messageService.add({
              severity: 'success',
              summary: 'Download Complete',
              detail: `Telemetry data has been downloaded successfully${this.zipDownload ? ' as ZIP' : ''}`
            });
            
            // Close dialog and reset progress after a delay
            setTimeout(() => {
              this.closeDownloadDialog();
            }, 1500);
          }
        },
        error: (error) => {
          console.error('Error downloading telemetry data:', error);
          this.errorMessage.set(`Failed to download telemetry data: ${error.message || error}`);
          this.downloading.set(false);
          this.downloadProgress.set(0);
        }
      });
  }

  private buildFilters(): any {
    const formValue = this.exportForm.value;
    const filters: any = {
      startDate: formValue.startDate.toISOString(),
      endDate: formValue.endDate.toISOString()
    };

    // Always filter by current vessel only
    if (this.vessel) {
      filters.vesselIds = [this.vessel.id];
    }

    return filters;
  }

  getEstimatedSize(): string {
    const stats = this.exportStats();
    if (!stats) return 'Unknown';
    
    // Rough estimate: ~150 bytes per record (CSV row)
    const estimatedBytes = stats.totalRecords * 150;
    
    if (estimatedBytes < 1024) {
      return `${estimatedBytes} B`;
    } else if (estimatedBytes < 1024 * 1024) {
      return `${Math.round(estimatedBytes / 1024)} KB`;
    } else {
      return `${Math.round(estimatedBytes / (1024 * 1024))} MB`;
    }
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}