import { IsNumber, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateRetentionDto {
  @ApiProperty({ 
    description: 'Number of days to retain telemetry data',
    minimum: 1,
    maximum: 3650,
    example: 365
  })
  @IsNumber()
  @Min(1)
  @Max(3650)
  retentionDays: number;
}