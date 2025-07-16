import { ApiProperty } from '@nestjs/swagger';
import { ResourceSettingResponse, ResourceSettingsMapResponse, ResourceType } from '@ghanawaters/shared-models';

export class ResourceSettingResponseDto implements ResourceSettingResponse {
  @ApiProperty({ description: 'Unique identifier for the resource setting' })
  id: number;

  @ApiProperty({ 
    description: 'Resource type',
    enum: ['vessel', 'route', 'landing_site', 'vessel_type']
  })
  resource_type: ResourceType;

  @ApiProperty({ 
    description: 'ID of the resource this setting belongs to',
    example: 123
  })
  resource_id: number;

  @ApiProperty({ 
    description: 'Setting key',
    example: '1'
  })
  setting_key: string;

  @ApiProperty({ 
    description: 'Setting value',
    example: '+233 20 123 4567'
  })
  value: string;

  @ApiProperty({ 
    description: 'Timestamp when the setting was created',
    type: String
  })
  created_at: string;

  @ApiProperty({ 
    description: 'Timestamp when the setting was last updated',
    type: String
  })
  updated_at: string;
}

export class ResourceSettingsMapResponseDto implements ResourceSettingsMapResponse {
  @ApiProperty({ 
    description: 'Map of setting keys to values',
    example: {
      '1': '+233 20 123 4567',
      '2': 'owner@example.com'
    }
  })
  settings: Record<string, string>;
}