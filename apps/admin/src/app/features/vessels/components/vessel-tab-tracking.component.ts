import { Component, Input, Output, EventEmitter, signal, OnInit, OnDestroy, OnChanges, AfterViewInit, ViewChild, ElementRef, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { VesselDataset } from '../models/vessel-dataset.model';
import { VesselDatasetService } from '../services/vessel-dataset.service';
import { OSM_STYLE, MapComponent, MapConfig } from '@ghanawaters/map';
import { TimeAgoPipe } from '@ghanawaters/shared';
import { HttpClient } from '@angular/common/http';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../../../environments/environment';

// PrimeNG imports
import { ButtonModule } from 'primeng/button';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { DialogModule } from 'primeng/dialog';

@Component({
  selector: 'app-vessel-tab-tracking',
  standalone: true,
  imports: [
    CommonModule,
    ButtonModule,
    ProgressSpinnerModule,
    TimeAgoPipe,
    MapComponent,
    DialogModule
  ],
  template: `
    <div class="tracking-dialog-content">
      <!-- Tracking Header with Key Info -->
      <div class="tracking-header">
        <div class="vessel-summary">
          <div class="vessel-title">
            <h4>{{ vessel?.name }}</h4>
            <span class="vessel-type-badge" [class.type-canoe]="vessel?.type === 'Canoe'" [class.type-vessel]="vessel?.type === 'Vessel'">
              {{ vessel?.type }}
            </span>
          </div>
          <div class="tracking-stats">
            <div class="stat-item">
              <span class="stat-label">Last Report:</span>
              <span class="stat-value">
                {{ vessel?.last_seen | date:'dd/MM/yyyy HH:mm:ss' }}
                <span class="time-ago">({{ vessel?.last_seen | timeAgo }})</span>
              </span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Coordinates:</span>
              <span class="stat-value coordinates">
                {{ vessel?.last_position?.latitude?.toFixed(6) || 'N/A' }}, 
                {{ vessel?.last_position?.longitude?.toFixed(6) || 'N/A' }}
              </span>
            </div>
            <div class="stat-item">
              <p-button 
                label="Show Nearby Vessels" 
                icon="pi pi-map-marker" 
                styleClass="p-button-secondary action-button"
                (onClick)="openNearbyDialog()"
                [badge]="nearbyVessels().length > 0 ? nearbyVessels().length.toString() : undefined"
              ></p-button>
              <span class="nearby-info">Within {{ NEARBY_RADIUS_KM }}km in last {{ NEARBY_TIME_WINDOW_DAYS }} days</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Live Tracking:</span>
              <span class="stat-value">
                @if (isTrackingLive()) {
                  <i class="pi pi-circle-fill live-indicator"></i>
                } @else {
                  <i class="pi pi-circle offline-indicator"></i>
                  <span class="offline-status">Offline</span>
                }
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Dummy Positions Controls -->
      <div style="margin-bottom: 20px; display: flex; align-items: center; gap: 10px;">
        <p-button 
          [label]="fakeMovementActive() ? 'Stop sending dummy positions' : 'Send Dummy Positions'"
          [icon]="fakeMovementActive() ? 'pi pi-stop' : 'pi pi-play'"
          [styleClass]="(fakeMovementActive() ? 'p-button-danger' : 'p-button-success') + ' p-button-sm'"
          (onClick)="toggleFakeMovement()"
          [loading]="togglingMovement()"
        ></p-button>
        @if (fakeMovementActive()) {
          <span>{{ updatesSent() }} Updates</span>
        }
      </div>

      <!-- Map Container using shared Map component -->
      <div class="tracking-map-container">
        @if (hasValidPosition()) {
          <lib-map 
            #trackingMap
            [config]="trackingMapConfig()"
            [vesselFilter]="vessel?.id || null"
          >
          </lib-map>
        } @else {
          <div class="no-position-message">
            <div class="no-position-content">
              <i class="pi pi-map-marker text-4xl mb-3 text-gray-400"></i>
              <h5>No Position Data Available</h5>
              <p class="text-muted">This vessel has not reported its position yet.</p>
              <p class="text-muted">Position data will appear here once the vessel starts transmitting location updates.</p>
            </div>
          </div>
        }
      </div>
    </div>

    <!-- Nearby Vessels Dialog -->
    <p-dialog
      [(visible)]="nearbyDialogVisible"
      [style]="{width: '85vw', 'max-width': '1200px', height: '80vh'}"
      [modal]="true"
      [draggable]="false"
      [resizable]="false"
      [closeOnEscape]="true"
      [closable]="true"
      header="Nearby Vessels"
      (onHide)="closeNearbyDialog()"
    >
      <div class="nearby-dialog-content">
        <div class="nearby-header">
          <h5>Vessels within {{ NEARBY_RADIUS_KM }}km of {{ vessel?.name }}</h5>
          <p class="text-muted">Showing vessels that reported position in the last {{ NEARBY_TIME_WINDOW_DAYS }} days</p>
        </div>
        
        <div class="nearby-container">
          <div class="nearby-list">
            @if (nearbyVessels().length === 0) {
              <div class="no-vessels-message">
                <i class="pi pi-info-circle"></i>
                <p>No vessels found within the specified range and time period.</p>
              </div>
            } @else {
              <div class="vessel-count">Found {{ nearbyVessels().length }} vessel{{ nearbyVessels().length > 1 ? 's' : '' }}</div>
              @for (vessel of nearbyVessels(); track vessel.id) {
                <div class="nearby-vessel-card" (click)="selectNearbyVessel(vessel)" [class.selected]="selectedNearbyVessel()?.id === vessel.id">
                  <div class="vessel-header">
                    <strong>{{ vessel.name }}</strong>
                    <span class="vessel-type-badge" [class.type-canoe]="vessel.type === 'Canoe'" [class.type-vessel]="vessel.type === 'Vessel'">{{ vessel.type }}</span>
                  </div>
                  <div class="vessel-info-row">
                    <i class="pi pi-map-marker"></i>
                    <span>{{ vessel.last_position?.latitude?.toFixed(4) }}°, {{ vessel.last_position?.longitude?.toFixed(4) }}°</span>
                  </div>
                  <div class="vessel-info-row">
                    <i class="pi pi-clock"></i>
                    <span>{{ vessel.last_seen | timeAgo }}</span>
                    <span class="exact-time">({{ vessel.last_seen | date:'dd/MM HH:mm' }})</span>
                  </div>
                  <div class="vessel-info-row">
                    <i class="pi pi-compass"></i>
                    @if (this.vessel?.last_position?.latitude && this.vessel?.last_position?.longitude && vessel.last_position?.latitude && vessel.last_position?.longitude) {
                      <span>{{ calculateDistance(
                        this.vessel!.last_position!.latitude,
                        this.vessel!.last_position!.longitude,
                        vessel.last_position!.latitude,
                        vessel.last_position!.longitude
                      ).toFixed(1) }} km away</span>
                    } @else {
                      <span>Distance unavailable</span>
                    }
                  </div>
                </div>
              }
            }
          </div>
          
          <div class="nearby-map">
            <div #nearbyMapContainer class="nearby-map-container"></div>
          </div>
        </div>
      </div>
      
      <ng-template pTemplate="footer">
        <p-button label="Close" icon="pi pi-times" styleClass="p-button-secondary" (onClick)="closeNearbyDialog()"></p-button>
      </ng-template>
    </p-dialog>
  `,
  styles: [`
    /* Tracking Dialog Styles */
    .tracking-dialog-content {
      height: 100%;
      display: flex;
      flex-direction: column;
    }

    .tracking-header {
      padding: 1.5rem;
      border-bottom: 1px solid var(--surface-300);
      background: var(--surface-50);
    }

    .vessel-summary {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .vessel-title {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .vessel-title h4 {
      margin: 0;
      color: var(--text-color);
      font-size: 1.5rem;
    }

    .vessel-type-badge {
      padding: 0.25rem 0.75rem;
      border-radius: 12px;
      font-size: 0.875rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.025em;
    }

    .vessel-type-badge.type-canoe {
      background: var(--blue-100);
      color: var(--blue-700);
    }

    .vessel-type-badge.type-vessel {
      background: var(--orange-100);
      color: var(--orange-700);
    }

    .tracking-stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 1rem;
      align-items: center;
    }

    .stat-item {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .stat-item:last-child {
      flex-direction: row;
      align-items: center;
      gap: 0.75rem;
    }

    .stat-label {
      font-weight: 600;
      font-size: 0.875rem;
      color: var(--text-color-secondary);
    }

    .stat-value {
      font-size: 1rem;
      color: var(--text-color);
      display: flex;
      flex-wrap: nowrap;
      align-items: center;
      gap: 0.5rem;
    }

    .coordinates {
      font-family: monospace;
      background: var(--surface-ground);
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-size: 0.875rem;
      color: var(--text-color);
    }

    .time-ago {
      color: var(--text-color-secondary);
      font-size: 0.875rem;
      white-space: nowrap;
    }

    .nearby-info {
      color: var(--text-color-secondary);
      font-size: 0.875rem;
    }

    .action-button {
      height: 40px;
      padding: 0 1rem;
      font-size: 0.875rem;
      font-weight: 500;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
    }

    /* Live tracking status indicators */
    .live-indicator {
      color: #4caf50;
      font-size: 0.75rem;
      margin-right: 0.25rem;
      animation: pulse 2s infinite;
    }

    .offline-indicator {
      color: #f44336;
      font-size: 0.75rem;
      margin-right: 0.25rem;
    }

    .live-status {
      color: #4caf50;
      font-weight: 600;
      margin-right: 0.5rem;
      white-space: nowrap;
    }

    .offline-status {
      color: #f44336;
      font-weight: 600;
      white-space: nowrap;
    }

    @keyframes pulse {
      0% { opacity: 1; }
      50% { opacity: 0.5; }
      100% { opacity: 1; }
    }

    .tracking-map-container {
      flex: 1;
      position: relative;
      overflow: hidden;
      min-height: 500px;
    }

    .tracking-map {
      width: 100%;
      height: 100%;
      min-height: 500px;
    }

    /* No position message */
    .no-position-message {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100%;
      min-height: 500px;
      background: var(--surface-50);
      border: 2px dashed var(--surface-300);
      border-radius: 8px;
    }

    .no-position-content {
      text-align: center;
      max-width: 400px;
      padding: 2rem;
    }

    .no-position-content h5 {
      color: var(--text-color);
      margin-bottom: 1rem;
      font-size: 1.25rem;
    }

    .no-position-content p {
      margin-bottom: 0.5rem;
      line-height: 1.5;
    }

    .text-4xl {
      font-size: 2.25rem;
    }

    .mb-3 {
      margin-bottom: 1rem;
    }

    .text-gray-400 {
      color: #9ca3af;
    }

    .text-muted {
      color: var(--text-color-secondary, #6c757d);
      font-size: 0.9em;
    }
    
    /* Nearby Vessels Dialog Styles */
    .nearby-dialog-content {
      height: 100%;
      display: flex;
      flex-direction: column;
    }
    
    .nearby-header {
      margin-bottom: 1rem;
    }
    
    .nearby-header h5 {
      margin: 0 0 0.5rem 0;
      color: var(--text-color);
    }
    
    .nearby-container {
      display: flex;
      gap: 1rem;
      height: 500px;
    }
    
    .nearby-list {
      flex: 1;
      max-width: 400px;
      overflow-y: auto;
      border: 1px solid var(--surface-300);
      border-radius: 4px;
      padding: 1rem;
    }
    
    .no-vessels-message {
      text-align: center;
      padding: 2rem;
      color: var(--text-color-secondary);
    }
    
    .no-vessels-message i {
      font-size: 2rem;
      margin-bottom: 1rem;
      display: block;
    }
    
    .vessel-count {
      margin-bottom: 1rem;
      font-weight: 600;
      color: var(--text-color);
    }
    
    .nearby-vessel-card {
      padding: 1rem;
      border: 1px solid var(--surface-300);
      border-radius: 4px;
      margin-bottom: 0.5rem;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    
    .nearby-vessel-card:hover {
      background: var(--surface-100);
      border-color: var(--primary-color);
    }
    
    .nearby-vessel-card.selected {
      background: var(--primary-50);
      border-color: var(--primary-color);
    }
    
    .vessel-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.5rem;
    }
    
    .vessel-type-badge {
      font-size: 0.7rem;
      padding: 0.1rem 0.3rem;
      border-radius: 3px;
      font-weight: 600;
    }
    
    .vessel-type-badge.type-canoe {
      background-color: var(--blue-100);
      color: var(--blue-700);
    }
    
    .vessel-type-badge.type-vessel {
      background-color: var(--orange-100);
      color: var(--orange-700);
    }
    
    .vessel-info-row {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 0.25rem;
      font-size: 0.875rem;
    }
    
    .vessel-info-row i {
      width: 16px;
      color: var(--text-color-secondary);
    }
    
    .exact-time {
      color: var(--text-color-secondary);
      font-size: 0.75rem;
      margin-left: auto;
      white-space: nowrap;
    }
    
    .nearby-map {
      flex: 2;
      min-height: 500px;
    }
    
    .nearby-map-container {
      width: 100%;
      height: 100%;
      border: 1px solid var(--surface-300);
      border-radius: 4px;
    }
  `]
})
export class VesselTabTrackingComponent implements OnInit, OnDestroy, OnChanges, AfterViewInit {
  @Input() vessel: VesselDataset | null = null;
  @Input() allVessels: VesselDataset[] = [];
  @Input() isVisible: boolean = false;
  @Output() nearbyRequested = new EventEmitter<void>();
  
  @ViewChild('trackingMap') trackingMap?: MapComponent;
  @ViewChild('nearbyMapContainer') nearbyMapContainer!: ElementRef<HTMLDivElement>;

  // Constants
  readonly NEARBY_RADIUS_KM = 100;
  readonly NEARBY_TIME_WINDOW_DAYS = 31;

  // Tracking signals
  isTrackingLive = signal(false);
  lastUpdateTime = signal<Date | null>(null);
  nearbyVessels = signal<VesselDataset[]>([]);
  
  // Fake movement signals
  fakeMovementActive = signal(false);
  togglingMovement = signal(false);
  updatesSent = signal(0);
  
  // Nearby dialog signals
  nearbyDialogVisible = false;
  selectedNearbyVessel = signal<VesselDataset | null>(null);
  
  // Map configuration for consistent zoom behavior
  trackingMapConfig = signal<Partial<MapConfig>>({});
  
  private socket?: Socket;
  private fakeMovementInterval?: any;
  private nearbyMap: any;
  private maplibregl: any;

  constructor(
    private http: HttpClient,
    private vesselDatasetService: VesselDatasetService
  ) {
    // Import MapLibre GL dynamically
    import('maplibre-gl').then(maplibre => {
      this.maplibregl = maplibre.default;
    });
  }

  ngOnInit() {
    if (this.vessel) {
      // Only setup live tracking if tab is visible
      if (this.isVisible) {
        this.setupLiveTracking();
      }
      this.loadNearbyVessels();
      this.updateTrackingMapConfig();
    }
  }

  ngAfterViewInit() {
    // Center map on vessel once the view is fully initialized
    if (this.vessel && this.hasValidPosition()) {
      setTimeout(() => {
        this.centerMapOnVessel();
      }, 1000); // Wait for map to be fully loaded
    }
  }

  ngOnDestroy() {
    this.disconnectLiveTracking();
    this.stopFakeMovement();
    
    // Clean up nearby map
    if (this.nearbyMap) {
      this.nearbyMap.remove();
      this.nearbyMap = null;
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    // Handle visibility changes
    if (changes['isVisible']) {
      if (this.isVisible && this.vessel && !this.socket) {
        // Tab became visible - start tracking
        this.setupLiveTracking();
      } else if (!this.isVisible && this.socket) {
        // Tab became hidden - stop tracking
        this.disconnectLiveTracking();
      }
    }
    
    // Handle vessel changes
    if (changes['vessel'] && this.vessel) {
      // Only setup live tracking if tab is visible
      if (this.isVisible) {
        this.setupLiveTracking();
      }
      this.loadNearbyVessels();
      this.updateTrackingMapConfig();
      
      // Center map on vessel's position when vessel changes (only after view init)
      if (this.trackingMap) {
        setTimeout(() => {
          this.centerMapOnVessel();
        }, 300);
      }
    }
  }

  hasValidPosition(): boolean {
    return !!(this.vessel?.last_position?.latitude && this.vessel?.last_position?.longitude);
  }

  getVesselCenter(): [number, number] {
    if (!this.hasValidPosition()) {
      return [0, 0]; // Default center
    }
    return [this.vessel!.last_position!.longitude, this.vessel!.last_position!.latitude];
  }
  
  private updateTrackingMapConfig(): void {
    if (!this.hasValidPosition()) {
      return;
    }
    
    const [lng, lat] = this.getVesselCenter();
    
    // Use the same configuration pattern as Live page for consistent zoom behavior
    this.trackingMapConfig.set({
      mapStyle: OSM_STYLE,
      center: [lng, lat],
      zoom: 12.5, // Use half-integer zoom like Live page for consistency
      minZoom: 1,
      maxZoom: 18,
      height: '500px',
      showControls: false,
      showFullscreenControl: true,
      showCoordinateDisplay: true,
      availableLayers: [],
      initialActiveLayers: []
    });
  }

  centerMapOnVessel(): void {
    if (this.trackingMap && this.hasValidPosition()) {
      const [lng, lat] = this.getVesselCenter();
      // Use the public method to center the map
      this.trackingMap.centerOnCoordinates(lng, lat);
    }
  }

  private setupLiveTracking() {
    if (!this.vessel) return;
    
    this.disconnectLiveTracking();
    
    // Setup WebSocket connection for live tracking
    // Derive WebSocket URL from API URL
    const wsUrl = environment.apiUrl
      .replace('/api', '')
      .replace('https://', 'wss://')
      .replace('http://', 'ws://');
    
    this.socket = io(`${wsUrl}/tracking`, {
      transports: ['websocket']
    });

    this.socket.on('connect', () => {
      console.log('Connected to live tracking');
      this.isTrackingLive.set(true);
      
      // Subscribe to vessel updates
      this.socket?.emit('subscribe-vessel', this.vessel?.id);
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from live tracking');
      this.isTrackingLive.set(false);
    });

    this.socket.on('position-update', (data: any) => {
      if (data.vesselId === this.vessel?.id) {
        this.lastUpdateTime.set(new Date());
        // Update vessel position if needed - data now has flat lat/lng structure
        if (this.vessel && data.lat !== undefined && data.lng !== undefined) {
          this.vessel.last_position = {
            latitude: data.lat,
            longitude: data.lng
          };
          this.vessel.last_seen = new Date(data.timestamp);
          
          // Center map on updated position
          this.centerMapOnVessel();
        }
      }
    });

    this.socket.on('error', (error: any) => {
      console.error('WebSocket error:', error);
      this.isTrackingLive.set(false);
    });
  }

  private disconnectLiveTracking() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = undefined;
    }
    this.isTrackingLive.set(false);
  }

  private loadNearbyVessels() {
    if (!this.vessel?.last_position) return;
    
    const { latitude, longitude } = this.vessel.last_position;
    this.vesselDatasetService.getNearbyVessels(
      latitude, 
      longitude, 
      this.NEARBY_RADIUS_KM, 
      this.NEARBY_TIME_WINDOW_DAYS
    ).subscribe({
      next: (vessels: VesselDataset[]) => {
        // Filter out the current vessel
        const nearby = vessels.filter((v: VesselDataset) => v.id !== this.vessel?.id);
        this.nearbyVessels.set(nearby);
      },
      error: (error: any) => {
        console.error('Error loading nearby vessels:', error);
        this.nearbyVessels.set([]);
      }
    });
  }

  openNearbyDialog() {
    this.findNearbyVessels();
    this.nearbyDialogVisible = true;
    
    // Initialize nearby map after dialog is shown
    setTimeout(() => {
      this.initializeNearbyMap();
    }, 100);
  }
  
  closeNearbyDialog() {
    this.nearbyDialogVisible = false;
    this.selectedNearbyVessel.set(null);
    
    // Clean up nearby map
    if (this.nearbyMap) {
      this.nearbyMap.remove();
      this.nearbyMap = null;
    }
  }
  
  selectNearbyVessel(vessel: VesselDataset) {
    this.selectedNearbyVessel.set(vessel);
    
    // Center map on selected vessel
    if (this.nearbyMap && vessel.last_position) {
      this.nearbyMap.flyTo({
        center: [vessel.last_position.longitude, vessel.last_position.latitude],
        zoom: 14,
        speed: 1.5,
        curve: 1.2
      });
    }
  }
  
  private findNearbyVessels() {
    if (!this.vessel?.last_position) return;
    
    const now = new Date();
    const timeWindowAgo = new Date(now.getTime() - this.NEARBY_TIME_WINDOW_DAYS * 24 * 60 * 60 * 1000);
    
    // Filter vessels within configured radius and time window
    const nearby = this.allVessels.filter(vessel => {
      // Skip current vessel
      if (vessel.id === this.vessel!.id) return false;
      
      // Check if reported within time window
      if (!vessel.last_seen || new Date(vessel.last_seen) < timeWindowAgo) return false;
      
      // Check distance
      if (!vessel.last_position?.latitude || !vessel.last_position?.longitude) return false;
      
      const distance = this.calculateDistance(
        this.vessel!.last_position!.latitude,
        this.vessel!.last_position!.longitude,
        vessel.last_position.latitude,
        vessel.last_position.longitude
      );
      
      return distance <= this.NEARBY_RADIUS_KM;
    });
    
    this.nearbyVessels.set(nearby);
  }
  
  private async initializeNearbyMap(): Promise<void> {
    if (!this.nearbyMapContainer || !this.maplibregl || !this.vessel?.last_position) return;
    
    // Initialize map with consistent zoom behavior
    this.nearbyMap = new this.maplibregl.Map({
      container: this.nearbyMapContainer.nativeElement,
      style: OSM_STYLE as any,
      center: [this.vessel.last_position.longitude, this.vessel.last_position.latitude],
      zoom: 10.0, // Use clean integer zoom for consistency
      // Add zoom constraints for consistent behavior
      minZoom: 1,
      maxZoom: 18
    });
    
    // Add navigation controls
    this.nearbyMap.addControl(new this.maplibregl.NavigationControl());
    
    // Add marker for current vessel
    new this.maplibregl.Marker({
      color: this.vessel.type === 'Canoe' ? '#1565C0' : '#E65100'
    })
      .setLngLat([this.vessel.last_position.longitude, this.vessel.last_position.latitude])
      .setPopup(
        new this.maplibregl.Popup().setHTML(
          `<strong>${this.vessel.name}</strong> (Current)<br/>
           Type: ${this.vessel.type}<br/>
           Last seen: ${this.vessel.last_seen ? new Date(this.vessel.last_seen).toLocaleString('en-GB', { hour12: false }) : 'Never'}`
        )
      )
      .addTo(this.nearbyMap);
    
    // Add markers for nearby vessels
    this.nearbyVessels().forEach(vessel => {
      if (!vessel.last_position) return;
      
      new this.maplibregl.Marker({
        color: vessel.type === 'Canoe' ? '#64B5F6' : '#FFB74D'
      })
        .setLngLat([vessel.last_position.longitude, vessel.last_position.latitude])
        .setPopup(
          new this.maplibregl.Popup().setHTML(
            `<strong>${vessel.name}</strong><br/>
             Type: ${vessel.type}<br/>
             Last seen: ${vessel.last_seen ? new Date(vessel.last_seen).toLocaleString('en-GB', { hour12: false }) : 'Never'}<br/>
             Distance: ${this.calculateDistance(
               this.vessel!.last_position!.latitude,
               this.vessel!.last_position!.longitude,
               vessel.last_position.latitude,
               vessel.last_position.longitude
             ).toFixed(1)} km`
          )
        )
        .addTo(this.nearbyMap);
    });
    
    // Fit bounds to show all markers
    if (this.nearbyVessels().length > 0) {
      const bounds = new this.maplibregl.LngLatBounds();
      bounds.extend([this.vessel.last_position.longitude, this.vessel.last_position.latitude]);
      
      this.nearbyVessels().forEach(vessel => {
        if (vessel.last_position) {
          bounds.extend([vessel.last_position.longitude, vessel.last_position.latitude]);
        }
      });
      
      this.nearbyMap.fitBounds(bounds, { padding: 50 });
    }
  }
  
  // Haversine formula to calculate distance between two coordinates in km
  calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
  
  private toRad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  toggleFakeMovement() {
    if (!this.vessel) return;
    
    if (this.fakeMovementActive()) {
      this.stopFakeMovement();
    } else {
      this.startFakeMovement();
    }
  }

  private startFakeMovement() {
    if (!this.vessel) return;
    
    this.togglingMovement.set(true);
    this.fakeMovementActive.set(true);
    this.updatesSent.set(0);
    
    // Use existing position or default to Ghana coast coordinates
    let currentLat = this.vessel.last_position?.latitude || 5.6;
    let currentLng = this.vessel.last_position?.longitude || 0.2;
    let direction = 0; // degrees
    
    this.fakeMovementInterval = setInterval(() => {
      // Generate small, realistic direction changes (±10 degrees max)
      direction += (Math.random() - 0.5) * 20; // More realistic direction changes
      
      // Ensure direction stays within 0-360 degrees
      direction = ((direction % 360) + 360) % 360;
      
      const distance = 0.001; // Small movement distance
      
      // Proper geographic movement: 
      // - 0° = North (positive latitude)
      // - 90° = East (positive longitude)  
      // - 180° = South (negative latitude)
      // - 270° = West (negative longitude)
      currentLat += Math.cos(direction * Math.PI / 180) * distance;
      currentLng += Math.sin(direction * Math.PI / 180) * distance;
      
      // Calculate consistent speed based on movement
      const speed = Math.random() * 5 + 8; // Speed between 8-13 knots
      
      // Send position update with heading that matches movement direction
      this.http.post(`${environment.apiUrl}/vessels/${this.vessel?.id}/telemetry`, {
        position: {
          type: 'Point',
          coordinates: [currentLng, currentLat]
        },
        speed_knots: speed,
        heading_degrees: direction // Heading now matches actual movement direction
      }).subscribe({
        next: (response: any) => {
          this.updatesSent.update(count => count + 1);
        },
        error: (error: any) => {
          console.error('Error sending fake position:', error);
        }
      });
    }, 2000); // Send update every 2 seconds
    
    this.togglingMovement.set(false);
  }

  private stopFakeMovement() {
    if (this.fakeMovementInterval) {
      clearInterval(this.fakeMovementInterval);
      this.fakeMovementInterval = undefined;
    }
    this.fakeMovementActive.set(false);
    this.togglingMovement.set(false);
  }
}