// features/home/home.component.ts
import { Component, signal, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

interface VesselTypeCount {
  id: number;
  name: string;
  color: string;
  vessel_count: number;
}

interface Vessel {
  id: number;
  name: string;
  vessel_type: {
    id: number;
    name: string;
    color: string;
  };
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="home-container">
      <div class="home-header">
        <h1 class="home-title">Overview</h1>
      </div>

      <div class="dashboard-content">
        <div class="stats-grid">
          <div class="stat-card stat-vessels">
            <div class="stat-icon">
              <i class="pi pi-compass"></i>
            </div>
            <div class="stat-info">
              <h3>Total Vessels</h3>
              <p class="stat-number">{{ totalVessels() }}</p>
              <div class="vessel-types-list">
                @for (type of vesselTypes(); track type.id) {
                  @if (type.vessel_count > 0) {
                    <div class="vessel-type-item">
                      <span class="type-color" [style.background-color]="type.color"></span>
                      <span class="type-name">{{ type.name }}: {{ type.vessel_count }}</span>
                    </div>
                  }
                }
              </div>
            </div>
          </div>

          <div class="stat-card stat-routes">
            <div class="stat-icon">
              <i class="pi pi-map"></i>
            </div>
            <div class="stat-info">
              <h3>Total Routes</h3>
              <p class="stat-number">{{ totalRoutes() }}</p>
              <span class="stat-label">Navigation routes</span>
            </div>
          </div>

          <div class="stat-card stat-landing-sites">
            <div class="stat-icon">
              <i class="pi pi-flag"></i>
            </div>
            <div class="stat-info">
              <h3>Total Landing Sites</h3>
              <p class="stat-number">{{ totalLandingSites() }}</p>
              <span class="stat-label">Active sites</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .home-container {
      padding: 0 1.5rem 1.5rem 1.5rem;
      max-width: 100%;
    }

    .home-header {
      margin-bottom: 2rem;
      text-align: center;
    }

    .home-title {
      font-size: 2rem;
      font-weight: 700;
      color: var(--text-color);
      margin: 0 0 0.5rem 0;
    }

    .home-subtitle {
      font-size: 1rem;
      color: var(--text-color-secondary);
      margin: 0;
    }

    .dashboard-content {
      max-width: 1200px;
      margin: 0 auto;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 1.5rem;
      margin-bottom: 2rem;
    }

    .stat-card {
      background: var(--surface-card);
      border: 1px solid var(--surface-border);
      border-radius: 8px;
      padding: 1.5rem;
      display: flex;
      align-items: center;
      gap: 1rem;
      transition: all 0.2s ease;
    }

    .stat-card:hover {
      border-color: var(--primary-color);
      box-shadow: 0 4px 12px var(--surface-overlay);
    }

    .stat-icon {
      width: 60px;
      height: 60px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.5rem;
      color: white;
    }

    .stat-vessels .stat-icon { background: var(--blue-500); }
    .stat-routes .stat-icon { background: var(--green-500); }
    .stat-landing-sites .stat-icon { background: var(--orange-500); }

    .stat-info h3 {
      margin: 0 0 0.25rem 0;
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--text-color-secondary);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .stat-number {
      margin: 0 0 0.25rem 0;
      font-size: 2rem;
      font-weight: 700;
      color: var(--text-color);
    }

    .stat-label {
      font-size: 0.875rem;
      color: var(--text-color-secondary);
    }

    .vessel-types-list {
      margin-top: 0.5rem;
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .vessel-type-item {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.875rem;
      color: var(--text-color-secondary);
    }

    .type-color {
      width: 12px;
      height: 12px;
      border-radius: 2px;
      flex-shrink: 0;
    }

    .type-name {
      font-size: 0.875rem;
    }

    @media (max-width: 768px) {
      .home-container {
        padding: 1rem;
      }

      .stats-grid {
        grid-template-columns: 1fr;
        gap: 1rem;
      }

      .stat-card {
        padding: 1rem;
      }
    }
  `]
})
export class HomeComponent implements OnInit {
  private http = inject(HttpClient);
  
  totalVessels = signal(0);
  vesselTypes = signal<VesselTypeCount[]>([]);
  totalRoutes = signal(0);
  totalLandingSites = signal(0);

  ngOnInit() {
    this.loadStatistics();
  }

  private loadStatistics() {
    // Fetch all vessels and count by type
    this.http.get<Vessel[]>(`${environment.apiUrl}/vessels`).subscribe({
      next: (vessels) => {
        // Set total vessel count
        this.totalVessels.set(vessels.length);
        
        // Group vessels by type and count them
        const typeMap = new Map<number, VesselTypeCount>();
        
        vessels.forEach(vessel => {
          if (vessel.vessel_type) {
            const typeId = vessel.vessel_type.id;
            if (!typeMap.has(typeId)) {
              typeMap.set(typeId, {
                id: typeId,
                name: vessel.vessel_type.name,
                color: vessel.vessel_type.color,
                vessel_count: 0
              });
            }
            const type = typeMap.get(typeId)!;
            type.vessel_count++;
          }
        });
        
        // Convert map to array and sort by name
        const typesWithCounts = Array.from(typeMap.values())
          .sort((a, b) => a.name.localeCompare(b.name));
        
        this.vesselTypes.set(typesWithCounts);
      },
      error: (err) => console.error('Failed to load vessels:', err)
    });

    // Fetch routes count
    this.http.get<any[]>(`${environment.apiUrl}/routes`).subscribe({
      next: (routes) => this.totalRoutes.set(routes.length),
      error: (err) => console.error('Failed to load routes:', err)
    });

    // Fetch landing sites count
    this.http.get<any[]>(`${environment.apiUrl}/landing-sites`).subscribe({
      next: (sites) => this.totalLandingSites.set(sites.length),
      error: (err) => console.error('Failed to load landing sites:', err)
    });
  }
}