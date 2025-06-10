import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LatLng } from '@snapper/shared-models';

export class HazardResponseDto {
  @ApiProperty({ description: 'Unique identifier for the hazard' })
  id: number;

  @ApiProperty({ description: 'Name of the hazard' })
  name: string;

  @ApiPropertyOptional({ description: 'Description of the hazard' })
  description?: string;

  @ApiProperty({ description: 'Geographic coordinates', example: { lat: 5.5555, lng: -0.2058 } })
  coordinates: LatLng;

  @ApiPropertyOptional({ description: 'Radius of the hazard zone in meters' })
  radius?: number;

  @ApiProperty({ description: 'Type of hazard', default: 'warning', example: 'warning' })
  type: string;

  @ApiProperty({ description: 'Hazard color in hex format', default: '#FFA500' })
  color: string;

  @ApiProperty({ description: 'Whether the hazard is enabled', default: true })
  enabled: boolean;

  @ApiProperty({ description: 'Creation timestamp' })
  created: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  last_updated: Date;
}