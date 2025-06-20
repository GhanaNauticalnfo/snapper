import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LandingSite } from './landing-site.entity';
import { LandingSiteService } from './landing-site.service';
import { LandingSiteController } from './landing-site.controller';
import { SyncModule } from '../sync/sync.module';
import { ResourceSettingsModule } from '../resource-settings/resource-settings.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([LandingSite]),
    SyncModule,
    ResourceSettingsModule,
  ],
  controllers: [LandingSiteController],
  providers: [LandingSiteService],
  exports: [LandingSiteService],
})
export class LandingSitesModule {}