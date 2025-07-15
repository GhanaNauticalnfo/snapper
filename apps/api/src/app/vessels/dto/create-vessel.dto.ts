import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsNumber, MaxLength } from 'class-validator';
import { VesselInput } from '@ghanawaters/shared-models';

export class CreateVesselDto implements VesselInput {
  @ApiProperty({ description: 'Name of the vessel', example: 'MV Ghana Star' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiProperty({ description: 'ID of the vessel type', example: 1 })
  @IsNumber()
  @IsNotEmpty()
  vessel_type_id: number;
}