export interface LandingSite {
  id: number;
  name: string;
  description: string | null;
  location: {
    type: 'Point';
    coordinates: [number, number]; // [lng, lat]
  };
  status: 'active' | 'inactive' | 'restricted';
  created_at: string;
  updated_at: string;
}

export interface CreateLandingSiteDto {
  name: string;
  description?: string;
  location: {
    type: 'Point';
    coordinates: [number, number]; // [lng, lat]
  };
}

export interface UpdateLandingSiteDto extends Partial<CreateLandingSiteDto> {}