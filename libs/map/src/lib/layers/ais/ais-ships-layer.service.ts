// libs/map/src/lib/layers/ais/ais-ships-layer.service.ts
import { Injectable, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Map as MapLibreMap, GeoJSONSource, Popup } from 'maplibre-gl';
import { BaseLayerService } from '../base-layer.service';
import { firstValueFrom } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { DebugLogService } from '../../services/debug-log.service';

interface PositionUpdate {
  vesselId: number;
  vesselName: string;
  vesselType: string;
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
  private vesselPositions = new Map<number, PositionUpdate>();
  
  // Vessel filtering configuration
  private vesselFilter: number | null = null;
  
  constructor(
    private http: HttpClient,
    private debugLog: DebugLogService
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
    this.debugLog.info('AIS Layer', 'Initializing AIS ships layer');
    
    // Initialize WebSocket connection
    this.initializeWebSocket();
    
    // Remove existing ship icon if it exists and add new one
    if (map.hasImage('ship-icon')) {
      map.removeImage('ship-icon');
    }
    
    // Create a simple ship icon using SVG data URL
    this.createShipIcon()
      .then(response => {
        if (this.map) {
          this.map.addImage('ship-icon', response.data);
          this.initializeLayers();
        }
      })
      .catch(error => {
        console.error('Failed to create ship icon:', error);
        // Use a circle as fallback
        this.initializeWithFallbackIcon();
      });
  }
  
