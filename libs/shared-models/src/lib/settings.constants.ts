/**
 * Constants for application settings keys
 * 
 * This ensures type safety and consistency across frontend and backend
 * when working with settings.
 */
export const SETTING_KEYS = {
  ROUTE_COLOR: 'route.color'
} as const;

/**
 * Type for valid setting keys
 */
export type SettingKey = typeof SETTING_KEYS[keyof typeof SETTING_KEYS];

/**
 * Default values for settings
 */
export const SETTING_DEFAULTS = {
  [SETTING_KEYS.ROUTE_COLOR]: '#FF0000'
} as const;