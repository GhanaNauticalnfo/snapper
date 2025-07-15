import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MaxLength, MinLength, IsOptional, Matches } from 'class-validator';
import { Transform } from 'class-transformer';
import { VesselTypeInput } from '@ghanawaters/shared-models';

export class VesselTypeInputDto implements VesselTypeInput {
  @ApiProperty({ description: 'Name of the vessel type', example: 'Cargo', maxLength: 30 })
  @IsString()
  @IsNotEmpty({ message: 'Vessel type name cannot be empty' })
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @MinLength(1, { message: 'Vessel type name cannot be empty' })
  @MaxLength(30, { message: 'Vessel type name cannot exceed 30 characters' })
  name: string;

  @ApiProperty({ 
    description: 'Color for the vessel type in hex format', 
    example: '#3B82F6',
    required: false
  })
  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, { message: 'Color must be a valid hex color code (e.g., #3B82F6)' })
  color?: string;
}