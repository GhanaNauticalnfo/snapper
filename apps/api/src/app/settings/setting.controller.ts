import { Controller, Get, Put, Body, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SettingService } from './setting.service';
import { UpdateSettingDto } from './dto/update-setting.dto';
import { SettingResponseDto } from './dto/setting-response.dto';

@ApiTags('settings')
@Controller('settings')
export class SettingController {
  constructor(private readonly settingService: SettingService) {}

  @Get()
  findAll(): Promise<SettingResponseDto[]> {
    return this.settingService.findAll();
  }

  @Get(':key')
  findOne(@Param('key') key: string): Promise<SettingResponseDto> {
    return this.settingService.findOne(key);
  }

  @Put(':key')
  update(
    @Param('key') key: string,
    @Body() updateSettingDto: UpdateSettingDto,
  ): Promise<SettingResponseDto> {
    return this.settingService.update(key, updateSettingDto);
  }
}