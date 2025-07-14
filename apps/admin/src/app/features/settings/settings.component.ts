import { Component, signal, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TabsModule } from 'primeng/tabs';
import { CardModule } from 'primeng/card';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { VesselTypeSettingsComponent } from './components/vessel-type-settings.component';
import { SyncSettingsComponent } from './components/sync-settings.component';
import { DatabaseSettingsComponent } from './components/database-settings/database-settings.component';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    CommonModule, 
    TabsModule, 
    CardModule,
    ToastModule,
    VesselTypeSettingsComponent,
    SyncSettingsComponent,
    DatabaseSettingsComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [MessageService],
  template: `
    <div class="settings-container">
      <div class="page-header">
        <h2>Settings</h2>
      </div>
      
      <p-tabs [value]="activeTabIndex().toString()" (onChange)="onTabChange($event)" styleClass="settings-tabs">
        <p-tablist>
          <p-tab value="0">
            <i class="pi pi-cog"></i>
            <span class="ml-2">General</span>
          </p-tab>
          <p-tab value="1">
            <i class="pi pi-ship"></i>
            <span class="ml-2">Vessel Types</span>
          </p-tab>
          <p-tab value="2">
            <i class="pi pi-sync"></i>
            <span class="ml-2">Sync</span>
          </p-tab>
          <p-tab value="3">
            <i class="pi pi-database"></i>
            <span class="ml-2">Database</span>
          </p-tab>
        </p-tablist>
        <p-tabpanels>
          <p-tabpanel value="0">
            <div class="general-settings">
              <div class="settings-content">
                <p class="text-500">No general settings available at this time.</p>
              </div>
            </div>
          </p-tabpanel>
          
          <p-tabpanel value="1">
            <app-vessel-type-settings></app-vessel-type-settings>
          </p-tabpanel>
          
          <p-tabpanel value="2">
            <app-sync-settings [isVisible]="activeTabIndex() === 2"></app-sync-settings>
          </p-tabpanel>
          
          <p-tabpanel value="3">
            <app-database-settings></app-database-settings>
          </p-tabpanel>
        </p-tabpanels>
      </p-tabs>
    </div>
    
    <p-toast></p-toast>
  `,
  styles: [`
    .settings-container {
      padding: 0 20px 20px 20px;
    }
    
    .general-settings {
      padding: 2rem;
      min-height: 400px;
    }
    
    .settings-content {
      flex: 1;
    }
    
  `],
  host: {
    'class': 'settings-host'
  }
})
export class SettingsComponent {
  private readonly messageService = inject(MessageService);
  
  activeTabIndex = signal(0); // Start with General Settings tab (index 0)

  onTabChange(event: any): void {
    // The new p-tabs component passes the tab value in event.value
    this.activeTabIndex.set(parseInt(event.value || event, 10));
  }
}