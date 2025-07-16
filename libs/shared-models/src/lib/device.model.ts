/**
 * Device state enumeration
 */
export enum DeviceState {
  PENDING = 'pending',
  ACTIVE = 'active',
  RETIRED = 'retired'
}

/**
 * Base device interface
 */
export interface Device {
  device_id: string;
  device_token: string;
  activation_token: string;
  auth_token?: string;
  state: DeviceState;
  activated_at?: Date;
  expires_at?: Date;
  vessel_id?: number;
  created_at: Date;
  updated_at: Date;
}

/**
 * Vessel info for device response
 */
export interface DeviceVesselInfo {
  id: number;
  name: string;
}

/**
 * Input DTO for creating devices
 */
export interface DeviceInput {
  vessel_id?: number;
  expires_in_days?: number;
}

/**
 * Response DTO for device data from API
 */
export interface DeviceResponse {
  device_id: string;
  device_token: string;
  activation_token: string;
  auth_token?: string;
  state: DeviceState;
  activated_at?: string;
  expires_at?: string;
  vessel?: DeviceVesselInfo;
  created_at: string;
  updated_at: string;
  activation_url?: string;
}

/**
 * Device activation DTO
 */
export interface DeviceActivation {
  activation_token: string;
}