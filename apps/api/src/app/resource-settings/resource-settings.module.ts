import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ResourceSettingsController } from './resource-settings.controller';
import { ResourceSettingsService } from './resource-settings.service';
import { SettingType } from './entities/setting-type.entity';
import { ResourceSetting } from './entities/resource-setting.entity';

@Module({
  imports: [TypeOrmModule.forFeature([SettingType, ResourceSetting])],
  controllers: [ResourceSettingsController],
  providers: [ResourceSettingsService],
  exports: [ResourceSettingsService]
})
export class ResourceSettingsModule {}