import { Injectable, inject } from '@angular/core';
import { Map as MapLibreMap } from 'maplibre-gl';
import { LayerManagerService } from '@ghanawaters/map';
import { VesselWithLocation } from '../components/vessel-search.component';

@Injectable({
  providedIn: 'root'
})
export class VesselSearchService {
  private layerManager = inject(LayerManagerService);
  private map: MapLibreMap | null = null;
  
  setMap(map: MapLibreMap) {
    this.map = map;
  }
  
  zoomToVessel(vessel: VesselWithLocation) {
    if (!this.map || !vessel.latitude || !vessel.longitude) {
      console.warn('Cannot zoom to vessel: map not ready or vessel location not available');
      return;
    }

    // Zoom to vessel location with smooth animation and consistent zoom level
    this.map.flyTo({
      center: [vessel.longitude, vessel.latitude],
      zoom: 14.0, // Use clean integer zoom for consistency
      speed: 1.5,
      curve: 1.2
    });

    // Try to highlight the vessel marker if possible
    this.highlightVessel(vessel);
  }
  
  private highlightVessel(vessel: VesselWithLocation) {
    if (!this.map) return;
    
    // Check if the AIS ships layer is active and has the vessel
    const aisLayer = this.map.getLayer('ais-ships');
    if (!aisLayer) return;
    
    // Query features at the vessel's location
    const features = this.map.querySourceFeatures('ais-ships', {
      filter: ['==', 'id', vessel.id]
    });
    
    if (features.length > 0) {
      // Create a temporary highlight effect
      this.createHighlightEffect(vessel.longitude!, vessel.latitude!);
    }
  }
  
  private createHighlightEffect(lng: number, lat: number) {
    if (!this.map) return;
    
    // Add a temporary pulsing circle to highlight the vessel
    const highlightId = 'vessel-highlight';
    
    // Remove existing highlight if any
    if (this.map.getLayer(highlightId)) {
      this.map.removeLayer(highlightId);
    }
    if (this.map.getSource(highlightId)) {
      this.map.removeSource(highlightId);
    }
    
    // Add highlight source and layer
    this.map.addSource(highlightId, {
      type: 'geojson',
      data: {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [lng, lat]
        },
        properties: {}
      }
    });
    
    this.map.addLayer({
      id: highlightId,
      type: 'circle',
      source: highlightId,
      paint: {
        'circle-radius': [
          'interpolate',
          ['linear'],
          ['zoom'],
          8, 20,
          16, 50
        ],
        'circle-color': '#3b82f6',
        'circle-opacity': 0.6,
        'circle-stroke-width': 3,
        'circle-stroke-color': '#1d4ed8',
        'circle-stroke-opacity': 0.8
      }
    });
    
    // Animate the highlight with a pulsing effect
    let opacity = 0.6;
    let increasing = false;
    let pulseCount = 0;
    
    const pulseInterval = setInterval(() => {
      if (increasing) {
        opacity += 0.05;
        if (opacity >= 0.8) {
          increasing = false;
          pulseCount++;
        }
      } else {
        opacity -= 0.05;
        if (opacity <= 0.2) {
          increasing = true;
        }
      }
      
      if (this.map && this.map.getLayer(highlightId)) {
        this.map.setPaintProperty(highlightId, 'circle-opacity', opacity);
      }
      
      // Stop after 3 pulses (about 3 seconds)
      if (pulseCount >= 3 && !increasing) {
        clearInterval(pulseInterval);
        
        // Fade out and remove
        const fadeInterval = setInterval(() => {
          opacity -= 0.1;
          if (this.map && this.map.getLayer(highlightId)) {
            this.map.setPaintProperty(highlightId, 'circle-opacity', opacity);
            this.map.setPaintProperty(highlightId, 'circle-stroke-opacity', opacity);
          }
          
          if (opacity <= 0) {
            clearInterval(fadeInterval);
            if (this.map) {
              if (this.map.getLayer(highlightId)) {
                this.map.removeLayer(highlightId);
              }
              if (this.map.getSource(highlightId)) {
                this.map.removeSource(highlightId);
              }
            }
          }
        }, 50);
      }
    }, 100);
  }
}