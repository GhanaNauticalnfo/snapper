import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsIn } from 'class-validator';
import { SettingInput } from '@ghanawaters/shared-models';
import { ALLOWED_SETTING_KEYS, SettingKey } from '../constants/settings.constants';

export { ALLOWED_SETTING_KEYS, SettingKey };

export class SettingInputDto implements SettingInput {
  @ApiProperty({ description: 'Setting key', enum: ALLOWED_SETTING_KEYS })
  @IsString()
  @IsNotEmpty()
  @IsIn(ALLOWED_SETTING_KEYS)
  key: SettingKey;

  @ApiProperty({ description: 'Setting value' })
  @IsString()
  @IsNotEmpty()
  value: string;
}