import { GeoPoint } from './geo-point.model';

export interface LandingSite {
  id: number;
  name: string;
  description?: string;
  location: GeoPoint;
  status: 'active' | 'inactive' | 'maintenance';
  created_at: Date;
  updated_at: Date;
}

export interface LandingSiteInput {
  name: string;
  description?: string;
  location: GeoPoint;
  status?: 'active' | 'inactive' | 'maintenance';
}

export interface LandingSiteResponse {
  id: number;
  name: string;
  description?: string;
  location: GeoPoint;
  status: 'active' | 'inactive' | 'maintenance';
  created_at: string;
  updated_at: string;
  settings?: Record<string, string>;
}