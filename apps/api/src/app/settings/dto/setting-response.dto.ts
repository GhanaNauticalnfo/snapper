import { ApiProperty } from '@nestjs/swagger';
import { SettingResponse } from '@ghanawaters/shared-models';

export class SettingResponseDto implements SettingResponse {
  @ApiProperty({ description: 'Setting key' })
  key: string;

  @ApiProperty({ description: 'Setting value' })
  value: string;

  @ApiProperty({ description: 'Timestamp when setting was created', type: String })
  created: string;

  @ApiProperty({ description: 'Timestamp when setting was last updated', type: String })
  last_updated: string;
}