import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsHexColor, IsBoolean, Min, Max } from 'class-validator';

export class CreateHazardDto {
  @ApiProperty({ description: 'Name of the hazard' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Description of the hazard' })
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

  @ApiPropertyOptional({ description: 'Radius of the hazard zone in meters' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  radius?: number;

  @ApiPropertyOptional({ description: 'Type of hazard', default: 'warning' })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional({ description: 'Hazard color in hex format', default: '#FFA500' })
  @IsOptional()
  @IsHexColor()
  color?: string;

  @ApiPropertyOptional({ description: 'Whether the hazard is enabled', default: true })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}

export class UpdateHazardDto extends CreateHazardDto {}