  private createShipIcon(): Promise<{data: HTMLImageElement | ImageBitmap | ImageData | {width: number, height: number, data: Uint8Array | Uint8ClampedArray}}> {
    return new Promise((resolve, reject) => {
      // Create a directional ship icon using SVG (pointing up/north by default)
      const svgString = `
        <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <!-- Simple triangular arrow pointing up -->
          <path d="M12 3 L20 16 L12 13 L4 16 Z" 
                fill="#22c55e" 
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
  
  private initializeLayers(): void {
    if (!this.map) return;
    
    // Add source for ships
    this.map.addSource(this.layerId, {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] }
    });
    
    // Add layer for ships
    this.map.addLayer({
      id: this.layerId,
      type: 'symbol',
      source: this.layerId,
      layout: {
        'icon-image': 'ship-icon',
        'icon-rotate': ['get', 'heading'],
        'icon-size': 0.75,
        'icon-allow-overlap': true
      }
    });
    
    // Add click event listener for vessel popups
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
  
  async update(): Promise<void> {
    if (!this.map) return;
    
    try {
      // Fetch real vessel positions from the API
      this.debugLog.info('AIS Layer', 'Fetching latest vessel positions from API');
      const response = await firstValueFrom(this.http.get<any[]>('/api/vessels/telemetry/latest'));
      
      const source = this.map.getSource(this.layerId) as GeoJSONSource;
      
      // Convert API response to GeoJSON
      const features: GeoJSON.Feature[] = [];
      
      if (response && Array.isArray(response)) {
        this.debugLog.success('AIS Layer', `Received ${response.length} vessel positions from API`);
        for (const vesselTelemetry of response) {
          // Extract coordinates from the new coordinates field or fallback to position parsing
          let coordinates: [number, number] | null = null;
          
          if (vesselTelemetry.coordinates) {
            // Use the new coordinates field returned by the API
            coordinates = [vesselTelemetry.coordinates.longitude, vesselTelemetry.coordinates.latitude];
          } else if (vesselTelemetry.position) {
            // Fallback: Handle different possible formats of PostGIS data
            if (typeof vesselTelemetry.position === 'string') {
              // Parse WKT format: POINT(longitude latitude)
              const match = vesselTelemetry.position.match(/POINT\(([^ ]+) ([^ ]+)\)/);
              if (match) {
                coordinates = [parseFloat(match[1]), parseFloat(match[2])];
              }
            } else if (vesselTelemetry.position.coordinates) {
              coordinates = vesselTelemetry.position.coordinates;
            }
          }
          
          // If we couldn't extract coordinates, skip this vessel
          if (!coordinates) {
            this.debugLog.warn('AIS Layer', `Skipping vessel ${vesselTelemetry.vessel_id} - no valid coordinates found`);
            continue;
          }
          
          const vesselId = vesselTelemetry.vessel?.id || vesselTelemetry.vessel_id;
          const positionUpdate: PositionUpdate = {
            vesselId: vesselId,
            vesselName: vesselTelemetry.vessel?.name || `Vessel ${vesselTelemetry.vessel_id}`,
            vesselType: vesselTelemetry.vessel?.vessel_type || 'Unknown',
            lat: coordinates[1],
            lng: coordinates[0],
            heading: vesselTelemetry.heading_degrees ? Number(vesselTelemetry.heading_degrees) : null,
            speed: vesselTelemetry.speed_knots ? Number(vesselTelemetry.speed_knots) : null,
            status: vesselTelemetry.status,
            timestamp: vesselTelemetry.timestamp
          };
          
          // Store in our local map
          this.vesselPositions.set(vesselId, positionUpdate);
          
          const heading = positionUpdate.heading || 0;
          console.log(`🧭 Vessel ${positionUpdate.vesselName}: heading = ${heading}°`);
          
          features.push({
            type: 'Feature',
            geometry: {
              type: 'Point',
              coordinates: coordinates
            },
            properties: {
              id: vesselId,
              name: positionUpdate.vesselName,
              heading: heading,
              speed: positionUpdate.speed || 0,
              type: positionUpdate.vesselType,
              status: positionUpdate.status || 'Active',
              lastUpdate: positionUpdate.timestamp
            }
          });
        }
      }
      
      const geojsonData: GeoJSON.FeatureCollection = {
        type: 'FeatureCollection',
        features
      };
      
      source.setData(geojsonData);
      this.debugLog.info('AIS Layer', `Updated map with ${features.length} vessels`);
    } catch (error) {
      this.debugLog.error('AIS Layer', 'Failed to fetch vessel positions', error);
      
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
    const speed = properties.speed ? `${properties.speed} knots` : 'Unknown';
    const heading = properties.heading ? `${properties.heading}°` : 'Unknown';
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
    
    // Connect to the WebSocket server through Angular proxy
    this.socket = io('/tracking', {
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
      this.debugLog.success('WebSocket', 'Connected to vessel tracking WebSocket');
      console.log('🔌 WebSocket connected to vessel tracking, ID:', this.socket?.id);
      // Subscribe to all vessel updates
      this.socket?.emit('subscribe-all');
    });
    
    this.socket.on('connect_error', (error: any) => {
      console.error('🔌 WebSocket connection error:', error);
      this.debugLog.error('WebSocket', 'Connection failed', error);
    });
    
    this.socket.on('disconnect', (reason: string) => {
      this.debugLog.warn('WebSocket', 'Disconnected from vessel tracking WebSocket');
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
      this.debugLog.info('WebSocket', `Received batch of ${updates.length} position updates`);
      console.log('📦 WebSocket batch update:', `${updates.length} position updates`);
      updates.forEach(update => {
        // Ensure proper data types - updates now come with flat lat/lng structure
        const typedUpdate: PositionUpdate = {
          vesselId: Number(update.vesselId),
          vesselName: update.vesselName,
          vesselType: update.vesselType,
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
      this.debugLog.error('WebSocket', 'WebSocket connection error', error);
      console.error('❌ WebSocket error:', error);
    });
  }
  
  private handlePositionUpdate(update: PositionUpdate): void {
    // Store the position update
    this.vesselPositions.set(update.vesselId, update);
    
    // Log to both debug service and browser console for debugging
    const speed = update.speed ? Number(update.speed) : 0;
    const heading = update.heading ? Number(update.heading) : 0;
    const logMessage = `WebSocket Update: Vessel ${update.vesselName} (ID: ${update.vesselId}) - ` +
      `Lat: ${update.lat.toFixed(6)}, Lng: ${update.lng.toFixed(6)}, ` +
      `Speed: ${speed.toFixed(1)} knots, ` +
      `Heading: ${heading.toFixed(0)}°`;
    
    this.debugLog.info('Position Update', logMessage);
    console.log('🚢', logMessage);  // Browser console with ship emoji for easy identification
    
    // Update the map display with filtering
    this.updateMapDisplay();
  }
  
  private updateMapDisplay(): void {
    if (!this.map) return;
    
    const source = this.map.getSource(this.layerId) as GeoJSONSource;
    if (source) {
      // Filter vessel positions based on vesselFilter
      const filteredPositions = this.vesselFilter 
        ? Array.from(this.vesselPositions.values()).filter(pos => pos.vesselId === this.vesselFilter)
        : Array.from(this.vesselPositions.values());
      
      console.log(`AIS Layer: Displaying ${filteredPositions.length} vessels (filter: ${this.vesselFilter || 'none'})`);
      console.log('AIS Layer: Total positions available:', this.vesselPositions.size);
      console.log('AIS Layer: All vessel IDs:', Array.from(this.vesselPositions.keys()));
      if (this.vesselFilter) {
        console.log('AIS Layer: Looking for vessel ID:', this.vesselFilter);
        const matchingVessel = this.vesselPositions.get(this.vesselFilter);
        console.log('AIS Layer: Found matching vessel:', matchingVessel);
      }
      
      // Convert filtered vessel positions to GeoJSON
      const features: GeoJSON.Feature[] = filteredPositions.map((pos: PositionUpdate) => ({
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
          status: pos.status || 'Active',
          lastUpdate: pos.timestamp
        }
      } as GeoJSON.Feature));
      
      source.setData({
        type: 'FeatureCollection',
        features
      });
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
    
    if (this.map) {
      if (this.map.getLayer(this.layerId)) {
        this.map.removeLayer(this.layerId);
      }
      if (this.map.getSource(this.layerId)) {
        this.map.removeSource(this.layerId);
      }
    }
    
    this.vesselPositions.clear();
  }
  
  ngOnDestroy(): void {
    this.destroy();
  }
}