import { IsNumber, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UpdateDatabaseSettings } from '@ghanawaters/shared-models';

export class UpdateRetentionDto implements UpdateDatabaseSettings {
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