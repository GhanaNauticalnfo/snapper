import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Setting } from './setting.entity';
import { ALLOWED_SETTING_KEYS, SettingKey } from './dto/setting-input.dto';
import { UpdateSettingDto } from './dto/update-setting.dto';
import { SettingResponseDto } from './dto/setting-response.dto';
import { SETTING_KEYS, SETTING_DEFAULTS } from './constants/settings.constants';

@Injectable()
export class SettingService {
  constructor(
    @InjectRepository(Setting)
    private settingRepository: Repository<Setting>,
  ) {}

  async findAll(): Promise<SettingResponseDto[]> {
    const settings = await this.settingRepository.find({
      order: { key: 'ASC' }
    });
    return settings.map(setting => setting.toResponseDto());
  }

  async findOne(key: string): Promise<SettingResponseDto> {
    if (!ALLOWED_SETTING_KEYS.includes(key as SettingKey)) {
      throw new BadRequestException(`Invalid setting key: ${key}`);
    }

    const setting = await this.settingRepository.findOne({ where: { key } });
    if (!setting) {
      throw new NotFoundException(`Setting with key ${key} not found`);
    }
    return setting.toResponseDto();
  }

  async update(key: string, updateSettingDto: UpdateSettingDto): Promise<SettingResponseDto> {
    if (!ALLOWED_SETTING_KEYS.includes(key as SettingKey)) {
      throw new BadRequestException(`Invalid setting key: ${key}`);
    }

    const setting = await this.settingRepository.findOne({ where: { key } });
    if (!setting) {
      throw new NotFoundException(`Setting with key ${key} not found`);
    }

    setting.value = updateSettingDto.value;
    const updatedSetting = await this.settingRepository.save(setting);
    return updatedSetting.toResponseDto();
  }


  async getRouteColor(): Promise<string> {
    const setting = await this.settingRepository.findOne({ where: { key: SETTING_KEYS.ROUTE_COLOR } });
    return setting?.value || SETTING_DEFAULTS[SETTING_KEYS.ROUTE_COLOR]; // Default fallback
  }
}