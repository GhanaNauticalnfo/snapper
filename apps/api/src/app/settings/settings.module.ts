import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VesselType } from '../vessels/type/vessel-type.entity';
import { Vessel } from '../vessels/vessel.entity';
import { VesselTypeService } from '../vessels/type/vessel-type.service';
import { VesselTypeController } from '../vessels/type/vessel-type.controller';
import { Setting } from './setting.entity';
import { SettingService } from './setting.service';
import { SettingController } from './setting.controller';

@Module({
  imports: [TypeOrmModule.forFeature([VesselType, Vessel, Setting])],
  controllers: [VesselTypeController, SettingController],
  providers: [VesselTypeService, SettingService],
  exports: [VesselTypeService, SettingService],
})
export class SettingsModule {}