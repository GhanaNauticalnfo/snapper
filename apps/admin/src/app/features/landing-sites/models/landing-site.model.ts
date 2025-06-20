import { GeoPoint } from '@snapper/shared-models';

export interface LandingSite {
  id?: number;
  name: string;
  description?: string;
  location: GeoPoint;
  enabled: boolean;
  created?: Date;
  last_updated?: Date;
}