// libs/map/src/lib/core/layer-manager.service.ts
import { Injectable, signal, Injector, Type } from '@angular/core';
import { Map as MapLibre } from 'maplibre-gl';
import { BaseLayerService } from '../layers/base-layer.service';

@Injectable({
  providedIn: 'root'
})
export class LayerManagerService {
  private map: MapLibre | null = null;
  // Use JavaScript's Map with explicit typing
  private layerRegistry = new Map<string, Type<BaseLayerService>>();
  private activeLayers = new Map<string, BaseLayerService>();
  readonly activeLayerIds = signal<string[]>([]);
  
  constructor(private injector: Injector) {}
  
  // Register a layer type
  registerLayer(id: string, layerType: Type<BaseLayerService>): void {
    this.layerRegistry.set(id, layerType);
  }
  
  initializeMap(map: MapLibre): void {
    this.map = map;
  }
  
  getLayerStatus(layerId: string): boolean {
    return this.activeLayers.has(layerId);
  }
  
  getLayer(layerId: string): BaseLayerService | undefined {
    return this.activeLayers.get(layerId);
  }
  
  activateLayer(layerId: string): void {
    if (!this.map || this.activeLayers.has(layerId)) return;
    
    const layerType = this.layerRegistry.get(layerId);
    if (!layerType) {
      console.warn(`Layer type '${layerId}' not registered`);
      return;
    }
    
    // Create the layer service using the injector
    const layer = this.injector.get(layerType);
    layer.initialize(this.map);
    this.activeLayers.set(layerId, layer);
    this.updateActiveLayerIds();
  }
  
  deactivateLayer(layerId: string): void {
    const layer = this.activeLayers.get(layerId);
    if (layer) {
      layer.destroy();
      this.activeLayers.delete(layerId);
      this.updateActiveLayerIds();
    }
  }
  
  toggleLayerVisibility(layerId: string, visible: boolean): void {
    const layer = this.activeLayers.get(layerId);
    if (layer) {
      layer.toggleVisibility(visible);
    }
  }
  
  updateAllLayers(): void {
    for (const layer of this.activeLayers.values()) {
      layer.update();
    }
  }
  
  private updateActiveLayerIds(): void {
    this.activeLayerIds.set(Array.from(this.activeLayers.keys()));
  }
  
  destroy(): void {
    for (const layer of this.activeLayers.values()) {
      layer.destroy();
    }
    this.activeLayers.clear();
    this.updateActiveLayerIds();
  }
}