import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { GeoPoint, VesselTelemetryResponse } from '@ghanawaters/shared-models';

export class VesselTelemetryResponseDto implements VesselTelemetryResponse {
  @ApiProperty({ description: 'Unique identifier for the vessel telemetry record' })
  id: number;

  @ApiProperty({ description: 'Creation timestamp' })
  created: Date;

  @ApiProperty({ description: 'Timestamp when the position was recorded' })
  timestamp: Date;

  @ApiProperty({ description: 'Vessel ID' })
  vessel_id: number;

  @ApiProperty({ 
    description: 'Position as GeoJSON Point',
    example: { type: 'Point', coordinates: [-0.1225, 5.6037] }
  })
  position: GeoPoint;

  @ApiPropertyOptional({ description: 'Speed in knots' })
  speed_knots: number | null;

  @ApiPropertyOptional({ description: 'Heading in degrees' })
  heading_degrees: number | null;

  @ApiPropertyOptional({ description: 'Device identifier' })
  device_id: string | null;

  @ApiPropertyOptional({ description: 'Status' })
  status: string | null;
}