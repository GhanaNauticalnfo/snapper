/**
 * Resource types that can have settings
 */
export type ResourceType = 'vessel' | 'route' | 'landing_site' | 'vessel_type';

/**
 * Base resource setting interface
 */
export interface ResourceSetting {
  id: number;
  resource_type: ResourceType;
  resource_id: number;
  setting_key: string;
  value: string;
  created_at: Date;
  updated_at: Date;
}

/**
 * Input DTO for creating/updating resource settings
 */
export interface ResourceSettingInput {
  resource_type: ResourceType;
  resource_id: number;
  setting_key: string;
  value: string;
}

/**
 * Response DTO for resource setting data from API
 */
export interface ResourceSettingResponse {
  id: number;
  resource_type: ResourceType;
  resource_id: number;
  setting_key: string;
  value: string;
  created_at: string;
  updated_at: string;
}

/**
 * Response DTO for resource settings map
 */
export interface ResourceSettingsMapResponse {
  settings: Record<string, string>;
}

/**
 * Setting type definition
 */
export interface SettingType {
  id: number;
  resource_type: ResourceType;
  setting_key: string;
  display_name: string;
  data_type: string;
  is_required: boolean;
  created_at: Date;
  updated_at: Date;
}

/**
 * Input DTO for creating/updating setting types
 */
export interface SettingTypeInput {
  resource_type: ResourceType;
  setting_key: string;
  display_name: string;
  data_type?: string;
  is_required?: boolean;
}

/**
 * Response DTO for setting type data from API
 */
export interface SettingTypeResponse {
  id: number;
  resource_type: ResourceType;
  setting_key: string;
  display_name: string;
  data_type: string;
  is_required: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Single resource setting input
 */
export interface SingleResourceSettingInput {
  value: string;
}