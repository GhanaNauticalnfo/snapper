import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { VesselTypeResponse } from '@ghanawaters/shared-models';

export class VesselTypeResponseDto implements VesselTypeResponse {
  @ApiProperty({ description: 'Unique identifier for the vessel type', example: 1 })
  id: number;

  @ApiProperty({ description: 'Name of the vessel type', example: 'Cargo' })
  name: string;

  @ApiProperty({ description: 'Color for the vessel type in hex format', example: '#3B82F6' })
  color: string;

  @ApiProperty({ description: 'Timestamp when the vessel type was created', example: '2024-01-01T00:00:00.000Z' })
  created_at: string;

  @ApiProperty({ description: 'Timestamp when the vessel type was last updated', example: '2024-01-01T00:00:00.000Z' })
  updated_at: string;

  @ApiProperty({ description: 'Number of vessels using this type', example: 5 })
  vessel_count: number;

  @ApiPropertyOptional({ 
    description: 'Custom settings for this vessel type', 
    example: { '1': 'value1', '2': 'value2' } 
  })
  settings?: Record<string, string>;
}