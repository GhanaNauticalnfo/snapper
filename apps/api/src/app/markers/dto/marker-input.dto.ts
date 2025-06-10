import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsHexColor, IsBoolean, Min, Max } from 'class-validator';

export class CreateMarkerDto {
  @ApiProperty({ description: 'Name of the marker' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Description of the marker' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Latitude coordinate', example: 5.5555 })
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat: number;

  @ApiProperty({ description: 'Longitude coordinate', example: -0.2058 })
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng: number;

  @ApiPropertyOptional({ description: 'Icon identifier', default: 'default' })
  @IsOptional()
  @IsString()
  icon?: string;

  @ApiPropertyOptional({ description: 'Marker color in hex format', default: '#FF0000' })
  @IsOptional()
  @IsHexColor()
  color?: string;

  @ApiPropertyOptional({ description: 'Whether the marker is enabled', default: true })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}

export class UpdateMarkerDto extends CreateMarkerDto {}