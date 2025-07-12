import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { DatabaseController } from './database.controller';
import { DatabaseService } from './database.service';
import { DatabaseStatistics } from './database-statistics.entity';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([DatabaseStatistics]),
    ScheduleModule.forRoot(),
    SettingsModule
  ],
  controllers: [DatabaseController],
  providers: [DatabaseService],
  exports: [DatabaseService]
})
export class DatabaseModule {}