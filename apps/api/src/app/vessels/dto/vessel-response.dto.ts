import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { VesselTypeResponseDto } from '../type/dto/vessel-type-response.dto';
import { GeoPoint } from '@snapper/shared-models';

export class VesselResponseDto {
  @ApiProperty({ description: 'Unique identifier for the vessel', example: 1 })
  id: number;

  @ApiProperty({ description: 'Timestamp when the vessel was created', type: Date })
  created: Date;

  @ApiProperty({ description: 'Timestamp when the vessel was last updated', type: Date })
  last_updated: Date;

  @ApiProperty({ description: 'Name of the vessel', example: 'MV Ghana Star' })
  name: string;


  @ApiProperty({ description: 'Vessel type details', type: () => VesselTypeResponseDto })
  vessel_type: VesselTypeResponseDto;

  @ApiPropertyOptional({ description: 'Length of the vessel in meters', example: 25.5 })
  length_meters?: number;

  @ApiPropertyOptional({ description: 'Name of the vessel owner', example: 'Ghana Maritime Co. Ltd.' })
  owner_name?: string;

  @ApiPropertyOptional({ description: 'Contact information for the vessel owner', example: '+233 20 123 4567' })
  owner_contact?: string;

  @ApiPropertyOptional({ description: 'Home port of the vessel', example: 'Tema' })
  home_port?: string;

  @ApiPropertyOptional({ description: 'Latest position coordinates', example: { latitude: 5.5555, longitude: -0.2058 } })
  latest_position_coordinates?: GeoPoint;

  @ApiPropertyOptional({ description: 'Timestamp when latest position was recorded', type: Date })
  latest_position_timestamp?: Date;

  @ApiPropertyOptional({ description: 'Speed in knots at latest position', example: 12.5 })
  latest_position_speed?: number;

  @ApiPropertyOptional({ description: 'Heading in degrees at latest position', example: 180.0 })
  latest_position_heading?: number;

}