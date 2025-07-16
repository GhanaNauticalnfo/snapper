// features/export/export.component.ts
import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

// PrimeNG imports
import { TabsModule } from 'primeng/tabs';

// Tab components
import { ExportTabVesselTelemetryComponent } from './components/export-tab-vessel-telemetry.component';

@Component({
  selector: 'app-export',
  standalone: true,
  host: { class: 'export-host' },
  imports: [
    CommonModule,
    TabsModule,
    ExportTabVesselTelemetryComponent
  ],
  template: `
    <div class="export-container">
      <div class="page-header">
        <h2 class="text-2xl">Exports</h2>
      </div>

      <!-- We only have one tab for now, but this structure allows for easy expansion in the future. -->
      <p-tabs [value]="activeTabIndex()" (onChange)="onTabChange($event)" styleClass="export-tabs">
        <p-tablist>
          <p-tab value="0">
            <i class="pi pi-chart-line"></i>
            <span class="ml-2">Vessel Telemetry</span>
          </p-tab>
        </p-tablist>
        <p-tabpanels>
          <p-tabpanel value="0">
            <app-export-tab-vessel-telemetry></app-export-tab-vessel-telemetry>
          </p-tabpanel>
        </p-tabpanels>
      </p-tabs>
    </div>
  `,
  styles: [`
    :host { 
      display: block; 
      height: 100vh;
      overflow: auto;
    }
    
    .export-container { 
      padding: 0 20px 20px 20px;
      height: 100%;
      display: flex;
      flex-direction: column;
    }

    .export-tabs {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
  `]
})
export class ExportComponent {
  activeTabIndex = signal('0');

  onTabChange(event: any) {
    this.activeTabIndex.set(event.value);
  }
}