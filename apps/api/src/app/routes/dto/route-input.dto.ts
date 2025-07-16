import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsBoolean, IsArray, IsOptional, MinLength, ArrayMinSize, ValidateNested, IsNumber, IsInt, Min, IsLatitude, IsLongitude, ValidationOptions, registerDecorator, ValidationArguments } from 'class-validator';
import { Type } from 'class-transformer';
import { Waypoint, RouteInput } from '@ghanawaters/shared-models';

// Custom validator to ensure waypoint orders are unique
export function HasUniqueWaypointOrders(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'hasUniqueWaypointOrders',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(waypoints: any[], args: ValidationArguments) {
          if (!Array.isArray(waypoints)) return true;
          const orders = waypoints.map(w => w.order);
          return new Set(orders).size === orders.length;
        },
        defaultMessage(args: ValidationArguments) {
          return 'Waypoint orders must be unique within the route';
        }
      }
    });
  };
}

// Custom validator to ensure waypoints are not all at the same location
export function HasDistinctWaypoints(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'hasDistinctWaypoints',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(waypoints: any[], args: ValidationArguments) {
          if (!Array.isArray(waypoints) || waypoints.length < 2) return true;
          
          const firstLat = waypoints[0].lat;
          const firstLng = waypoints[0].lng;
          
          return !waypoints.every(w => w.lat === firstLat && w.lng === firstLng);
        },
        defaultMessage(args: ValidationArguments) {
          return 'Route waypoints cannot all be at the same location';
        }
      }
    });
  };
}

export class WaypointDto implements Waypoint {
  @ApiPropertyOptional({ description: 'Unique identifier for the waypoint' })
  @IsOptional()
  @IsString()
  id?: string;

  @ApiProperty({ description: 'Latitude coordinate', minimum: -90, maximum: 90 })
  @IsLatitude({ message: 'Latitude must be between -90 and 90 degrees' })
  lat: number;

  @ApiProperty({ description: 'Longitude coordinate', minimum: -180, maximum: 180 })
  @IsLongitude({ message: 'Longitude must be between -180 and 180 degrees' })
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

export class RouteInputDto implements RouteInput {
  @ApiProperty({ description: 'Name of the route' })
  @IsString()
  @MinLength(1)
  name: string;

  @ApiPropertyOptional({ description: 'Notes about the route' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ 
    description: 'Waypoints defining the route', 
    type: [WaypointDto],
    minItems: 2 
  })
  @IsArray()
  @ArrayMinSize(2, { message: 'Route must have at least 2 waypoints' })
  @ValidateNested({ each: true })
  @Type(() => WaypointDto)
  @HasUniqueWaypointOrders()
  @HasDistinctWaypoints()
  waypoints: Waypoint[];

  @ApiProperty({ description: 'Whether the route is enabled', default: true })
  @IsBoolean()
  enabled: boolean;
}