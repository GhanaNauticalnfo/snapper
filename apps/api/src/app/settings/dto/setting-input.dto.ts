import { IsString, IsNotEmpty, IsIn } from 'class-validator';
import { ALLOWED_SETTING_KEYS, SettingKey } from '../constants/settings.constants';

export { ALLOWED_SETTING_KEYS, SettingKey };

export class SettingInputDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(ALLOWED_SETTING_KEYS)
  key: SettingKey;

  @IsString()
  @IsNotEmpty()
  value: string;
}