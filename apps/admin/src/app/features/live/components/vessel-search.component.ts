import { Component, inject, signal, output, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { forkJoin, map, catchError, of, Observable } from 'rxjs';
import { SearchDropdownComponent, SearchDropdownConfig, SearchDropdownItem } from '@snapper/shared';

export interface Vessel {
  id: number;
  name: string;
  registration_number: string;
  vessel_type: string;
  length_meters?: number;
  owner_name?: string;
  owner_contact?: string;
  home_port?: string;
  active: boolean;
  created: Date;
  last_updated: Date;
}

export interface TrackingPoint {
  id: number;
  vessel_id: number;
  latitude?: number;
  longitude?: number;
  position?: {
    type: string;
    coordinates: [number, number];
  };
  speed_knots?: number;
  heading_degrees?: number;
  timestamp: Date;
}

export interface VesselWithLocation extends Vessel {
  latitude?: number;
  longitude?: number;
  lastSeen?: Date;
  // SearchDropdownItem compatibility - id is already defined in Vessel as number
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
      (searchChanged)="onSearchChanged($event)"
    ></lib-search-dropdown>

    <ng-template #vesselItemTemplate let-vessel let-selected="selected">
      <div class="vessel-header">
        <span class="vessel-name">{{ vessel.name }}</span>
        <span class="vessel-status" [class.active]="vessel.active">
          {{ vessel.active ? 'Active' : 'Inactive' }}
        </span>
      </div>
      <div class="vessel-details">
        <span class="registration">{{ vessel.registration_number }}</span>
        <span class="type">{{ vessel.vessel_type }}</span>
        @if (vessel.home_port) {
          <span class="port">{{ vessel.home_port }}</span>
        }
      </div>
      @if (vessel.latitude && vessel.longitude) {
        <div class="location-info">
          <i class="pi pi-map-marker"></i>
          {{ formatLocation(vessel.latitude, vessel.longitude) }}
          @if (vessel.lastSeen) {
            <span class="timestamp">{{ formatTimestamp(vessel.lastSeen) }}</span>
          }
        </div>
      }
    </ng-template>
  `,
  styles: [`
    .vessel-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }
    
    .vessel-name {
      font-weight: 600;
      color: #1f2937;
      font-size: 15px;
    }
    
    .vessel-status {
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 500;
      text-transform: uppercase;
      background-color: #ef4444;
      color: white;
    }
    
    .vessel-status.active {
      background-color: #10b981;
    }
    
    .vessel-details {
      display: flex;
      gap: 12px;
      margin-bottom: 6px;
      font-size: 13px;
      color: #6b7280;
    }
    
    .registration {
      font-weight: 500;
      color: #374151;
    }
    
    .type {
      color: #6b7280;
    }
    
    .port {
      color: #6b7280;
    }
    
    .type::before {
      content: "•";
      margin-right: 6px;
      color: #d1d5db;
    }
    
    .port::before {
      content: "•";
      margin-right: 6px;
      color: #d1d5db;
    }
    
    .location-info {
      font-size: 12px;
      color: #059669;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    
    .timestamp {
      color: #6b7280;
      margin-left: auto;
    }
  `]
})
export class VesselSearchComponent implements OnInit {
  @ViewChild('vesselItemTemplate') vesselItemTemplate!: TemplateRef<any>;
  
  private http = inject(HttpClient);
  
  vessels = signal<VesselWithLocation[]>([]);
  isLoading = signal(false);
  
  vesselSelected = output<VesselWithLocation>();
  
  searchConfig: SearchDropdownConfig = {
    placeholder: 'Search vessels by name or registration...',
    searchFields: ['name', 'registration_number'],
    maxResults: 10,
    showKeyboardHints: true,
    noResultsText: 'No vessels found matching',
    loadingText: 'Loading vessels...'
  };
  
  ngOnInit() {
    console.log('VesselSearchComponent initialized');
    this.loadVessels();
  }
  
  onVesselSelected(vessel: VesselWithLocation) {
    console.log('Vessel selected:', vessel.name, vessel.registration_number);
    this.vesselSelected.emit(vessel);
  }
  
  onSearchChanged(searchTerm: string) {
    // Handle search term changes if needed
    console.log('Search term changed:', searchTerm);
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
    console.log('Loading vessels from API...');
    
    this.getActiveVessels().subscribe({
      next: (vessels) => {
        console.log('Received vessels from API:', vessels.length, 'vessels');
        
        // Load latest tracking for each vessel
        const trackingRequests = vessels.map(vessel => 
          this.getVesselTracking(vessel.id, 1).pipe(
            map(tracking => {
              console.log(`Tracking for vessel ${vessel.name}:`, tracking);
              return { 
                ...vessel, 
                latitude: tracking[0]?.position?.coordinates?.[1] || tracking[0]?.latitude,
                longitude: tracking[0]?.position?.coordinates?.[0] || tracking[0]?.longitude,
                lastSeen: tracking[0]?.timestamp ? new Date(tracking[0].timestamp) : undefined
              };
            }),
            catchError((error) => {
              console.warn(`Error loading tracking for vessel ${vessel.name}:`, error);
              return of({ ...vessel });
            })
          )
        );
        
        forkJoin(trackingRequests).subscribe(vesselsWithLocation => {
          console.log('Final vessels with location data:', vesselsWithLocation);
          this.vessels.set(vesselsWithLocation);
          this.isLoading.set(false);
          // Update placeholder with count
          this.searchConfig = {
            ...this.searchConfig,
            placeholder: `Search vessels`
          };
        });
      },
      error: (error) => {
        console.error('Error loading vessels:', error);
        console.error('Error details:', {
          status: error.status,
          statusText: error.statusText,
          url: error.url,
          message: error.message
        });
        this.vessels.set([]);
        this.isLoading.set(false);
      }
    });
  }
  
  private getActiveVessels(): Observable<Vessel[]> {
    return this.http.get<Vessel[]>('/api/vessels?active=true');
  }
  
  private getVesselTracking(vesselId: number, limit: number = 1): Observable<TrackingPoint[]> {
    return this.http.get<TrackingPoint[]>(`/api/vessels/${vesselId}/tracking?limit=${limit}`);
  }
}