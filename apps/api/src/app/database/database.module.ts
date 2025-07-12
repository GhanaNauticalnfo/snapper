import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { DatabaseService } from './database.service';
import { DatabaseStatistics } from './database-statistics.entity';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([DatabaseStatistics]),
    ScheduleModule.forRoot(),
    forwardRef(() => SettingsModule)
  ],
  providers: [DatabaseService],
  exports: [DatabaseService]
})
export class DatabaseModule {}