import { Component, inject, signal, output, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { forkJoin, map, catchError, of } from 'rxjs';
import { SearchDropdownComponent, SearchDropdownConfig, SearchDropdownItem } from '@ghanawaters/shared';
import { ApiService, Vessel, VesselTelemetry } from '../api.service';

export interface VesselWithLocation extends Vessel {
  latitude?: number;
  longitude?: number;
  lastSeen?: Date;
}

@Component({
  selector: 'app-vessel-search',
  standalone: true,
  imports: [CommonModule, SearchDropdownComponent],
  template: `
    <lib-search-dropdown
      [items]="vessels()"
      [config]="searchConfig"
      [isLoading]="isLoading()"
      [itemTemplate]="vesselItemTemplate"
      (itemSelected)="onVesselSelected($event)"
    ></lib-search-dropdown>

    <ng-template #vesselItemTemplate let-vessel let-selected="selected">
      <div class="vessel-header">
        <span class="vessel-name">{{ vessel.name }}</span>
      </div>
      <div class="vessel-details">
        <span class="type">{{ vessel.vessel_type }}</span>
        @if (vessel.home_port) {
          <span class="separator">•</span>
          <span class="port">{{ vessel.home_port }}</span>
        }
      </div>
      @if (vessel.latitude && vessel.longitude) {
        <div class="location-info">
          <span class="coordinates">{{ formatLocation(vessel.latitude, vessel.longitude) }}</span>
          @if (vessel.lastSeen) {
            <span class="timestamp">{{ formatTimestamp(vessel.lastSeen) }}</span>
          }
        </div>
      }
    </ng-template>
  `,
  styles: [`
    :host {
      display: block;
      width: 320px;
    }
    
    .vessel-header {
      margin-bottom: 4px;
    }
    
    .vessel-name {
      font-weight: 600;
      color: #1e3c72;
      font-size: 14px;
    }
    
    .vessel-details {
      display: flex;
      gap: 8px;
      margin-bottom: 4px;
      font-size: 12px;
      color: #666;
    }
    
    .separator {
      color: #d1d5db;
    }
    
    .location-info {
      font-size: 11px;
      color: #059669;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .coordinates {
      font-family: monospace;
    }
    
    .timestamp {
      color: #9ca3af;
      font-size: 10px;
    }
  `]
})
export class VesselSearchComponent implements OnInit {
  @ViewChild('vesselItemTemplate') vesselItemTemplate!: TemplateRef<any>;
  
  private apiService = inject(ApiService);
  
  vessels = signal<VesselWithLocation[]>([]);
  isLoading = signal(false);
  
  vesselSelected = output<VesselWithLocation>();
  
  searchConfig: SearchDropdownConfig = {
    placeholder: 'Search vessels by name...',
    searchFields: ['name'],
    maxResults: 10,
    showKeyboardHints: true,
    noResultsText: 'No vessels found matching',
    loadingText: 'Loading vessels...'
  };
  
  ngOnInit() {
    this.loadVessels();
  }
  
  onVesselSelected(vessel: VesselWithLocation) {
    this.vesselSelected.emit(vessel);
  }
  
  formatLocation(lat: number, lng: number): string {
    return `${lat.toFixed(4)}°, ${lng.toFixed(4)}°`;
  }
  
  formatTimestamp(date: Date): string {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  }
  
  private loadVessels() {
    this.isLoading.set(true);
    
    this.apiService.getActiveVessels().subscribe({
      next: (vessels) => {
        // Load latest telemetry for each vessel
        const telemetryRequests = vessels.map(vessel => 
          this.apiService.getVesselTelemetry(vessel.id, 1).pipe(
            map(telemetry => ({ 
              ...vessel, 
              latitude: telemetry[0]?.position?.coordinates?.[1],
              longitude: telemetry[0]?.position?.coordinates?.[0],
              lastSeen: telemetry[0]?.timestamp ? new Date(telemetry[0].timestamp) : undefined
            })),
            catchError(() => of({ ...vessel }))
          )
        );
        
        forkJoin(telemetryRequests).subscribe(vesselsWithLocation => {
          this.vessels.set(vesselsWithLocation);
          this.isLoading.set(false);
        });
      },
      error: (error) => {
        console.error('Error loading vessels:', error);
        this.vessels.set([]);
        this.isLoading.set(false);
      }
    });
  }
}