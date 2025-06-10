/**
 * Vessel type color interface for use across the application
 */
export interface VesselTypeColor {
  id: number;
  name: string;
  color: string;
}

/**
 * Default vessel type colors
 */
export const DEFAULT_VESSEL_TYPE_COLORS: Record<string, string> = {
  'Unspecified': '#6B7280',
  'Canoe': '#3B82F6',
  'Fishing Boat': '#10B981',
  'Cargo Ship': '#F59E0B',
  'Passenger Vessel': '#8B5CF6',
  'Military': '#EF4444',
  'Research': '#06B6D4',
  'Yacht': '#EC4899'
};

/**
 * Get a default color for a vessel type name
 */
export function getDefaultVesselTypeColor(typeName: string): string {
  return DEFAULT_VESSEL_TYPE_COLORS[typeName] || '#3B82F6';
}