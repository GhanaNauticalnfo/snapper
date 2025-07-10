import { IsNumber, IsOptional, IsString, IsDateString, ValidateNested, IsObject, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { GeoPoint } from '@ghanawaters/shared-models';

class GeoPointDto implements GeoPoint {
  @ApiProperty({ example: 'Point' })
  @IsString()
  type: 'Point' = 'Point';

  @ApiProperty({ 
    example: [-0.1225, 5.6037],
    description: '[longitude, latitude]' 
  })
  @IsNumber({}, { each: true })
  coordinates: [number, number];
}

export class VesselTelemetryInputDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  timestamp?: string;

  @ApiProperty({ 
    description: 'Position as GeoJSON Point',
    type: GeoPointDto 
  })
  @ValidateNested()
  @Type(() => GeoPointDto)
  @IsObject()
  position: GeoPoint;

  @ApiProperty({ required: false, minimum: 0, maximum: 100 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  speed_knots?: number;

  @ApiProperty({ required: false, minimum: 0, maximum: 360 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(360)
  heading_degrees?: number;

  @ApiProperty({ required: false, minimum: 0, maximum: 100 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  battery_level?: number;

  @ApiProperty({ required: false, minimum: 0, maximum: 100 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  signal_strength?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  status?: string;
}