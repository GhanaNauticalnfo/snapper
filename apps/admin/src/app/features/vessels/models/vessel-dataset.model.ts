// features/vessel/models/vessel-dataset.model.ts
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
  }