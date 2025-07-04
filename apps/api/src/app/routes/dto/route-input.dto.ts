import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsBoolean, IsArray, IsOptional, MinLength, ArrayMinSize, ValidateNested, IsNumber, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { Waypoint } from '@ghanawaters/shared-models';

export class WaypointDto implements Waypoint {
  @ApiPropertyOptional({ description: 'Unique identifier for the waypoint' })
  @IsOptional()
  @IsString()
  id?: string;

  @ApiProperty({ description: 'Latitude coordinate' })
  @IsNumber()
  lat: number;

  @ApiProperty({ description: 'Longitude coordinate' })
  @IsNumber()
  lng: number;

  @ApiPropertyOptional({ description: 'Waypoint name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ description: 'Order of the waypoint in the route' })
  @IsNumber()
  @IsInt()
  @Min(0)
  order: number;
}

export class RouteInputDto {
  @ApiProperty({ description: 'Name of the route' })
  @IsString()
  @MinLength(1)
  name: string;

  @ApiPropertyOptional({ description: 'Description of the route' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ 
    description: 'Waypoints defining the route', 
    type: [WaypointDto],
    minItems: 2 
  })
  @IsArray()
  @ArrayMinSize(2, { message: 'Route must have at least 2 waypoints' })
  @ValidateNested({ each: true })
  @Type(() => WaypointDto)
  waypoints: Waypoint[];

  @ApiProperty({ description: 'Whether the route is enabled', default: true })
  @IsBoolean()
  enabled: boolean;
}