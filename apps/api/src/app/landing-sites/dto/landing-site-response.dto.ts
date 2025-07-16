import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { GeoPoint, LandingSiteResponse } from '@ghanawaters/shared-models';

export class LandingSiteResponseDto implements LandingSiteResponse {
  @ApiProperty()
  id: number;

  @ApiProperty()
  name: string;

  @ApiProperty({ nullable: true })
  description: string;

  @ApiProperty({
    description: 'Position as GeoJSON Point',
    example: {
      type: 'Point',
      coordinates: [-0.017, 5.619]
    }
  })
  location: GeoPoint;

  @ApiProperty({ enum: ['active', 'inactive', 'maintenance'] })
  status: 'active' | 'inactive' | 'maintenance';

  @ApiProperty()
  created_at: string;

  @ApiProperty()
  updated_at: string;

  @ApiPropertyOptional({ 
    description: 'Custom settings for this landing site', 
    example: { '1': 'value1', '2': 'value2' } 
  })
  settings?: Record<string, string>;
}