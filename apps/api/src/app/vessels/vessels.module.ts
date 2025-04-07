// vessels.module.ts (updated)
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Vessel } from './vessel.entity';
import { TrackingPoint } from './tracking-point.entity';
import { VesselService } from './vessel.service';
import { TrackingService } from './tracking.service';
import { MqttTrackingService } from './mqtt-tracking.service';
import { VesselController } from './vessel.controller';
import { TrackingController } from './tracking.controller';
import { QgisController } from './qgis.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Vessel,
      TrackingPoint
    ])
  ],
  providers: [
    VesselService,
    TrackingService,
    MqttTrackingService
  ],
  controllers: [
    VesselController,
    TrackingController,
    QgisController
  ],
  exports: [
    VesselService,
    TrackingService
  ],
})
export class VesselsModule {}