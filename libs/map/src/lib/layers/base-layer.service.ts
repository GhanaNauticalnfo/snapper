// libs/map/src/lib/layers/base-layer.service.ts
import { Map } from 'maplibre-gl';

export abstract class BaseLayerService {
  abstract readonly layerId: string;
  abstract initialize(map: Map): void;
  abstract update(): Promise<void>;
  abstract toggleVisibility(visible: boolean): void;
  abstract destroy(): void;
}