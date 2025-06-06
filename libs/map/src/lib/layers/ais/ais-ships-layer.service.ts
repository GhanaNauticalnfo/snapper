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
  
  constructor(
    private http: HttpClient,
    private debugLog: DebugLogService
  ) {
    super();
  }
  
  initialize(map: MapLibreMap): void {
    this.map = map;
    this.debugLog.info('AIS Layer', 'Initializing AIS ships layer');
    
    // Initialize WebSocket connection
    this.initializeWebSocket();
    
    // Add image for ship icon if not already added
    if (!map.hasImage('ship-icon')) {
      // Use the Promise-based loadImage API
      map.loadImage('/assets/sprites/ship.png')
        .then(response => {
          if (this.map) {
            this.map.addImage('ship-icon', response.data);
            this.initializeLayers();
          }
        })
        .catch(error => {
          console.error('Failed to load ship icon:', error);
          // Use a circle as fallback
          this.initializeWithFallbackIcon();
        });
    } else {
      this.initializeLayers();
    }
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
      const response = await firstValueFrom(this.http.get<any[]>('/api/tracking/latest'));
      
      const source = this.map.getSource(this.layerId) as GeoJSONSource;
      
      // Convert API response to GeoJSON
      const features: GeoJSON.Feature[] = [];
      
      if (response && Array.isArray(response)) {
        this.debugLog.success('AIS Layer', `Received ${response.length} vessel positions from API`);
        for (const trackingPoint of response) {
          // Extract coordinates from the new coordinates field or fallback to position parsing
          let coordinates: [number, number] | null = null;
          
          if (trackingPoint.coordinates) {
            // Use the new coordinates field returned by the API
            coordinates = [trackingPoint.coordinates.longitude, trackingPoint.coordinates.latitude];
          } else if (trackingPoint.position) {
            // Fallback: Handle different possible formats of PostGIS data
            if (typeof trackingPoint.position === 'string') {
              // Parse WKT format: POINT(longitude latitude)
              const match = trackingPoint.position.match(/POINT\(([^ ]+) ([^ ]+)\)/);
              if (match) {
                coordinates = [parseFloat(match[1]), parseFloat(match[2])];
              }
            } else if (trackingPoint.position.coordinates) {
              coordinates = trackingPoint.position.coordinates;
            }
          }
          
          // If we couldn't extract coordinates, skip this vessel
          if (!coordinates) {
            this.debugLog.warn('AIS Layer', `Skipping vessel ${trackingPoint.vessel_id} - no valid coordinates found`);
            continue;
          }
          
          const vesselId = trackingPoint.vessel?.id || trackingPoint.vessel_id;
          const positionUpdate: PositionUpdate = {
            vesselId: vesselId,
            vesselName: trackingPoint.vessel?.name || `Vessel ${trackingPoint.vessel_id}`,
            vesselType: trackingPoint.vessel?.vessel_type || 'Unknown',
            lat: coordinates[1],
            lng: coordinates[0],
            heading: trackingPoint.heading_degrees,
            speed: trackingPoint.speed_knots,
            status: trackingPoint.status,
            timestamp: trackingPoint.timestamp
          };
          
          // Store in our local map
          this.vesselPositions.set(vesselId, positionUpdate);
          
          features.push({
            type: 'Feature',
            geometry: {
              type: 'Point',
              coordinates: coordinates
            },
            properties: {
              id: vesselId,
              name: positionUpdate.vesselName,
              heading: positionUpdate.heading || 0,
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
    // Connect to the WebSocket server
    this.socket = io('/tracking', {
      path: '/socket.io/',
      transports: ['websocket', 'polling'],
    });
    
    this.socket.on('connect', () => {
      this.debugLog.success('WebSocket', 'Connected to vessel tracking WebSocket');
      // Subscribe to all vessel updates
      this.socket?.emit('subscribe-all');
    });
    
    this.socket.on('disconnect', () => {
      this.debugLog.warn('WebSocket', 'Disconnected from vessel tracking WebSocket');
    });
    
    // Handle single position update
    this.socket.on('position-update', (update: PositionUpdate) => {
      this.handlePositionUpdate(update);
    });
    
    // Handle batch position updates
    this.socket.on('positions-batch', (updates: PositionUpdate[]) => {
      this.debugLog.info('WebSocket', `Received batch of ${updates.length} position updates`);
      updates.forEach(update => this.handlePositionUpdate(update));
    });
    
    this.socket.on('error', (error: any) => {
      this.debugLog.error('WebSocket', 'WebSocket connection error', error);
    });
  }
  
  private handlePositionUpdate(update: PositionUpdate): void {
    // Store the position update
    this.vesselPositions.set(update.vesselId, update);
    
    this.debugLog.info('Position Update', 
      `Vessel ${update.vesselName} (ID: ${update.vesselId}) - ` +
      `Lat: ${update.lat.toFixed(6)}, Lng: ${update.lng.toFixed(6)}, ` +
      `Speed: ${update.speed?.toFixed(1) || 0} knots, ` +
      `Heading: ${update.heading?.toFixed(0) || 0}°`);
    
    // Update the map if it's available
    if (this.map) {
      const source = this.map.getSource(this.layerId) as GeoJSONSource;
      if (source) {
        // Convert all vessel positions to GeoJSON
        const features: GeoJSON.Feature[] = Array.from(this.vesselPositions.values()).map((pos: PositionUpdate) => ({
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