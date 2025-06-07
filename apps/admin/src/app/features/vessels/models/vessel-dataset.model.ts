// features/vessel/models/vessel-dataset.model.ts
export interface TrackingPoint {
  id: number;
  created: string;
  timestamp: string;
  vessel_id: number;
  position: {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
  };
  speed_knots: string;
  heading_degrees: string;
  battery_level: string | null;
  signal_strength: string | null;
  device_id: string | null;
  status: string | null;
}

export interface VesselDataset {
    id: number;
    name: string;
    type: 'Canoe' | 'Vessel';
    last_seen: Date;
    last_position: {
      latitude: number;
      longitude: number;
    };
    created: Date;
    last_updated: Date;
    enabled: boolean;
    tracking_points?: TrackingPoint[];
  }