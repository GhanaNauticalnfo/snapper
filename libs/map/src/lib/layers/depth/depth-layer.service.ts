// libs/map/src/lib/layers/depth/depth-layer.service.ts
import { Injectable } from '@angular/core';
import { Map, SourceSpecification } from 'maplibre-gl'; // Added SourceSpecification
import { BaseLayerService } from '../base-layer.service';

// Define an interface for the group styles for better type safety
interface GroupStyle {
  color: string;
  description: string;
}

@Injectable({
  providedIn: 'root'
})
export class DepthLayerService extends BaseLayerService {
  // --- Constants from index2.html (adapt paths/URLs if needed) ---
  readonly layerId = 'volta-depths'; // Service identifier (used for source ID)
  private readonly voltaSourceId = 'volta-depths-source'; // Consistent source ID
  private readonly voltaTilesUrl = 'http://localhost:4000/volta_depth_tile_feature/{z}/{x}/{y}';
  private readonly voltaInternalLayerName = 'volta_depth_tile_feature'; // source-layer within tiles
  private readonly voltaGroupAttribute = 'groupCode'; // Attribute name for filtering

  // Group styles definition
  private readonly groupStyles: { [key: number]: GroupStyle } = {
    0: { color: '#8B4513', description: "0-1%" },    // Brown
    1: { color: '#ADD8E6', description: "1-25%" },   // Lightest Blue
    2: { color: '#87CEEB', description: "25-50%" },  // SkyBlue
    3: { color: '#4682B4', description: "50-75%" },  // SteelBlue
    4: { color: '#0000CD', description: "75-95%" },  // MediumBlue
    5: { color: '#00008B', description: "95-100%" }  // DarkBlue
  };

  // --- Service State ---
  private map: Map | null = null;
  private voltaLayerIds: string[] = []; // To keep track of layers added by this service
  private isVisible = true; // Track visibility state

  constructor() {
    super();
    // Generate the layer IDs based on groupStyles
    this.voltaLayerIds = Object.keys(this.groupStyles).map(code => `volta-depth-group-${parseInt(code, 10)}`);
  }

  initialize(map: Map): void {
    if (this.map) {
      console.warn('DepthLayerService already initialized.');
      return; // Avoid re-initialization
    }
    this.map = map;
    console.log('[DepthLayerService] Initializing...');

    // Ensure the source doesn't already exist (e.g., from a previous initialization)
    if (this.map.getSource(this.voltaSourceId)) {
        console.warn(`[DepthLayerService] Source '${this.voltaSourceId}' already exists. Removing before adding.`);
        this.removeSourceAndLayers(); // Clean up potentially orphaned layers first
    }

    // --- Add the Vector Tile Source ---
    try {
        const sourceSpec: SourceSpecification = {
            type: 'vector',
            tiles: [this.voltaTilesUrl],
            minzoom: 8,
            maxzoom: 18,
            // attribution: 'Your Data Source Attribution Here', // Optional: Add attribution
        };
        this.map.addSource(this.voltaSourceId, sourceSpec);
        console.log(`[DepthLayerService] Source '${this.voltaSourceId}' added.`);
    } catch (error) {
        console.error(`[DepthLayerService] Error adding source '${this.voltaSourceId}':`, error);
        this.map = null; // Prevent further actions if source fails
        return;
    }


    // --- Add Individual Layers for Each Depth Group ---
    // Draw deepest first (higher groupCode) so shallower layers are on top
    const groupCodes = Object.keys(this.groupStyles).map(Number).sort((a, b) => b - a);

    groupCodes.forEach(groupCode => {
      const layerId = `volta-depth-group-${groupCode}`; // The specific ID for this group's layer
      const style = this.groupStyles[groupCode];

      // Defensive check: ensure style exists for the code
      if (!style) {
          console.warn(`[DepthLayerService] No style defined for groupCode ${groupCode}. Skipping layer.`);
          return;
      }

      // Defensive check: ensure layer doesn't already exist
      if (this.map?.getLayer(layerId)) {
          console.warn(`[DepthLayerService] Layer '${layerId}' already exists. Skipping addLayer.`);
          return;
      }

      try {
        this.map?.addLayer({
          'id': layerId,
          'type': 'fill',
          'source': this.voltaSourceId, // Use the source added above
          'source-layer': this.voltaInternalLayerName, // Specify the layer within the vector tiles
          'filter': ['==', ['get', this.voltaGroupAttribute], groupCode], // Filter features by groupCode
          'paint': {
            'fill-color': style.color,
            'fill-opacity': 0.75,
            'fill-outline-color': 'rgba(255, 255, 255, 0.3)' // Optional: faint outline
          },
          'layout': {
            'visibility': this.isVisible ? 'visible' : 'none' // Set initial visibility
          }
        });
        console.log(`[DepthLayerService] Added layer '${layerId}' for group ${groupCode}`);
      } catch (error) {
        console.error(`[DepthLayerService] Error adding layer '${layerId}':`, error);
        // Consider how to handle partial layer addition failure
      }
    });

    console.log('[DepthLayerService] Initialization complete.');
  }

