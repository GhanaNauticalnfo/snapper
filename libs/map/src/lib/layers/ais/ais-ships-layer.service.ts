// libs/map/src/lib/layers/ais/ais-ships-layer.service.ts
import { Injectable, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Map as MapLibreMap, GeoJSONSource, Popup } from 'maplibre-gl';
import { BaseLayerService } from '../base-layer.service';
import { firstValueFrom, BehaviorSubject, Observable } from 'rxjs';
import { io, Socket } from 'socket.io-client';

interface PositionUpdate {
  vesselId: number;
  vesselName: string;
  vesselType: string;
  vesselTypeId?: number;
  vesselTypeColor?: string;
  lat: number;
  lng: number;
  heading: number | null;
  speed: number | null;
  status: string | null;
  timestamp: Date;
}


@Injectable({
  providedIn: 'root'
})
export class AisShipLayerService extends BaseLayerService implements OnDestroy {
  readonly layerId = 'ais-ships';
  private map: MapLibreMap | null = null;
  private updateInterval: any;
  private socket: Socket | null = null;
  private syncSocket: Socket | null = null;
  private vesselPositions = new Map<number, PositionUpdate>();
  private iconCache = new Set<string>();
  
  // Vessel filtering configuration
  private vesselFilter: number | null = null;
  
  // Expose vessel positions as Observable
  private vesselPositions$ = new BehaviorSubject<PositionUpdate[]>([]);
  public readonly vesselPositionsObservable$ = this.vesselPositions$.asObservable();
  
  constructor(
    private http: HttpClient
  ) {
    super();
  }
  
  // Configure vessel filtering
  setVesselFilter(vesselId: number | null): void {
    this.vesselFilter = vesselId;
    console.log('AIS Layer: vessel filter set to', vesselId);
    
    // Re-render existing data with new filter
    if (this.map) {
      this.updateMapDisplay();
    }
  }
  
  initialize(map: MapLibreMap): void {
    this.map = map;
    console.log('AIS Layer: Initializing AIS ships layer');
    
    // Initialize WebSocket connections
    this.initializeWebSocket();
    this.initializeSyncWebSocket();
    
    // Initialize layers immediately
    this.initializeLayers();
  }
  
  private async ensureIconExists(color: string): Promise<string> {
    if (!this.map || !color) {
      return 'ship-icon-#808080'; // Default gray
    }
    
    const iconName = `ship-icon-${color}`;
    
    // Check if icon already exists
    if (this.iconCache.has(color)) {
      return iconName;
    }
    
    try {
      // Create the icon if it doesn't exist
      const response = await this.createShipIcon(color);
      this.map.addImage(iconName, response.data);
      this.iconCache.add(color);
      console.log(`AIS Layer: Created icon '${iconName}' with color ${color}`);
      return iconName;
    } catch (error) {
      console.error(`Failed to create icon for color ${color}:`, error);
      // Return default icon name as fallback
      return 'ship-icon-#808080';
    }
  }

  private createShipIcon(color: string): Promise<{data: HTMLImageElement | ImageBitmap | ImageData | {width: number, height: number, data: Uint8Array | Uint8ClampedArray}}> {
    return new Promise((resolve, reject) => {
      // Create a directional ship icon using SVG (pointing up/north by default)
      const svgString = `
        <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <!-- Simple triangular arrow pointing up -->
          <path d="M12 3 L20 16 L12 13 L4 16 Z" 
                fill="${color}" 
                stroke="#000000" 
                stroke-width="1.5" 
                stroke-linejoin="round"/>
        </svg>
      `;
      
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = 24;
      canvas.height = 24;
      
      const img = new Image();
      img.onload = () => {
        if (ctx) {
          ctx.drawImage(img, 0, 0, 24, 24);
          const imageData = ctx.getImageData(0, 0, 24, 24);
          resolve({ data: imageData });
        } else {
          reject(new Error('Failed to get canvas context'));
        }
      };
      img.onerror = () => reject(new Error('Failed to load SVG'));
      img.src = 'data:image/svg+xml;base64,' + btoa(svgString);
    });
  }
  
