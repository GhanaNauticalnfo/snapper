import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';

// PrimeNG imports
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { MultiSelectModule } from 'primeng/multiselect';
import { ProgressBarModule } from 'primeng/progressbar';
import { MessageModule } from 'primeng/message';
import { CardModule } from 'primeng/card';
import { FieldsetModule } from 'primeng/fieldset';
import { DividerModule } from 'primeng/divider';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { DialogModule } from 'primeng/dialog';
import { CheckboxModule } from 'primeng/checkbox';

import { VesselDataset } from '../../vessels/models/vessel-dataset.model';
import { VesselDatasetService, TelemetryExportFilters, TelemetryExportStats } from '../../vessels/services/vessel-dataset.service';
import { VesselTypeService, VesselType } from '../../settings/services/vessel-type.service';

@Component({
  selector: 'app-export-tab-vessel-telemetry',
  standalone: true,
  host: { class: 'export-tab-telemetry-host' },
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    ButtonModule,
    DatePickerModule,
    MultiSelectModule,
    ProgressBarModule,
    MessageModule,
    CardModule,
    FieldsetModule,
    DividerModule,
    ToastModule,
    DialogModule,
    CheckboxModule
  ],
  providers: [MessageService],
  template: `
    <div class="telemetry-content">
      <p-toast></p-toast>

      <div class="telemetry-layout">
        <div class="telemetry-main">
          <p-fieldset legend="Export Configuration" styleClass="mb-4">
            <p class="text-600 mb-4">
              Export vessel telemetry data as a zipped CSV file. Data includes position, speed, heading, 
              battery level, signal strength, and status information for all vessels or filtered selections.
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

              <!-- Vessel Filtering -->
              <div class="field">
                <label class="block text-900 font-medium mb-3">Vessel Selection</label>
                
                <div class="grid gap-3">
                  <div class="col-6">
                    <label class="block text-600 text-sm mb-2">Select Vessel Types</label>
                    <p-multiSelect 
                      formControlName="vesselTypes"
                      [options]="vesselTypes()"
                      optionLabel="name"
                      optionValue="id"
                      placeholder="All vessel types (leave empty for all)"
                      styleClass="w-full"
                      [showClear]="true">
                    </p-multiSelect>
                  </div>
                  <div class="col-6">
                    <label class="block text-600 text-sm mb-2">Select Specific Vessels</label>
                    <p-multiSelect 
                      formControlName="vessels"
                      [options]="filteredVessels()"
                      optionLabel="displayName"
                      optionValue="id"
                      placeholder="All vessels (leave empty for all)"
                      styleClass="w-full"
                      [showClear]="true">
                    </p-multiSelect>
                  </div>
                </div>
                <small class="text-600">
                  <i class="pi pi-info-circle mr-1"></i>
                  Leave selections empty to export data for all vessels. Vessel type filtering will be applied first, then specific vessel selection.
                </small>
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
          </p-fieldset>
        </div>

        <div class="telemetry-sidebar">
          @if (recentStats()) {
            <p-fieldset legend="System Overview" styleClass="mb-4">
              <div class="text-600">
                <div class="flex justify-content-between mb-2">
                  <span>Total Records:</span>
                  <span class="font-semibold">{{ recentStats()?.totalRecords | number }}</span>
                </div>
                <div class="flex justify-content-between mb-2">
                  <span>Active Vessels:</span>
                  <span class="font-semibold">{{ allVessels().length }}</span>
                </div>
                <div class="flex justify-content-between">
                  <span>Data Range:</span>
                  <span class="font-semibold text-sm">
                    @if (recentStats()?.dateRange?.min && recentStats()?.dateRange?.max) {
                      {{ getDaysBetween(recentStats()!.dateRange.min, recentStats()!.dateRange.max) }} days
                    }
                  </span>
                </div>
              </div>
            </p-fieldset>
          }
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
          <p-fieldset legend="Export Information" styleClass="surface-50 mb-3">
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
          </p-fieldset>
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
    .telemetry-content {
      height: 100%;
      overflow: auto;
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
    
    .line-height-3 {
      line-height: 1.5;
    }
    
    .telemetry-layout {
      display: flex;
      gap: 1.5rem;
    }
    
    .telemetry-main {
      flex: 1;
      max-width: 900px;
    }
    
    .telemetry-sidebar {
      width: 350px;
      flex-shrink: 0;
    }
    
    @media (max-width: 1200px) {
      .telemetry-layout {
        flex-direction: column;
      }
      
      .telemetry-sidebar {
        width: 100%;
      }
    }
  `]
})
export class ExportTabVesselTelemetryComponent implements OnInit {
  private fb = inject(FormBuilder);
  private vesselDatasetService = inject(VesselDatasetService);
  private vesselTypeService = inject(VesselTypeService);
  private messageService = inject(MessageService);
  private destroy$ = new Subject<void>();

