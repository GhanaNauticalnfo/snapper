import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsNumber, IsBoolean, MaxLength } from 'class-validator';

export class CreateVesselDto {
  @ApiProperty({ description: 'Name of the vessel', example: 'MV Ghana Star' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;


  @ApiProperty({ description: 'ID of the vessel type', example: 1 })
  @IsNumber()
  @IsNotEmpty()
  vessel_type_id: number;

  @ApiPropertyOptional({ description: 'Length of the vessel in meters', example: 25.5 })
  @IsNumber()
  @IsOptional()
  length_meters?: number;

  @ApiPropertyOptional({ description: 'Name of the vessel owner', example: 'Ghana Maritime Co. Ltd.' })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  owner_name?: string;

  @ApiPropertyOptional({ description: 'Contact information for the vessel owner', example: '+233 20 123 4567' })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  owner_contact?: string;

  @ApiPropertyOptional({ description: 'Home port of the vessel', example: 'Tema' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  home_port?: string;

}