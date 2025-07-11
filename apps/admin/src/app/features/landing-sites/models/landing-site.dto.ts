import { GeoPoint } from '@ghanawaters/shared-models';

export interface CreateLandingSiteDto {
  name: string;
  description?: string;
  location: GeoPoint;
}

export interface UpdateLandingSiteDto {
  name?: string;
  description?: string;
  location?: GeoPoint;
}

export interface LandingSiteResponseDto {
  id: number;
  name: string;
  description?: string;
  location: GeoPoint;
  status: 'active' | 'inactive' | 'restricted';
  created_at: string;
  updated_at: string;
  settings?: Record<string, string>;
}