  // Signals
  vesselTypes = signal<VesselType[]>([]);
  allVessels = signal<VesselDataset[]>([]);
  exportStats = signal<TelemetryExportStats | null>(null);
  recentStats = signal<TelemetryExportStats | null>(null);
  loading = signal(false);
  downloading = signal(false);
  downloadProgress = signal(0);
  errorMessage = signal<string | null>(null);
  showDownloadDialog = signal(false);
  
  // Properties
  zipDownload = true; // Default to ZIP compression
  
  // Computed
  minDate = computed(() => {
    const stats = this.recentStats();
    return stats ? new Date(stats.dateRange.min) : new Date('2020-01-01');
  });
  
  maxDate = computed(() => new Date());
  
  filteredVessels = computed(() => {
    const selectedTypeIds = this.exportForm.get('vesselTypes')?.value || [];
    const vessels = this.allVessels();
    
    if (selectedTypeIds.length === 0) {
      return vessels.map(v => ({
        ...v,
        displayName: `${v.name} (${v.type})`
      }));
    }
    
    return vessels
      .filter(v => selectedTypeIds.includes(v.vessel_type_id))
      .map(v => ({
        ...v,
        displayName: `${v.name} (${v.type})`
      }));
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
      endDate: [endDate, Validators.required],
      vesselTypes: [[]],
      vessels: [[]]
    });
  }

  ngOnInit(): void {
    this.loadVesselTypes();
    this.loadVessels();
    this.loadInitialStats();
    
    // Watch for form changes to update stats
    this.exportForm.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.exportStats.set(null);
        this.errorMessage.set(null);
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadVesselTypes(): void {
    this.vesselTypeService.getAll()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (types) => this.vesselTypes.set(types),
        error: (error) => {
          console.error('Error loading vessel types:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to load vessel types'
          });
        }
      });
  }

  private loadVessels(): void {
    this.vesselDatasetService.getAll()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (vessels) => this.allVessels.set(vessels),
        error: (error) => {
          console.error('Error loading vessels:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to load vessels'
          });
        }
      });
  }

  private loadInitialStats(): void {
    this.vesselDatasetService.getTelemetryExportStats()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (stats) => {
          this.recentStats.set(stats);
          
          // Update form with actual data range if available
          if (stats.dateRange.min && stats.dateRange.max) {
            const minDate = new Date(stats.dateRange.min);
            const maxDate = new Date(stats.dateRange.max);
            maxDate.setHours(23, 59, 59, 999);
            
            this.exportForm.patchValue({
              startDate: minDate,
              endDate: maxDate
            });
          }
        },
        error: (error) => {
          console.error('Error loading export stats:', error);
        }
      });
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
      return;
    }

    console.log('Starting global telemetry download with ZIP:', this.zipDownload);
    this.downloading.set(true);
    this.downloadProgress.set(0);
    this.errorMessage.set(null);

    const filters = this.buildFilters();
    
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
          this.errorMessage.set('Failed to download telemetry data');
          this.downloading.set(false);
          this.downloadProgress.set(0);
        }
      });
  }

  private buildFilters(): TelemetryExportFilters {
    const formValue = this.exportForm.value;
    const filters: TelemetryExportFilters = {
      startDate: formValue.startDate.toISOString(),
      endDate: formValue.endDate.toISOString()
    };

    if (formValue.vesselTypes?.length > 0) {
      filters.vesselTypeIds = formValue.vesselTypes;
    }
    
    if (formValue.vessels?.length > 0) {
      filters.vesselIds = formValue.vessels;
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

  getDaysBetween(start: string, end: string): number {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
}