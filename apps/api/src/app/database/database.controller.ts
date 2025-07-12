import { Controller, Get, Put, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { IsNumber, Min, Max } from 'class-validator';
import { DatabaseService } from './database.service';
import { SettingService } from '../settings/setting.service';
import { SETTING_KEYS } from '../settings/constants/settings.constants';

export class UpdateRetentionDto {
  @IsNumber()
  @Min(1)
  @Max(3650)
  retentionDays: number;
}

@ApiTags('database')
@Controller('database')
export class DatabaseController {
  constructor(
    private databaseService: DatabaseService,
    private settingService: SettingService,
  ) {}

  @Get('settings')
  @ApiOperation({ summary: 'Get database settings' })
  @ApiResponse({ status: 200, description: 'Database settings retrieved successfully' })
  async getDatabaseSettings() {
    const retentionDays = await this.settingService.getSettingValue(
      SETTING_KEYS.DATABASE_TELEMETRY_RETENTION_DAYS
    );
    
    const statistics = await this.databaseService.getDatabaseStatistics();
    
    return {
      retentionDays: parseInt(retentionDays, 10),
      ...statistics
    };
  }

  @Put('settings')
  @ApiOperation({ summary: 'Update database settings' })
  @ApiResponse({ status: 200, description: 'Database settings updated successfully' })
  async updateDatabaseSettings(@Body() dto: UpdateRetentionDto) {
    await this.settingService.updateSetting(
      SETTING_KEYS.DATABASE_TELEMETRY_RETENTION_DAYS,
      dto.retentionDays.toString()
    );
    
    return { success: true };
  }
}