  private initializeWithFallbackIcon(): void {
    if (!this.map) return;
    
    // Use a simple circle as fallback
    this.map.addSource(this.layerId, {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] }
    });
    
    // Use a circle layer instead of symbol layer
    this.map.addLayer({
      id: this.layerId,
      type: 'circle',
      source: this.layerId,
      paint: {
        'circle-radius': 5,
        'circle-color': '#007cbf',
        'circle-stroke-width': 1,
        'circle-stroke-color': '#fff'
      }
    });
    
    // Add click event listener for vessel popups (same as symbol layer)
    this.map.on('click', this.layerId, (e) => {
      if (e.features && e.features.length > 0) {
        const feature = e.features[0];
        const coordinates = (feature.geometry as any).coordinates.slice();
        const properties = feature.properties;
        
        // Ensure that if the map is zoomed out such that multiple
        // copies of the feature are visible, the popup appears
        // over the copy being pointed to.
        while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
          coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
        }
        
        // Create popup content with vessel information
        const popupContent = this.createVesselPopupContent(properties);
        
        new Popup()
          .setLngLat(coordinates)
          .setHTML(popupContent)
          .addTo(this.map!);
      }
    });
    
    // Change the cursor to a pointer when hovering over a vessel
    this.map.on('mouseenter', this.layerId, () => {
      this.map!.getCanvas().style.cursor = 'pointer';
    });
    
    // Change it back to default when leaving
    this.map.on('mouseleave', this.layerId, () => {
      this.map!.getCanvas().style.cursor = '';
    });
    
    // Start periodic updates
    this.beginUpdates();
  }
  
  private async initializeLayers(): Promise<void> {
    if (!this.map) return;
    
    // Create default gray icon
    await this.ensureIconExists('#808080');
    
    // Check if source already exists
    if (!this.map.getSource(this.layerId)) {
      // Add source for ships
      this.map.addSource(this.layerId, {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] }
      });
    }
    
    // Check if layer already exists
    if (!this.map.getLayer(this.layerId)) {
      // Add layer for ships
      this.map.addLayer({
      id: this.layerId,
      type: 'symbol',
      source: this.layerId,
      layout: {
        'icon-image': ['concat', 'ship-icon-', ['get', 'vesselTypeColor']],
        'icon-rotate': ['get', 'heading'],
        'icon-size': [
          'case',
          ['get', 'isSelected'],
          1.2,  // Larger size for selected vessel
          0.75  // Normal size for other vessels
        ],
        'icon-allow-overlap': true
      }
    });
    }
    
    // Add click event listener for vessel popups - only if not already added
    // Note: MapLibre doesn't provide a way to check if event listener exists,
    // so we'll handle this differently by removing/adding in destroy()
    this.map.on('click', this.layerId, (e) => {
      if (e.features && e.features.length > 0) {
        const feature = e.features[0];
        const coordinates = (feature.geometry as any).coordinates.slice();
        const properties = feature.properties;
        
        // Ensure that if the map is zoomed out such that multiple
        // copies of the feature are visible, the popup appears
        // over the copy being pointed to.
        while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
          coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
        }
        
        // Create popup content with vessel information
        const popupContent = this.createVesselPopupContent(properties);
        
        new Popup()
          .setLngLat(coordinates)
          .setHTML(popupContent)
          .addTo(this.map!);
      }
    });
    
    // Change the cursor to a pointer when hovering over a vessel
    this.map.on('mouseenter', this.layerId, () => {
      this.map!.getCanvas().style.cursor = 'pointer';
    });
    
    // Change it back to default when leaving
    this.map.on('mouseleave', this.layerId, () => {
      this.map!.getCanvas().style.cursor = '';
    });
    
    // Add error handler for missing icons
    this.map.on('styleimagemissing', async (e) => {
      const missingImage = e.id;
      if (missingImage.startsWith('ship-icon-')) {
        const color = missingImage.replace('ship-icon-', '');
        console.log(`AIS Layer: Creating missing icon for color ${color}`);
        
        // Create the missing icon
        await this.ensureIconExists(color);
      }
    });
    
    // Start periodic updates
    this.beginUpdates();
  }
  
  async update(): Promise<void> {
    if (!this.map) return;
    
    try {
      // Fetch real vessel positions from the API
      console.log('AIS Layer: Fetching latest vessel positions from API');
      const apiUrl = this.getApiUrl();
      const response = await firstValueFrom(this.http.get<any[]>(`${apiUrl}/api/vessels?includeLatestPosition=true`));
      
      const source = this.map.getSource(this.layerId) as GeoJSONSource;
      
      // Convert API response to GeoJSON
      const features: GeoJSON.Feature[] = [];
      
      if (response && Array.isArray(response)) {
        console.log('AIS Layer: Received', response.length, 'vessels from API');
        for (const vessel of response) {
          // Check if vessel has latest position data
          if (!vessel.latest_position_coordinates) {
            console.warn('AIS Layer: Skipping vessel', vessel.id, '- no position data');
            continue;
          }
          
          // Extract coordinates from the vessel response
          const coordinates: [number, number] = vessel.latest_position_coordinates.coordinates;
          const vesselTypeColor = vessel.vessel_type?.color || '#808080';
          
          // Ensure icon exists for this color
          await this.ensureIconExists(vesselTypeColor);
          
          const positionUpdate: PositionUpdate = {
            vesselId: vessel.id,
            vesselName: vessel.name,
            vesselType: vessel.vessel_type?.name || 'Unknown',
            vesselTypeId: vessel.vessel_type?.id,
            vesselTypeColor: vesselTypeColor,
            lat: coordinates[1],
            lng: coordinates[0],
            heading: vessel.latest_position_heading ? Number(vessel.latest_position_heading) : null,
            speed: vessel.latest_position_speed ? Number(vessel.latest_position_speed) : null,
            status: 'Active',
            timestamp: vessel.latest_position_timestamp
          };
          
          // Debug logging for vessel type mapping
          if (vessel.name === 'asas' || vessel.name === 'sdsd') {
            console.log(`AIS Layer: Vessel '${vessel.name}' - Type: ${vessel.vessel_type?.name} (ID: ${vessel.vessel_type?.id}), Color: ${vesselTypeColor}`);
          }
          
          // Store in our local map
          this.vesselPositions.set(vessel.id, positionUpdate);
          
          // Update the observable
          this.vesselPositions$.next(Array.from(this.vesselPositions.values()));
          
          const heading = positionUpdate.heading || 0;
          console.log(`🧭 Vessel ${positionUpdate.vesselName}: heading = ${heading}°, color = ${vesselTypeColor}`);
          
          features.push({
            type: 'Feature',
            geometry: {
              type: 'Point',
              coordinates: coordinates
            },
            properties: {
              id: vessel.id,
              name: positionUpdate.vesselName,
              heading: heading,
              speed: positionUpdate.speed || 0,
              type: positionUpdate.vesselType,
              vesselTypeId: positionUpdate.vesselTypeId,
              vesselTypeColor: vesselTypeColor,
              status: 'Active',
              lastUpdate: positionUpdate.timestamp,
              isSelected: this.vesselFilter === vessel.id
            }
          });
        }
      }
      
      const geojsonData: GeoJSON.FeatureCollection = {
        type: 'FeatureCollection',
        features
      };
      
      source.setData(geojsonData);
      console.log('AIS Layer: Updated map with', features.length, 'vessels');
    } catch (error) {
      console.error('AIS Layer: Failed to fetch vessel positions', error);
      
      // Use empty data as fallback instead of mock data
      const source = this.map.getSource(this.layerId) as GeoJSONSource;
      source.setData({
        type: 'FeatureCollection',
        features: []
      });
    }
  }
  
  toggleVisibility(visible: boolean): void {
    if (!this.map) return;
    this.map.setLayoutProperty(this.layerId, 'visibility', visible ? 'visible' : 'none');
  }
  
  private createVesselPopupContent(properties: any): string {
    const lastUpdate = properties.lastUpdate ? new Date(properties.lastUpdate).toLocaleString() : 'Unknown';
    const speed = properties.speed ? `${Number(properties.speed).toFixed(1)} knots` : 'Unknown';
    const heading = properties.heading ? `${Math.round(Number(properties.heading))}°` : 'Unknown';
    const status = properties.status || 'Unknown';
    
    return `
      <div style="font-family: Arial, sans-serif; min-width: 200px;">
        <div style="background: #2c3e50; color: white; padding: 8px 12px; margin: -8px -12px 8px -12px; border-radius: 4px 4px 0 0;">
          <h3 style="margin: 0; font-size: 16px; font-weight: bold;">${properties.name || 'Unknown Vessel'}</h3>
          <div style="font-size: 12px; opacity: 0.9;">ID: ${properties.id || 'N/A'}</div>
        </div>
        
        <div style="margin-bottom: 8px;">
          <strong style="color: #34495e;">Type:</strong> ${properties.type || 'Unknown'}
        </div>
        
        <div style="margin-bottom: 8px;">
          <strong style="color: #34495e;">Speed:</strong> ${speed}
        </div>
        
        <div style="margin-bottom: 8px;">
          <strong style="color: #34495e;">Heading:</strong> ${heading}
        </div>
        
        <div style="margin-bottom: 8px;">
          <strong style="color: #34495e;">Status:</strong> 
          <span style="padding: 2px 6px; border-radius: 3px; background: ${status === 'Active' ? '#27ae60' : '#95a5a6'}; color: white; font-size: 11px;">
            ${status}
          </span>
        </div>
        
        <div style="font-size: 11px; color: #7f8c8d; border-top: 1px solid #ecf0f1; padding-top: 6px; margin-top: 8px;">
          <strong>Last Update:</strong> ${lastUpdate}
        </div>
      </div>
    `;
  }
  
  private beginUpdates(): void {
    // Initial update to load current positions
    this.update();
    
    // Remove interval-based updates since we'll use WebSocket for real-time updates
    // Keep a less frequent update as fallback to catch any missed updates
    this.updateInterval = setInterval(() => {
      this.update();
    }, 60000); // Update every 60 seconds as fallback
  }
  
  private initializeWebSocket(): void {
    console.log('🔧 Initializing WebSocket connection...');
    
    // Determine the WebSocket URL based on the current window location
    const wsUrl = this.getWebSocketUrl();
    console.log('🔧 WebSocket URL:', wsUrl);
    
    // Connect to the WebSocket server
    this.socket = io(wsUrl + '/tracking', {
      path: '/socket.io/',
      transports: ['polling', 'websocket'], // Try polling first, then WebSocket
      autoConnect: true,
      forceNew: true,
      timeout: 5000,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });
    
    console.log('🔧 WebSocket instance created with config:', {
      namespace: '/tracking', 
      transports: ['polling', 'websocket'],
      socketId: this.socket.id
    });
    
    this.socket.on('connect', () => {
      console.log('WebSocket: Connected to vessel tracking WebSocket');
      console.log('🔌 WebSocket connected to vessel tracking, ID:', this.socket?.id);
      // Subscribe to all vessel updates
      this.socket?.emit('subscribe-all');
    });
    
    this.socket.on('connect_error', (error: any) => {
      console.error('🔌 WebSocket connection error:', error);
      console.error('WebSocket: Connection failed', error);
    });
    
    this.socket.on('disconnect', (reason: string) => {
      console.warn('WebSocket: Disconnected from vessel tracking WebSocket');
      console.log('🔌 WebSocket disconnected from vessel tracking, reason:', reason);
    });
    
    this.socket.on('reconnect', (attemptNumber: number) => {
      console.log('🔌 WebSocket reconnected after', attemptNumber, 'attempts');
    });
    
    this.socket.on('reconnecting', (attemptNumber: number) => {
      console.log('🔌 WebSocket reconnecting, attempt:', attemptNumber);
    });
    
    // Handle single position update
    this.socket.on('position-update', (update: any) => {
      // Ensure proper data types - update now comes with flat lat/lng structure
      const typedUpdate: PositionUpdate = {
        vesselId: Number(update.vesselId),
        vesselName: update.vesselName,
        vesselType: update.vesselType,
        vesselTypeId: update.vesselTypeId,
        vesselTypeColor: update.vesselTypeColor || '#808080',
        lat: Number(update.lat),
        lng: Number(update.lng),
        heading: update.heading ? Number(update.heading) : null,
        speed: update.speed ? Number(update.speed) : null,
        status: update.status,
        timestamp: update.timestamp
      };
      this.handlePositionUpdate(typedUpdate);
    });
    
    // Handle batch position updates
    this.socket.on('positions-batch', (updates: any[]) => {
      console.log('WebSocket: Received batch of', updates.length, 'position updates');
      console.log('📦 WebSocket batch update:', `${updates.length} position updates`);
      updates.forEach(update => {
        // Ensure proper data types - updates now come with flat lat/lng structure
        const typedUpdate: PositionUpdate = {
          vesselId: Number(update.vesselId),
          vesselName: update.vesselName,
          vesselType: update.vesselType,
          vesselTypeId: update.vesselTypeId,
          vesselTypeColor: update.vesselTypeColor || '#808080',
          lat: Number(update.lat),
          lng: Number(update.lng),
          heading: update.heading ? Number(update.heading) : null,
          speed: update.speed ? Number(update.speed) : null,
          status: update.status,
          timestamp: update.timestamp
        };
        this.handlePositionUpdate(typedUpdate);
      });
    });
    
    this.socket.on('subscribed', (data: any) => {
      console.log('✅ WebSocket subscription confirmed:', data);
    });
    
    this.socket.on('error', (error: any) => {
      console.error('WebSocket: WebSocket connection error', error);
      console.error('❌ WebSocket error:', error);
    });
  }
  
  private initializeSyncWebSocket(): void {
    console.log('🔧 Initializing Sync WebSocket connection...');
    
    const wsUrl = this.getWebSocketUrl();
    
    // Connect to the sync namespace
    this.syncSocket = io(wsUrl + '/sync', {
      path: '/socket.io/',
      transports: ['polling', 'websocket'],
      autoConnect: true,
      forceNew: true,
      timeout: 5000,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });
    
    this.syncSocket.on('connect', () => {
      console.log('🔄 Connected to sync WebSocket namespace');
    });
    
    this.syncSocket.on('connect_error', (error: any) => {
      console.error('🔄 Sync WebSocket connection error:', error);
    });
    
    this.syncSocket.on('disconnect', (reason: string) => {
      console.warn('🔄 Disconnected from sync WebSocket:', reason);
    });
    
    // Listen for sync updates
    this.syncSocket.on('sync-update', (data: any) => {
      const receivedAt = new Date().toISOString();
      console.log('🔄 [SYNC] Received sync update on /sync namespace:', {
        receivedAt,
        serverTimestamp: data.timestamp,
        majorVersion: data.major_version,
        minorVersion: data.minor_version,
        latency: data.timestamp ? new Date().getTime() - new Date(data.timestamp).getTime() + 'ms' : 'unknown',
        fullPayload: data
      });
      
      console.log('🔄 [SYNC] Triggering vessel data refresh due to sync update');
      // Immediately refresh vessel types and positions
      this.update().catch(error => {
        console.error('🔄 [SYNC] Failed to update after sync notification:', error);
      });
    });
  }
  
  private async handlePositionUpdate(update: PositionUpdate): Promise<void> {
    // Ensure icon exists for this vessel's color
    if (update.vesselTypeColor) {
      await this.ensureIconExists(update.vesselTypeColor);
    }
    
    // Store the position update
    this.vesselPositions.set(update.vesselId, update);
    
    // Update the observable
    this.vesselPositions$.next(Array.from(this.vesselPositions.values()));
    
    // Log to both debug service and browser console for debugging
    const speed = update.speed ? Number(update.speed) : 0;
    const heading = update.heading ? Number(update.heading) : 0;
    const logMessage = `WebSocket Update: Vessel ${update.vesselName} (ID: ${update.vesselId}) - ` +
      `Lat: ${update.lat.toFixed(6)}, Lng: ${update.lng.toFixed(6)}, ` +
      `Speed: ${speed.toFixed(1)} knots, ` +
      `Heading: ${heading.toFixed(0)}°, ` +
      `Color: ${update.vesselTypeColor}`;
    
    console.log('Position Update:', logMessage);
    console.log('🚢', logMessage);  // Browser console with ship emoji for easy identification
    
    // Update the map display with filtering
    this.updateMapDisplay();
  }
  
  private updateMapDisplay(): void {
    if (!this.map) return;
    
    const source = this.map.getSource(this.layerId) as GeoJSONSource;
    if (source) {
      // Show all vessels, but mark the selected one
      const allPositions = Array.from(this.vesselPositions.values());
      
      console.log(`AIS Layer: Displaying ${allPositions.length} vessels (highlighted: ${this.vesselFilter || 'none'})`);
      
      // Convert all vessel positions to GeoJSON with highlight flag
      const features: GeoJSON.Feature[] = allPositions.map((pos: PositionUpdate) => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [pos.lng, pos.lat]
        },
        properties: {
          id: pos.vesselId,
          name: pos.vesselName,
          heading: pos.heading || 0,
          speed: pos.speed || 0,
          type: pos.vesselType,
          vesselTypeId: pos.vesselTypeId,
          vesselTypeColor: pos.vesselTypeColor || '#808080',
          status: pos.status || 'Active',
          lastUpdate: pos.timestamp,
          // Add a property to indicate if this vessel is selected
          isSelected: this.vesselFilter === pos.vesselId
        }
      } as GeoJSON.Feature));
      
      source.setData({
        type: 'FeatureCollection',
        features
      });
      
      // Update the layer paint properties to highlight selected vessel
      if (this.map.getLayer(this.layerId)) {
        // For symbol layers, we can't easily change the icon color
        // So we'll update the icon size to make selected vessels larger
        this.map.setLayoutProperty(this.layerId, 'icon-size', [
          'case',
          ['get', 'isSelected'],
          1.2,  // Larger size for selected vessel
          0.75  // Normal size for other vessels
        ]);
      }
    }
  }
  
  destroy(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
    
    if (this.socket) {
      this.socket.emit('unsubscribe-all');
      this.socket.disconnect();
      this.socket = null;
    }
    
    if (this.syncSocket) {
      this.syncSocket.disconnect();
      this.syncSocket = null;
    }
    
    if (this.map) {
      if (this.map.getLayer(this.layerId)) {
        this.map.removeLayer(this.layerId);
      }
      if (this.map.getSource(this.layerId)) {
        this.map.removeSource(this.layerId);
      }
    }
    
    this.vesselPositions.clear();
    this.vesselPositions$.next([]);
  }
  
  ngOnDestroy(): void {
    this.destroy();
    this.vesselPositions$.complete();
  }
  
  private getWebSocketUrl(): string {
    // Check if we're in a local development environment
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      // For local development, connect to the local API server
      return 'http://localhost:3000';
    }
    
    // For production/deployed environments, derive the WebSocket URL from the hostname
    const hostname = window.location.hostname;
    const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
    
    // Replace admin/frontend subdomain with api subdomain
    // Handle patterns like ghanawaters-dev-admin. and ghanawaters-dev.
    if (hostname.includes('ghanawaters-dev-admin.')) {
      return protocol + '//' + hostname.replace('ghanawaters-dev-admin.', 'ghanawaters-dev-api.');
    } else if (hostname.includes('ghanawaters-dev.')) {
      return protocol + '//' + hostname.replace('ghanawaters-dev.', 'ghanawaters-dev-api.');
    } else if (hostname.includes('ghanawaters-test-admin.')) {
      return protocol + '//' + hostname.replace('ghanawaters-test-admin.', 'ghanawaters-test-api.');
    } else if (hostname.includes('ghanawaters-test.')) {
      return protocol + '//' + hostname.replace('ghanawaters-test.', 'ghanawaters-test-api.');
    } else if (hostname.includes('ghanawaters-admin.')) {
      return protocol + '//' + hostname.replace('ghanawaters-admin.', 'ghanawaters-api.');
    } else if (hostname.includes('ghanawaters.')) {
      return protocol + '//' + hostname.replace('ghanawaters.', 'ghanawaters-api.');
    }
    
    // Fallback to current origin
    return window.location.origin;
  }
  
  private getApiUrl(): string {
    // For HTTP requests, we use the same logic as WebSocket URL
    // This ensures consistency between WebSocket and HTTP connections
    return this.getWebSocketUrl();
  }
}