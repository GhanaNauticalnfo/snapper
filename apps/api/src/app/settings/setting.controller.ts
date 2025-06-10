import { Controller, Get, Post, Put, Delete, Body, Param } from '@nestjs/common';
import { SettingService } from './setting.service';
import { SettingInputDto } from './dto/setting-input.dto';
import { UpdateSettingDto } from './dto/update-setting.dto';
import { SettingResponseDto } from './dto/setting-response.dto';

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

  @Post()
  create(@Body() settingInputDto: SettingInputDto): Promise<SettingResponseDto> {
    return this.settingService.create(settingInputDto);
  }

  @Put(':key')
  update(
    @Param('key') key: string,
    @Body() updateSettingDto: UpdateSettingDto,
  ): Promise<SettingResponseDto> {
    return this.settingService.update(key, updateSettingDto);
  }

  @Delete(':key')
  remove(@Param('key') key: string): Promise<void> {
    return this.settingService.remove(key);
  }
}