import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Hazard } from './hazard.entity';
import { HazardService } from './hazard.service';
import { HazardController } from './hazard.controller';
import { SyncModule } from '../sync/sync.module';

@Module({
  imports: [TypeOrmModule.forFeature([Hazard]), SyncModule],
  controllers: [HazardController],
  providers: [HazardService],
  exports: [HazardService],
})
export class HazardsModule {}