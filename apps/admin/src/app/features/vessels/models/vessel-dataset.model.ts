// features/vessel/models/vessel-dataset.model.ts
export interface VesselTelemetry {
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
  device_id: string | null;
  status: string | null;
}

export interface VesselDataset {
    id: number;
    name: string;
    type: string;
    vessel_type_id: number;
    last_seen: Date | null;
    last_position: {
      latitude: number;
      longitude: number;
    } | null;
    created: Date;
    last_updated: Date;
    vessel_telemetry?: VesselTelemetry[];
  }