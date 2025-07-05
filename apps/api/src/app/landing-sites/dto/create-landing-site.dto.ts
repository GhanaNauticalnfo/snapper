import { IsString, IsNotEmpty, IsOptional, IsBoolean, ValidateNested, IsObject, IsNumber, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { GeoPoint } from '@ghanawaters/shared-models';

class GeoPointDto implements GeoPoint {
  @ApiProperty({ example: 'Point' })
  @IsString()
  type: 'Point' = 'Point';

  @ApiProperty({ 
    example: [-0.017, 5.619],
    description: '[longitude, latitude]' 
  })
  @IsNumber({}, { each: true })
  coordinates: [number, number];
}

export class CreateLandingSiteDto {
  @ApiProperty({ example: 'Tema Harbor Landing Site' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiProperty({ 
    example: 'Main landing site for fishing vessels at Tema harbor',
    required: false 
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty({ 
    description: 'Position as GeoJSON Point',
    type: GeoPointDto,
    example: {
      type: 'Point',
      coordinates: [-0.017, 5.619]
    }
  })
  @ValidateNested()
  @Type(() => GeoPointDto)
  @IsObject()
  location: GeoPoint;

  @ApiProperty({ 
    enum: ['active', 'inactive', 'maintenance'],
    default: 'active',
    required: false 
  })
  @IsOptional()
  @IsString()
  status?: string;
}