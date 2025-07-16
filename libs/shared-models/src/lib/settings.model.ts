/**
 * Base setting interface
 */
export interface Setting {
  key: string;
  value: string;
  created: Date;
  last_updated: Date;
}

/**
 * Input DTO for creating/updating settings
 */
export interface SettingInput {
  key: string;
  value: string;
}

/**
 * Response DTO for setting data from API
 */
export interface SettingResponse {
  key: string;
  value: string;
  created: string;
  last_updated: string;
}

/**
 * DTO for updating database settings
 */
export interface UpdateDatabaseSettings {
  retentionDays: number;
}