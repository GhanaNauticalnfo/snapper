import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsPositive, Min, Max } from 'class-validator';
import { DeviceInput } from '@ghanawaters/shared-models';

export class DeviceInputDto implements DeviceInput {
  @ApiPropertyOptional({ 
    description: 'ID of vessel to associate with device', 
    example: 1 
  })
  @IsNumber()
  @IsOptional()
  @IsPositive()
  vessel_id?: number;

  @ApiPropertyOptional({ 
    description: 'Number of days until device expires', 
    example: 30,
    default: 30,
    minimum: 1,
    maximum: 365
  })
  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(365)
  expires_in_days?: number;
}