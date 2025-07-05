export interface VesselResponseDto {
  id: number;
  name: string;
  vessel_type: {
    id: number;
    name: string;
  };
  vessel_type_id: number;
  created_at: string;
  updated_at: string;
  latest_position_timestamp?: string;
  latest_position_speed?: string;
  latest_position_heading?: string;
  latest_position_coordinates?: {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
  };
}

export interface CreateVesselDto {
  name: string;
  vessel_type_id: number;
}

export interface UpdateVesselDto {
  name?: string;
  vessel_type_id?: number;
}

// Simplified vessel model for form usage
export interface Vessel {
  id?: number;
  name: string;
  vessel_type_id: number;
  created_at?: Date;
  updated_at?: Date;
}