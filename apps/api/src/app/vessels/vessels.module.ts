// vessels.module.ts (updated)
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Vessel } from './vessel.entity';
import { TrackingPoint } from './tracking-point.entity';
import { Device } from './device.entity';
import { VesselService } from './vessel.service';
import { TrackingService } from './tracking.service';
import { MqttTrackingService } from './mqtt-tracking.service';
import { DeviceAuthService } from './device-auth.service';
import { VesselController } from './vessel.controller';
import { TrackingController } from './tracking.controller';
import { QgisController } from './qgis.controller';
import { DeviceController } from './device.controller';
import { TrackingGateway } from './tracking.gateway';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Vessel,
      TrackingPoint,
      Device
    ])
  ],
  providers: [
    VesselService,
    TrackingService,
    MqttTrackingService,
    DeviceAuthService,
    TrackingGateway
  ],
  controllers: [
    VesselController,
    TrackingController,
    QgisController,
    DeviceController
  ],
  exports: [
    VesselService,
    TrackingService,
    TrackingGateway
  ],
})
export class VesselsModule {}