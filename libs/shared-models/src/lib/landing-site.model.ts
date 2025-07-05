export interface LandingSite {
  id: number;
  name: string;
  description?: string;
  location: {
    lat: number;
    lon: number;
  };
  status: 'active' | 'inactive' | 'maintenance';
  created_at: Date;
  updated_at: Date;
}

export interface LandingSiteInput {
  name: string;
  description?: string;
  location: {
    lat: number;
    lon: number;
  };
  status: 'active' | 'inactive' | 'maintenance';
}

export interface LandingSiteResponse {
  id: number;
  name: string;
  description?: string;
  location: {
    lat: number;
    lon: number;
  };
  status: 'active' | 'inactive' | 'maintenance';
  created_at: string;
  updated_at: string;
}