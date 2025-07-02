import { Component, OnInit, signal, HostListener, ViewChild, inject, ChangeDetectionStrategy, computed, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { TabsModule } from 'primeng/tabs';
import { CardModule } from 'primeng/card';
import { ColorPickerModule, ColorPicker } from 'primeng/colorpicker';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { FieldsetModule } from 'primeng/fieldset';
import { InputTextModule } from 'primeng/inputtext';
import { MessageService } from 'primeng/api';
import { VesselTypeSettingsComponent } from './components/vessel-type-settings.component';
import { SyncSettingsComponent } from './components/sync-settings.component';
import { SettingsService } from './services/settings.service';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    CommonModule, 
    ReactiveFormsModule,
    TabsModule, 
    CardModule,
    ColorPickerModule,
    ButtonModule,
    ToastModule,
    FieldsetModule,
    InputTextModule,
    VesselTypeSettingsComponent,
    SyncSettingsComponent
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
        </p-tablist>
        <p-tabpanels>
          <p-tabpanel value="0">
            <form [formGroup]="settingsForm" class="general-settings">
              <div class="settings-content">
                <p-fieldset legend="Routes" class="mb-4">
                  <div class="field">
                    <label for="route-color" class="block mb-2 font-semibold">Route Color</label>
                    <div class="color-control">
                      <p-colorPicker
                        #routeColorPicker
                        formControlName="routeColor"
                        format="hex"
                        appendTo="body"
                        [inline]="false"
                        [style]="{'width':'40px','height':'40px','cursor':'pointer'}">
                      </p-colorPicker>
                      <input 
                        type="text" 
                        pInputText
                        formControlName="routeColorHex"
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
            </form>
          </p-tabpanel>
          
          <p-tabpanel value="1">
            <app-vessel-type-settings></app-vessel-type-settings>
          </p-tabpanel>
          
          <p-tabpanel value="2">
            <app-sync-settings [isVisible]="activeTabIndex() === 2"></app-sync-settings>
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
export class SettingsComponent implements OnInit, OnDestroy {
  @ViewChild('routeColorPicker') routeColorPicker!: ColorPicker;
  
  private readonly settingsService = inject(SettingsService);
  private readonly messageService = inject(MessageService);
  private readonly fb = inject(FormBuilder);
  private readonly destroy$ = new Subject<void>();
  
  activeTabIndex = signal(0); // Start with General Settings tab (index 0)
  routeColor = signal('#FF0000');
  originalRouteColor = signal('#FF0000');
  loading = signal(false);
  
  settingsForm: FormGroup = this.fb.group({
    routeColor: ['#FF0000'],
    routeColorHex: ['#FF0000']
  });
  
  hasRouteColorChanged = computed(() => this.routeColor() !== this.originalRouteColor());

  ngOnInit() {
    this.loadRouteColor();
    this.setupFormSubscriptions();
  }
  
  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
  
  private setupFormSubscriptions() {
    // Subscribe to color picker changes
    this.settingsForm.get('routeColor')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(color => {
        if (color && this.isValidHexColor(color)) {
          this.routeColor.set(color);
          // Update hex input when color picker changes
          this.settingsForm.get('routeColorHex')?.setValue(color, { emitEvent: false });
        }
      });
    
    // Subscribe to hex input changes
    this.settingsForm.get('routeColorHex')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(value => {
        if (value && !value.startsWith('#')) {
          value = '#' + value;
        }
        
        if (this.isValidHexColor(value)) {
          // Expand 3-char hex to 6-char if needed
          if (value.length === 4) {
            value = '#' + value[1] + value[1] + value[2] + value[2] + value[3] + value[3];
          }
          const upperValue = value.toUpperCase();
          this.routeColor.set(upperValue);
          // Update color picker when hex input changes
          this.settingsForm.get('routeColor')?.setValue(upperValue, { emitEvent: false });
        }
      });
  }
  
  private isValidHexColor(color: string): boolean {
    const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    return hexRegex.test(color);
  }

  @HostListener('document:keydown.escape', ['$event'])
  onEscapeKeyDown(event: KeyboardEvent) {
    if (this.hasRouteColorChanged()) {
      this.cancelRouteColorChanges();
      event.preventDefault();
    }
  }

  onTabChange(event: any): void {
    // Close any open color picker overlay before switching tabs
    if (this.routeColorPicker && this.routeColorPicker.overlayVisible) {
      this.routeColorPicker.overlayVisible = false;
    }
    
    // The new p-tabs component passes the tab value in event.value
    this.activeTabIndex.set(parseInt(event.value || event, 10));
  }

  private loadRouteColor() {
    this.loading.set(true);
    this.settingsService.getRouteColor().subscribe({
      next: (color) => {
        this.routeColor.set(color);
        this.originalRouteColor.set(color);
        this.settingsForm.patchValue({
          routeColor: color,
          routeColorHex: color
        }, { emitEvent: false });
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


  cancelRouteColorChanges() {
    const originalColor = this.originalRouteColor();
    this.routeColor.set(originalColor);
    this.settingsForm.patchValue({
      routeColor: originalColor,
      routeColorHex: originalColor
    }, { emitEvent: false });
  }


  saveRouteColor() {
    this.loading.set(true);
    this.settingsService.setRouteColor(this.routeColor()).subscribe({
      next: () => {
        const savedColor = this.routeColor();
        this.originalRouteColor.set(savedColor);
        this.settingsForm.patchValue({
          routeColor: savedColor,
          routeColorHex: savedColor
        }, { emitEvent: false });
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