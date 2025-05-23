import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { SyncLog } from './sync-log.entity';

@Injectable()
export class SyncService {
  constructor(
    @InjectRepository(SyncLog)
    private syncLogRepository: Repository<SyncLog>,
  ) {}

  async getChangesSince(since: Date) {
    const changes = await this.syncLogRepository.find({
      where: {
        created_at: MoreThan(since),
        is_latest: true,
      },
      order: {
        created_at: 'ASC',
        id: 'ASC',
      },
    });

    return {
      version: new Date().toISOString(),
      data: changes.map(change => ({
        entity_type: change.entity_type,
        entity_id: change.entity_id,
        action: change.action,
        data: change.data,
      })),
    };
  }

  async logChange(
    entityType: string,
    entityId: string,
    action: 'create' | 'update' | 'delete',
    data?: any,
  ) {
    await this.syncLogRepository.manager.transaction(async manager => {
      // Mark previous entries as not latest
      await manager.update(
        SyncLog,
        { entity_id: entityId, entity_type: entityType, is_latest: true },
        { is_latest: false },
      );

      // Insert new entry
      await manager.save(SyncLog, {
        entity_type: entityType,
        entity_id: entityId,
        action: action,
        data: action === 'delete' ? null : data,
        is_latest: true,
      });
    });
  }
}