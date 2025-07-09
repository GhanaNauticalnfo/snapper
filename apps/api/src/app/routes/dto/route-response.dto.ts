import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Waypoint } from '@ghanawaters/shared-models';

export class RouteResponseDto {
  @ApiProperty({ description: 'Unique identifier for the route' })
  id: number;

  @ApiProperty({ description: 'Name of the route' })
  name: string;

  @ApiPropertyOptional({ description: 'Notes about the route' })
  notes?: string;

  @ApiProperty({ description: 'Waypoints defining the route', type: [Object] })
  waypoints: Waypoint[];

  @ApiProperty({ description: 'Whether the route is enabled' })
  enabled: boolean;

  @ApiProperty({ description: 'Timestamp when the route was created', type: String })
  created: string;

  @ApiProperty({ description: 'Timestamp when the route was last updated', type: String })
  last_updated: string;

  @ApiPropertyOptional({ 
    description: 'Custom settings for this route', 
    example: { '1': 'value1', '2': 'value2' } 
  })
  settings?: Record<string, string>;
}