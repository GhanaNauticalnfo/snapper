// kml-dataset.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KmlDataset } from './kml-dataset.entity';
import { KmlDatasetService } from './kml-dataset.service';
import { KmlDatasetController } from './kml-dataset.controller';

@Module({
  imports: [TypeOrmModule.forFeature([KmlDataset])],
  providers: [KmlDatasetService],
  controllers: [KmlDatasetController],
  exports: [KmlDatasetService],
})
export class KmlDatasetModule {}