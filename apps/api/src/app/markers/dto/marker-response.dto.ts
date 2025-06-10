import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LatLng } from '@snapper/shared-models';

export class MarkerResponseDto {
  @ApiProperty({ description: 'Unique identifier for the marker' })
  id: number;

  @ApiProperty({ description: 'Name of the marker' })
  name: string;

  @ApiPropertyOptional({ description: 'Description of the marker' })
  description?: string;

  @ApiProperty({ description: 'Geographic coordinates', example: { lat: 5.5555, lng: -0.2058 } })
  coordinates: LatLng;

  @ApiProperty({ description: 'Icon identifier', default: 'default' })
  icon: string;

  @ApiProperty({ description: 'Marker color in hex format', default: '#FF0000' })
  color: string;

  @ApiProperty({ description: 'Whether the marker is enabled', default: true })
  enabled: boolean;

  @ApiProperty({ description: 'Creation timestamp' })
  created: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  last_updated: Date;
}