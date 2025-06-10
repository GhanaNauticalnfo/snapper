import { Component, inject, signal, computed, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, Vessel, VesselTelemetry } from '../api.service';
import { forkJoin, map, catchError, of } from 'rxjs';

export interface VesselWithLocation extends Vessel {
  latitude?: number;
  longitude?: number;
  lastSeen?: Date;
}

@Component({
  selector: 'app-vessel-search',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="search-container">
      <div class="search-input-wrapper">
        <input 
          type="text" 
          [(ngModel)]="searchTerm"
          (input)="onSearchInput($event)"
          (focus)="showDropdown.set(true)"
          (blur)="onBlur()"
          placeholder="Search vessels by name..."
          class="search-input"
        />
        <div class="search-icon">🔍</div>
      </div>
      
      @if (showDropdown() && filteredVessels().length > 0) {
        <div class="dropdown">
          @for (vessel of filteredVessels(); track vessel.id) {
            <div 
              class="dropdown-item"
              (mousedown)="selectVessel(vessel)"
            >
              <div class="vessel-name">{{ vessel.name }}</div>
              <div class="vessel-details">
                {{ vessel.vessel_type }}
                @if (vessel.latitude && vessel.longitude) {
                  <span class="location-info">
                    • Last seen: {{ formatLocation(vessel.latitude, vessel.longitude) }}
                  </span>
                }
              </div>
            </div>
          }
        </div>
      }
      
      @if (showDropdown() && searchTerm && filteredVessels().length === 0) {
        <div class="dropdown">
          <div class="dropdown-item no-results">
            No vessels found matching "{{ searchTerm }}"
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .search-container {
      position: relative;
      width: 300px;
      z-index: 1000;
    }
    
    .search-input-wrapper {
      position: relative;
      display: flex;
      align-items: center;
    }
    
    .search-input {
      width: 100%;
      padding: 12px 40px 12px 16px;
      border: 2px solid #e1e5e9;
      border-radius: 8px;
      font-size: 14px;
      background: white;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      transition: all 0.2s ease;
    }
    
    .search-input:focus {
      outline: none;
      border-color: #1e3c72;
      box-shadow: 0 4px 8px rgba(0,0,0,0.15);
    }
    
    .search-icon {
      position: absolute;
      right: 12px;
      color: #666;
      pointer-events: none;
    }
    
    .dropdown {
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      background: white;
      border: 1px solid #e1e5e9;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      max-height: 300px;
      overflow-y: auto;
      margin-top: 4px;
    }
    
    .dropdown-item {
      padding: 12px 16px;
      cursor: pointer;
      border-bottom: 1px solid #f5f5f5;
      transition: background-color 0.2s ease;
    }
    
    .dropdown-item:hover {
      background-color: #f8f9fa;
    }
    
    .dropdown-item:last-child {
      border-bottom: none;
    }
    
    .vessel-name {
      font-weight: 600;
      color: #1e3c72;
      margin-bottom: 4px;
    }
    
    .vessel-details {
      font-size: 12px;
      color: #666;
      line-height: 1.4;
    }
    
    .location-info {
      color: #059669;
    }
    
    .no-results {
      color: #666;
      font-style: italic;
      cursor: default;
    }
    
    .no-results:hover {
      background-color: transparent;
    }
  `]
})
export class VesselSearchComponent {
  private apiService = inject(ApiService);
  
  searchTerm = '';
  showDropdown = signal(false);
  vessels = signal<VesselWithLocation[]>([]);
  
  vesselSelected = output<VesselWithLocation>();
  
  filteredVessels = computed(() => {
    if (!this.searchTerm.trim()) return [];
    
    const term = this.searchTerm.toLowerCase();
    return this.vessels().filter(vessel => 
      vessel.name.toLowerCase().includes(term)
    ).slice(0, 10); // Limit to 10 results
  });
  
  ngOnInit() {
    this.loadVessels();
  }
  
  onSearchInput(event: Event) {
    const target = event.target as HTMLInputElement;
    this.searchTerm = target.value;
    this.showDropdown.set(true);
  }
  
  onBlur() {
    // Delay hiding dropdown to allow click events
    setTimeout(() => this.showDropdown.set(false), 200);
  }
  
  selectVessel(vessel: VesselWithLocation) {
    this.searchTerm = vessel.name;
    this.showDropdown.set(false);
    this.vesselSelected.emit(vessel);
  }
  
  formatLocation(lat: number, lng: number): string {
    return `${lat.toFixed(4)}°, ${lng.toFixed(4)}°`;
  }
  
  private loadVessels() {
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
        });
      },
      error: (error) => {
        console.error('Error loading vessels:', error);
        this.vessels.set([]);
      }
    });
  }
}