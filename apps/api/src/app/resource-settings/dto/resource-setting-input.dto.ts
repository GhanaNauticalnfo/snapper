import { IsObject, IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { SingleResourceSettingInput } from '@ghanawaters/shared-models';

export class ResourceSettingInputDto {
  @ApiProperty({ 
    description: 'Object containing setting key-value pairs',
    example: {
      '1': '+233 20 123 4567',
      '2': 'owner@example.com'
    }
  })
  @IsObject()
  settings: Record<string, string>;
}

export class SingleResourceSettingInputDto implements SingleResourceSettingInput {
  @ApiProperty({ 
    description: 'Value for the setting',
    example: '+233 20 123 4567'
  })
  @IsString()
  @IsOptional()
  value: string;
}