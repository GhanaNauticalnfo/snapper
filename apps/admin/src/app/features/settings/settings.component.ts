import { Component, OnInit, signal, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TabsModule } from 'primeng/tabs';
import { CardModule } from 'primeng/card';
import { ColorPickerModule } from 'primeng/colorpicker';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { FieldsetModule } from 'primeng/fieldset';
import { InputTextModule } from 'primeng/inputtext';
import { MessageService } from 'primeng/api';
import { VesselTypeSettingsComponent } from './components/vessel-type-settings.component';
import { SettingsService } from './services/settings.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule,
    TabsModule, 
    CardModule,
    ColorPickerModule,
    ButtonModule,
    ToastModule,
    FieldsetModule,
    InputTextModule,
    VesselTypeSettingsComponent
  ],
  providers: [MessageService],
  template: `
    <div class="settings-container">
      <div class="settings-header">
        <h2>Settings</h2>
      </div>
      
      <p-tabs [value]="activeTabIndex.toString()" (onChange)="onTabChange($event)" styleClass="settings-tabs">
        <p-tablist>
          <p-tab value="0">
            <i class="pi pi-cog"></i>
            <span class="ml-2">General</span>
          </p-tab>
          <p-tab value="1">
            <i class="pi pi-ship"></i>
            <span class="ml-2">Vessel Types</span>
          </p-tab>
        </p-tablist>
        <p-tabpanels>
          <p-tabpanel value="0">
            <div class="general-settings">
              <div class="settings-content">
                <p-fieldset legend="Routes" class="mb-4">
                  <div class="field">
                    <label for="route-color" class="block mb-2 font-semibold">Route Color</label>
                    <div class="color-control">
                      <p-colorPicker 
                        [ngModel]="routeColor()"
                        (ngModelChange)="routeColor.set($event)"
                        format="hex"
                        appendTo="body"
                        [inline]="false"
                        [style]="{'width':'40px','height':'40px','cursor':'pointer'}">
                      </p-colorPicker>
                      <input 
                        type="text" 
                        pInputText
                        [ngModel]="routeColor()"
                        (ngModelChange)="onHexInputChange($event)"
                        placeholder="#RRGGBB"
                        maxlength="7"
                        class="hex-input">
                      @if (hasRouteColorChanged()) {
                        <span class="original-color">
                          (was <span class="color-box" [style.backgroundColor]="originalRouteColor()"></span> {{ originalRouteColor() }})
                        </span>
                      }
                    </div>
                    <small class="text-600">
                      This color will be used for all routes on the map
                    </small>
                  </div>
                </p-fieldset>
              </div>
              
              <!-- Action buttons at bottom right -->
              @if (hasRouteColorChanged()) {
                <div class="settings-actions">
                  <button 
                    pButton 
                    type="button" 
                    label="Cancel" 
                    icon="pi pi-times"
                    class="p-button-text"
                    (click)="cancelRouteColorChanges()">
                  </button>
                  <button 
                    pButton 
                    type="button" 
                    label="Save Changes" 
                    icon="pi pi-check"
                    (click)="saveRouteColor()"
                    [disabled]="loading()">
                  </button>
                </div>
              }
            </div>
          </p-tabpanel>
          
          <p-tabpanel value="1">
            <app-vessel-type-settings></app-vessel-type-settings>
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
    
    .settings-header {
      margin-bottom: 2rem;
      border-bottom: 1px solid var(--surface-border, #ddd);
      padding-bottom: 1rem;
    }
    
    .settings-header h2 {
      margin: 0;
    }
    
    .general-settings h3 {
      margin-top: 0;
      margin-bottom: 1rem;
    }
    
    .color-control {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }
    
    .hex-input {
      width: 100px;
      font-family: monospace;
    }
    
    .original-color {
      color: var(--text-color-secondary);
      font-size: 0.875rem;
      display: flex;
      align-items: center;
      gap: 0.25rem;
    }
    
    .color-box {
      display: inline-block;
      width: 16px;
      height: 16px;
      border: 1px solid var(--surface-border);
      border-radius: 2px;
    }
    
    .general-settings {
      display: flex;
      flex-direction: column;
      min-height: 400px;
    }
    
    .settings-content {
      flex: 1;
    }
    
    .settings-actions {
      display: flex;
      justify-content: flex-end;
      gap: 0.5rem;
      padding: 1rem;
      margin-top: 2rem;
      border-top: 1px solid var(--surface-border);
      background-color: var(--surface-50);
    }
    
  `],
  host: {
    'class': 'settings-host'
  }
})
export class SettingsComponent implements OnInit {
  activeTabIndex = 0; // Start with General Settings tab (index 0)
  routeColor = signal('#FF0000');
  originalRouteColor = signal('#FF0000');
  loading = signal(false);

  constructor(
    private settingsService: SettingsService,
    private messageService: MessageService
  ) {}

  ngOnInit() {
    this.loadRouteColor();
  }

  @HostListener('document:keydown.escape', ['$event'])
  onEscapeKeyDown(event: KeyboardEvent) {
    if (this.hasRouteColorChanged()) {
      this.cancelRouteColorChanges();
      event.preventDefault();
    }
  }

  onTabChange(event: any): void {
    // The new p-tabs component passes the tab value in event.value
    this.activeTabIndex = parseInt(event.value || event, 10);
  }

  private loadRouteColor() {
    this.loading.set(true);
    this.settingsService.getRouteColor().subscribe({
      next: (color) => {
        this.routeColor.set(color);
        this.originalRouteColor.set(color);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error loading route color:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load route color setting'
        });
        this.loading.set(false);
      }
    });
  }

  hasRouteColorChanged(): boolean {
    return this.routeColor() !== this.originalRouteColor();
  }

  cancelRouteColorChanges() {
    this.routeColor.set(this.originalRouteColor());
  }

  onHexInputChange(value: string) {
    // Validate hex color format
    const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    
    if (value && !value.startsWith('#')) {
      value = '#' + value;
    }
    
    if (hexRegex.test(value)) {
      // Expand 3-char hex to 6-char if needed
      if (value.length === 4) {
        value = '#' + value[1] + value[1] + value[2] + value[2] + value[3] + value[3];
      }
      this.routeColor.set(value.toUpperCase());
    }
  }

  saveRouteColor() {
    this.loading.set(true);
    this.settingsService.setRouteColor(this.routeColor()).subscribe({
      next: () => {
        this.originalRouteColor.set(this.routeColor());
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Route color updated successfully'
        });
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error saving route color:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to save route color setting'
        });
        this.loading.set(false);
      }
    });
  }
}