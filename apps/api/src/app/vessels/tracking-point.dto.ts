// tracking-point.dto.ts
export class CreateTrackingPointDto {
    vessel_id: number;
    timestamp?: Date;
    latitude: number;
    longitude: number;
    speed_knots?: number;
    heading_degrees?: number;
    battery_level?: number;
    signal_strength?: number;
    device_id?: string;
    status?: string;
    // Additional fields from Android app
    speed?: number;
    course?: number;
    altitude?: number;
    accuracy?: number;
    provider?: string;
  }