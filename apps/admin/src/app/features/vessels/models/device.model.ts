export interface Device {
  device_id: string;
  device_token: string;
  activation_token: string;
  auth_token: string | null;
  is_activated: boolean;
  state: 'pending' | 'active' | 'retired';
  activated_at: Date | null;
  expires_at: Date;
  vessel_id: number;
  created_at: Date;
  updated_at: Date;
  activation_url?: string;
}