// features/home/home.component.ts
import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="home-container">
      <div class="home-header">
        <h1 class="home-title">Maritime Management System</h1>
        <p class="home-subtitle">Manage vessels, tracking, and maritime operations</p>
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
              <span class="stat-label">Active fleet</span>
            </div>
          </div>

          <div class="stat-card stat-tracking">
            <div class="stat-icon">
              <i class="pi pi-map-marker"></i>
            </div>
            <div class="stat-info">
              <h3>Active Tracking</h3>
              <p class="stat-number">{{ activeTracking() }}</p>
              <span class="stat-label">Vessels reporting</span>
            </div>
          </div>

          <div class="stat-card stat-devices">
            <div class="stat-icon">
              <i class="pi pi-mobile"></i>
            </div>
            <div class="stat-info">
              <h3>Connected Devices</h3>
              <p class="stat-number">{{ connectedDevices() }}</p>
              <span class="stat-label">Active connections</span>
            </div>
          </div>

          <div class="stat-card stat-alerts">
            <div class="stat-icon">
              <i class="pi pi-exclamation-triangle"></i>
            </div>
            <div class="stat-info">
              <h3>Recent Alerts</h3>
              <p class="stat-number">{{ recentAlerts() }}</p>
              <span class="stat-label">Last 24 hours</span>
            </div>
          </div>
        </div>

        <div class="recent-activity">
          <h3>Recent Activity</h3>
          <div class="activity-list">
            <div class="activity-item">
              <i class="pi pi-check-circle"></i>
              <span>Vessel "Accra Star" position updated</span>
              <span class="activity-time">2 minutes ago</span>
            </div>
            <div class="activity-item">
              <i class="pi pi-plus-circle"></i>
              <span>New device activated for "Cape Coast Navigator"</span>
              <span class="activity-time">15 minutes ago</span>
            </div>
            <div class="activity-item">
              <i class="pi pi-sync"></i>
              <span>Position sync completed for 8 vessels</span>
              <span class="activity-time">1 hour ago</span>
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
    .stat-tracking .stat-icon { background: var(--green-500); }
    .stat-devices .stat-icon { background: var(--orange-500); }
    .stat-alerts .stat-icon { background: var(--red-500); }

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

    .recent-activity {
      background: var(--surface-card);
      border: 1px solid var(--surface-border);
      border-radius: 8px;
      padding: 1.5rem;
    }

    .recent-activity h3 {
      margin: 0 0 1rem 0;
      font-size: 1.1rem;
      font-weight: 600;
      color: var(--text-color);
    }

    .activity-list {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .activity-item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem;
      background: var(--surface-ground);
      border-radius: 6px;
    }

    .activity-item i {
      color: var(--green-500);
      flex-shrink: 0;
    }

    .activity-item span:first-of-type {
      flex: 1;
      font-size: 0.875rem;
      color: var(--text-color);
    }

    .activity-time {
      font-size: 0.75rem;
      color: var(--text-color-secondary);
      flex-shrink: 0;
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
export class HomeComponent {
  totalVessels = signal(12);
  activeTracking = signal(8);
  connectedDevices = signal(15);
  recentAlerts = signal(3);
}