  // update() is not needed for static vector tiles unless you need to force refresh,
  // which is generally handled by MapLibre itself when tiles are needed.
  async update(): Promise<void> {
    // No operation needed for static vector tiles.
    // Implement if you have dynamic data aspects not covered by tile updates.
    // console.log('[DepthLayerService] Update requested (No-Op).');
    return Promise.resolve();
  }

  toggleVisibility(visible: boolean): void {
    if (!this.map) {
        console.warn('[DepthLayerService] Cannot toggle visibility: Map not initialized.');
        return;
    }
    this.isVisible = visible; // Update internal state
    const newVisibility = this.isVisible ? 'visible' : 'none';
    console.log(`[DepthLayerService] Setting visibility to: ${newVisibility}`);

    this.voltaLayerIds.forEach(layerId => {
      if (this.map?.getLayer(layerId)) {
        try {
            this.map.setLayoutProperty(layerId, 'visibility', newVisibility);
        } catch (error) {
            console.error(`[DepthLayerService] Error setting visibility for layer '${layerId}':`, error);
        }
      } else {
        // This might happen if initialization failed for some layers
        // console.warn(`[DepthLayerService] Layer '${layerId}' not found during visibility toggle.`);
      }
    });
  }

  // --- Helper for cleanup ---
  private removeSourceAndLayers(): void {
    if (!this.map) return;

    // Remove layers in reverse order of typical dependencies
    this.voltaLayerIds.forEach(layerId => {
        try {
            if (this.map?.getLayer(layerId)) {
                this.map.removeLayer(layerId);
                console.log(`[DepthLayerService] Removed layer '${layerId}'.`);
            }
        } catch(error) {
            console.error(`[DepthLayerService] Error removing layer '${layerId}':`, error);
        }
    });

    // Remove the source
    try {
        if (this.map?.getSource(this.voltaSourceId)) {
            this.map.removeSource(this.voltaSourceId);
            console.log(`[DepthLayerService] Removed source '${this.voltaSourceId}'.`);
        }
    } catch(error) {
        console.error(`[DepthLayerService] Error removing source '${this.voltaSourceId}':`, error);
    }
  }


  destroy(): void {
    console.log('[DepthLayerService] Destroying...');
    if (this.map) {
        this.removeSourceAndLayers();
    }
    this.map = null; // Clear the map reference
    this.isVisible = true; // Reset state if needed
    console.log('[DepthLayerService] Destroy complete.');
  }

  // --- Method to provide legend data to the component ---
  getLegendData(): { [key: number]: GroupStyle } {
    // Return a copy to prevent external modification
    return { ...this.groupStyles };
  }
}