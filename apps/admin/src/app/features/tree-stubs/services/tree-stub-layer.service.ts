import { Injectable } from '@angular/core';
import { Map } from 'maplibre-gl';
import { BaseLayerService } from '@ghanawaters/map';
import { TreeStubResponseDto } from '@ghanawaters/shared-models';

@Injectable({
  providedIn: 'root'
})
export class TreeStubLayerService extends BaseLayerService {
  readonly layerId = 'tree-stubs';
  private map: Map | null = null;
  private treeStubs: TreeStubResponseDto[] = [];

  initialize(map: Map): void {
    this.map = map;
    this.addTreeStubSources();
    this.addTreeStubLayers();
    this.loadTreeIcon();
  }

  private addTreeStubSources(): void {
    if (!this.map) return;

    // Add source for tree stubs
    this.map.addSource('tree-stubs', {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: []
      }
    });
  }

  private addTreeStubLayers(): void {
    if (!this.map) return;

    // Add layer for tree stub points
    this.map.addLayer({
      id: 'tree-stubs-points',
      type: 'symbol',
      source: 'tree-stubs',
      filter: ['==', ['geometry-type'], 'Point'],
      layout: {
        'icon-image': 'tree-icon',
        'icon-size': 0.8,
        'icon-allow-overlap': true
      }
    });

    // Add layer for tree stub polygons
    this.map.addLayer({
      id: 'tree-stubs-polygons-fill',
      type: 'fill',
      source: 'tree-stubs',
      filter: ['==', ['geometry-type'], 'Polygon'],
      paint: {
        'fill-color': '#ff0000',
        'fill-opacity': 0.3
      }
    });

    this.map.addLayer({
      id: 'tree-stubs-polygons-outline',
      type: 'line',
      source: 'tree-stubs',
      filter: ['==', ['geometry-type'], 'Polygon'],
      paint: {
        'line-color': '#ff0000',
        'line-width': 2
      }
    });
  }

  private loadTreeIcon(): void {
    if (!this.map) return;

    // Create a simple brown circle icon for tree stubs
    const size = 20;
    const data = new Uint8Array(size * size * 4);

    // Create a simple brown circle
    for (let x = 0; x < size; x++) {
      for (let y = 0; y < size; y++) {
        const offset = (y * size + x) * 4;
        const distance = Math.sqrt((x - size/2) ** 2 + (y - size/2) ** 2);
        if (distance < size/2) {
          data[offset] = 139;     // R - brown color for tree
          data[offset + 1] = 69;  // G
          data[offset + 2] = 19;  // B
          data[offset + 3] = 255; // A
        } else {
          data[offset + 3] = 0;   // Transparent
        }
      }
    }

    if (this.map && !this.map.hasImage('tree-icon')) {
      this.map.addImage('tree-icon', {
        width: size,
        height: size,
        data: data
      });
    }
  }

  async update(): Promise<void> {
    this.updateTreeStubsOnMap();
  }

  setTreeStubs(treeStubs: TreeStubResponseDto[]): void {
    this.treeStubs = treeStubs;
    this.updateTreeStubsOnMap();
  }

  private updateTreeStubsOnMap(): void {
    if (!this.map) return;

    const features = this.treeStubs.map(stub => {
      let geometry;
      try {
        // Parse WKT or assume it's already GeoJSON-like
        if (typeof stub.geometry === 'string') {
          if (stub.geometry.startsWith('POINT')) {
            const coords = stub.geometry.match(/POINT\(([^)]+)\)/)?.[1].split(' ');
            if (coords && coords.length === 2) {
              geometry = {
                type: 'Point',
                coordinates: [parseFloat(coords[0]), parseFloat(coords[1])]
              };
            }
          } else if (stub.geometry.startsWith('POLYGON')) {
            const coordsMatch = stub.geometry.match(/POLYGON\(\(([^)]+)\)\)/)?.[1];
            if (coordsMatch) {
              const coordPairs = coordsMatch.split(', ').map(pair => {
                const [lng, lat] = pair.split(' ');
                return [parseFloat(lng), parseFloat(lat)];
              });
              geometry = {
                type: 'Polygon',
                coordinates: [coordPairs]
              };
            }
          }
        } else {
          // Already parsed geometry object
          geometry = stub.geometry;
        }
      } catch (error) {
        console.warn('Failed to parse geometry:', stub.geometry);
        return null;
      }

      if (!geometry) return null;

      return {
        type: 'Feature',
        id: stub.id,
        geometry,
        properties: {
          id: stub.id,
          group_id: stub.group_id
        }
      };
    }).filter(Boolean);

    const source = this.map.getSource('tree-stubs') as any;
    if (source) {
      source.setData({
        type: 'FeatureCollection',
        features: features as any[]
      });
    }
  }

  toggleVisibility(visible: boolean): void {
    if (!this.map) return;

    const visibility = visible ? 'visible' : 'none';
    
    if (this.map.getLayer('tree-stubs-points')) {
      this.map.setLayoutProperty('tree-stubs-points', 'visibility', visibility);
    }
    if (this.map.getLayer('tree-stubs-polygons-fill')) {
      this.map.setLayoutProperty('tree-stubs-polygons-fill', 'visibility', visibility);
    }
    if (this.map.getLayer('tree-stubs-polygons-outline')) {
      this.map.setLayoutProperty('tree-stubs-polygons-outline', 'visibility', visibility);
    }
  }

  destroy(): void {
    if (!this.map) return;

    // Remove layers
    if (this.map.getLayer('tree-stubs-points')) {
      this.map.removeLayer('tree-stubs-points');
    }
    if (this.map.getLayer('tree-stubs-polygons-fill')) {
      this.map.removeLayer('tree-stubs-polygons-fill');
    }
    if (this.map.getLayer('tree-stubs-polygons-outline')) {
      this.map.removeLayer('tree-stubs-polygons-outline');
    }

    // Remove source
    if (this.map.getSource('tree-stubs')) {
      this.map.removeSource('tree-stubs');
    }

    // Remove icon
    if (this.map.hasImage('tree-icon')) {
      this.map.removeImage('tree-icon');
    }

    this.map = null;
  }
}