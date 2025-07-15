import { VesselResponse, VesselInput } from '@ghanawaters/shared-models';

// Re-export from shared models for consistency
export type VesselResponseDto = VesselResponse;
export type CreateVesselDto = VesselInput;
export type UpdateVesselDto = Partial<VesselInput>;

// Simplified vessel model for form usage (admin-specific)
export interface Vessel {
  id?: number;
  name: string;
  vessel_type_id: number;
  created_at?: Date;
  updated_at?: Date;
}