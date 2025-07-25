import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { SyncLog } from './sync-log.entity';
import { SyncVersion } from './sync-version.entity';

@Injectable()
export class SyncService {
  constructor(
    @InjectRepository(SyncLog)
    private syncLogRepository: Repository<SyncLog>,
    @InjectRepository(SyncVersion)
    private syncVersionRepository: Repository<SyncVersion>,
  ) {}

  async getCurrentMajorVersion(): Promise<number> {
    const currentVersion = await this.syncVersionRepository.findOne({
      where: { is_current: true },
    });
    return currentVersion?.major_version || 1;
  }

  async getChangesSince(since: Date) {
    const majorVersion = await this.getCurrentMajorVersion();
    
    const changes = await this.syncLogRepository.find({
      where: {
        created_at: MoreThan(since),
        is_latest: true,
        major_version: majorVersion,
      },
      order: {
        created_at: 'ASC',
        id: 'ASC',
      },
    });

    return {
      version: new Date().toISOString(),
      majorVersion,
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
    const majorVersion = await this.getCurrentMajorVersion();
    
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
        major_version: majorVersion,
      });
    });
  }

  async resetSync() {
    await this.syncLogRepository.manager.transaction(async manager => {
      // Get current major version
      const currentVersion = await manager.findOne(SyncVersion, {
        where: { is_current: true },
      });
      const currentMajorVersion = currentVersion?.major_version || 0;
      const newMajorVersion = currentMajorVersion + 1;

      // Mark current version as not current
      if (currentVersion) {
        await manager.update(
          SyncVersion,
          { id: currentVersion.id },
          { is_current: false },
        );
      }

      // Create new major version
      await manager.save(SyncVersion, {
        major_version: newMajorVersion,
        is_current: true,
      });

      // Get all current entities (is_latest = true)
      const currentEntities = await manager.find(SyncLog, {
        where: { is_latest: true },
      });

      // Mark all existing entries as not latest
      await manager.update(
        SyncLog,
        { is_latest: true },
        { is_latest: false },
      );

      // Create new entries for all current entities with new major version
      for (const entity of currentEntities) {
        // Only create entries for non-deleted entities
        if (entity.action !== 'delete' && entity.data) {
          await manager.save(SyncLog, {
            entity_type: entity.entity_type,
            entity_id: entity.entity_id,
            action: 'create',
            data: entity.data,
            is_latest: true,
            major_version: newMajorVersion,
          });
        }
      }
    });

    return {
      success: true,
      majorVersion: await this.getCurrentMajorVersion(),
    };
  }
}