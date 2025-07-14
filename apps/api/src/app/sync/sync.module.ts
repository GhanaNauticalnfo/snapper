import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SyncLog } from './sync-log.entity';
import { SyncVersion } from './sync-version.entity';
import { SyncService } from './sync.service';
import { SyncController } from './sync.controller';
import { SyncGateway } from './sync.gateway';

@Module({
  imports: [TypeOrmModule.forFeature([SyncLog, SyncVersion])],
  controllers: [SyncController],
  providers: [SyncService, SyncGateway], // Using WebSocket for real-time sync notifications
  exports: [SyncService, SyncGateway],
})
export class SyncModule {}