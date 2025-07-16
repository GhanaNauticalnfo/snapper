import { ApiProperty } from '@nestjs/swagger';
import { SettingTypeResponse, ResourceType } from '@ghanawaters/shared-models';

export class SettingTypeResponseDto implements SettingTypeResponse {
  @ApiProperty({ description: 'Unique identifier for the setting type' })
  id: number;

  @ApiProperty({ 
    description: 'Resource type this setting applies to',
    enum: ['vessel', 'route', 'landing_site', 'vessel_type']
  })
  resource_type: ResourceType;

  @ApiProperty({ 
    description: 'Unique key for the setting (1, 2, 3, etc.)',
    example: '1'
  })
  setting_key: string;

  @ApiProperty({ 
    description: 'User-friendly display name',
    example: 'Contact Number'
  })
  display_name: string;

  @ApiProperty({ 
    description: 'Data type of the setting value',
    enum: ['string', 'number', 'boolean']
  })
  data_type: string;

  @ApiProperty({ 
    description: 'Whether this setting is required'
  })
  is_required: boolean;

  @ApiProperty({ 
    description: 'Timestamp when the setting type was created',
    type: String
  })
  created_at: string;

  @ApiProperty({ 
    description: 'Timestamp when the setting type was last updated',
    type: String
  })
  updated_at: string;
}