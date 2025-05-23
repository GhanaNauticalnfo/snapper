// vessels.module.ts (updated)
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Vessel } from './vessel.entity';
import { TrackingPoint } from './tracking-point.entity';
import { DeviceToken } from './device-token.entity';
import { VesselService } from './vessel.service';
import { TrackingService } from './tracking.service';
import { MqttTrackingService } from './mqtt-tracking.service';
import { DeviceAuthService } from './device-auth.service';
import { VesselController } from './vessel.controller';
import { TrackingController } from './tracking.controller';
import { QgisController } from './qgis.controller';
import { DeviceTokenController } from './device-token.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Vessel,
      TrackingPoint,
      DeviceToken
    ])
  ],
  providers: [
    VesselService,
    TrackingService,
    MqttTrackingService,
    DeviceAuthService
  ],
  controllers: [
    VesselController,
    TrackingController,
    QgisController,
    DeviceTokenController
  ],
  exports: [
    VesselService,
    TrackingService
  ],
})
export class VesselsModule {}