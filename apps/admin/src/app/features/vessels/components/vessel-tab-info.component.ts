import { Component, Input, signal, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { VesselDataset } from '../models/vessel-dataset.model';
import { VesselTypeService, VesselType } from '../../settings/services/vessel-type.service';
import { VesselIdPipe } from '@ghanawaters/shared';

@Component({
  selector: 'app-vessel-tab-info',
  standalone: true,
  imports: [CommonModule, VesselIdPipe],
  template: `
    <div class="view-dialog-content">
      @if (isLoading()) {
        <div class="loading-container">
          <div class="text-center">
            <i class="pi pi-spin pi-spinner text-4xl"></i>
            <p class="loading-text text-base">Loading vessel information...</p>
          </div>
        </div>
      } @else if (vessel) {
        <div class="vessel-info-section">
          <div class="info-rows">
            <!-- Name -->
            <div class="info-row">
              <label class="field-label text-base">Name</label>
              <div class="field-content">
                <span class="field-value text-base">{{ vessel.name }}</span>
              </div>
            </div>

            <!-- Type -->
            <div class="info-row">
              <label class="field-label text-base">Type</label>
              <div class="field-content">
                <span class="field-value text-base">{{ getVesselTypeName(vessel.vessel_type_id) }}</span>
              </div>
            </div>

            <!-- ID -->
            <div class="info-row">
              <label class="field-label text-base">ID</label>
              <div class="field-content">
                <span class="field-value font-mono text-base">{{ vessel.id | vesselId }}</span>
              </div>
            </div>

            <!-- Created -->
            <div class="info-row">
              <label class="field-label text-base">Created</label>
              <div class="field-content">
                <span class="field-value text-base">{{ vessel.created | date:'dd/MM/yyyy HH:mm:ss' }}</span>
              </div>
            </div>


            <!-- Last Seen -->
            @if (vessel.last_seen) {
              <div class="info-row">
                <label class="field-label text-base">Last Seen</label>
                <div class="field-content">
                  <span class="field-value text-base">{{ vessel.last_seen | date:'dd/MM/yyyy HH:mm:ss' }}</span>
                </div>
              </div>
            }

            <!-- Last Position -->
            @if (vessel.last_position) {
              <div class="info-row">
                <label class="field-label text-base">Last Position</label>
                <div class="field-content">
                  <span class="field-value font-mono text-base">
                    {{ vessel.last_position.latitude.toFixed(6) }}, {{ vessel.last_position.longitude.toFixed(6) }}
                  </span>
                </div>
              </div>
            }
          </div>
        </div>
      } @else {
        <div class="loading-container">
          <p class="loading-text text-base">No vessel data available</p>
        </div>
      }
    </div>
  `,
  styles: [`
    .view-dialog-content {
      padding: 1.5rem;
    }
    
    .vessel-info-section {
      margin-bottom: 1.5rem;
    }
    
    .info-rows {
      display: flex;
      flex-direction: column;
      gap: 1.2rem;
    }
    
    .info-row {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 0.75rem 0;
      border-bottom: 1px solid var(--surface-border);
    }
    
    .info-row:last-child {
      border-bottom: none;
    }
    
    .field-label {
      font-weight: 600;
      color: var(--text-color-secondary);
      min-width: 160px;
      flex-shrink: 0;
    }
    
    .field-content {
      display: flex;
      align-items: center;
      flex: 1;
    }
    
    .field-value {
      color: var(--text-color);
    }
    
    .font-mono {
      font-family: 'Courier New', monospace;
      background-color: var(--surface-100);
      padding: 0.25rem 0.5rem;
      border-radius: 3px;
      font-weight: 400;
      color: var(--text-color);
      border: 1px solid var(--surface-300);
    }
    
    .loading-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 200px;
    }
    
    .loading-text {
      color: var(--text-color-secondary);
      margin-top: 1rem;
    }
  `]
})
export class VesselTabInfoComponent implements OnInit, OnChanges {
  @Input() vessel: VesselDataset | null = null;
  @Input() viewMode: boolean = false;
  
  // Vessel types for display
  vesselTypes = signal<VesselType[]>([]);
  isLoading = signal(true);

  constructor(private vesselTypeService: VesselTypeService) {}

  ngOnInit() {
    this.loadVesselTypes();
  }
  
  ngOnChanges(changes: SimpleChanges) {
    if (changes['vessel'] && this.vessel) {
      // Ensure data is available when vessel changes
      if (this.vesselTypes().length === 0) {
        this.loadVesselTypes();
      }
    }
  }

  private loadVesselTypes() {
    this.isLoading.set(true);
    this.vesselTypeService.getAll().subscribe({
      next: (types: VesselType[]) => {
        this.vesselTypes.set(types);
        this.isLoading.set(false);
      },
      error: (error: any) => {
        console.error('Error loading vessel types:', error);
        this.isLoading.set(false);
      }
    });
  }
  
  getVesselTypeName(typeId: number): string {
    const type = this.vesselTypes().find(t => t.id === typeId);
    return type ? type.name : 'Unspecified';
  }
}