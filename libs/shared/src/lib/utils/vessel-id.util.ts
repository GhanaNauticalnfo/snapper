/**
 * Utility functions for vessel ID formatting
 */

/**
 * Formats a vessel ID number into the Ghana Maritime format: GH-XXXX
 * @param id The vessel entity ID number
 * @returns Formatted vessel ID string (e.g., "GH-0001", "GH-0123")
 */
export function formatVesselId(id: number): string {
  if (id == null || id < 0) {
    return 'GH-0000';
  }
  
  // Pad with zeros to ensure 4 digits
  const paddedId = id.toString().padStart(4, '0');
  return `GH-${paddedId}`;
}

/**
 * Parses a formatted vessel ID back to the numeric ID
 * @param formattedId The formatted vessel ID (e.g., "GH-0001")
 * @returns The numeric vessel ID, or null if invalid format
 */
export function parseVesselId(formattedId: string): number | null {
  if (!formattedId || typeof formattedId !== 'string') {
    return null;
  }
  
  const match = formattedId.match(/^GH-(\d+)$/);
  if (!match) {
    return null;
  }
  
  const numericId = parseInt(match[1], 10);
  return isNaN(numericId) ? null : numericId;
}