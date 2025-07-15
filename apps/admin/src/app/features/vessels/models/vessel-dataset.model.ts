// features/vessel/models/vessel-dataset.model.ts
import { VesselTelemetryResponse } from '@ghanawaters/shared-models';

// Use shared telemetry interface (note: dates come as ISO strings from API)
export type VesselTelemetry = VesselTelemetryResponse;

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