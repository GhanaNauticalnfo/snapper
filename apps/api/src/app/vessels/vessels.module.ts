// vessels.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Vessel } from './vessel.entity';
import { VesselType } from './type/vessel-type.entity';
import { Device, DeviceAuthService, DeviceController, DeviceGateway } from './device';
import { VesselService } from './vessel.service';
import { VesselController } from './vessel.controller';
import { QgisTrackingController } from './tracking/qgis-tracking.controller';
import { VesselTypeController } from './type/vessel-type.controller';
import { VesselTypeService } from './type/vessel-type.service';
import { VesselTelemetry } from './tracking/vessel-telemetry.entity';
import { TrackingService } from './tracking/tracking.service';
import { TrackingController } from './tracking/tracking.controller';
import { TrackingGateway } from './tracking/tracking.gateway';
import { MqttTrackingService } from './tracking/mqtt-tracking.service';
import { TelemetryExportService } from './tracking/telemetry-export.service';
import { ResourceSettingsModule } from '../resource-settings/resource-settings.module';
import { MqttAuthController } from './mqtt/mqtt-auth.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Vessel,
      VesselType,
      Device,
      VesselTelemetry,
    ]),
    ResourceSettingsModule,
  ],
  providers: [
    VesselService,
    DeviceAuthService,
    VesselTypeService,
    TrackingService,
    TrackingGateway,
    DeviceGateway,
    MqttTrackingService,
    TelemetryExportService,
  ],
  controllers: [
    VesselTypeController,
    VesselController,
    TrackingController,
    QgisTrackingController,
    DeviceController,
    MqttAuthController
  ],
  exports: [
    VesselService,
    VesselTypeService,
    TrackingService,
    TrackingGateway,
  ],
})
export class VesselsModule {}