import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Marker } from './marker.entity';
import { MarkerService } from './marker.service';
import { MarkerController } from './marker.controller';
import { SyncModule } from '../sync/sync.module';

@Module({
  imports: [TypeOrmModule.forFeature([Marker]), SyncModule],
  controllers: [MarkerController],
  providers: [MarkerService],
  exports: [MarkerService],
})
export class MarkersModule {}