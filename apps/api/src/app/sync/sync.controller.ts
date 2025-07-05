import { Controller, Get, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SyncService } from './sync.service';

@ApiTags('sync')
@Controller('data')
export class SyncController {
  constructor(private syncService: SyncService) {}

  @Get('sync')
  async syncData(@Query('since') since?: string) {
    const sinceDate = since ? new Date(since) : new Date(0);
    return this.syncService.getChangesSince(sinceDate);
  }

  @Get('sync/debug')
  async debugSyncData(@Query('since') since?: string) {
    const sinceDate = since ? new Date(since) : new Date(0);
    const data = await this.syncService.getChangesSince(sinceDate);
    
    // Add debug info
    const debugData = {
      ...data,
      debug: {
        itemCount: data.data.length,
        byType: {},
        dataLengths: data.data.map(item => ({
          entity: `${item.entity_type}:${item.entity_id}`,
          action: item.action,
          dataLength: item.data ? JSON.stringify(item.data).length : 0,
          hasData: !!item.data,
          dataKeys: item.data ? Object.keys(item.data) : []
        }))
      }
    };
    
    // Count by type
    data.data.forEach(item => {
      const key = `${item.entity_type}_${item.action}`;
      debugData.debug.byType[key] = (debugData.debug.byType[key] || 0) + 1;
    });
    
    return debugData;
  }

  @Get('sync/manage')
  async manageSyncData(@Query('since') since?: string, @Query('limit') limit?: string) {
    const sinceDate = since ? new Date(since) : new Date(0);
    const data = await this.syncService.getChangesSince(sinceDate);
    
    // Build statistics by entity type
    const statsByEntityType: Record<string, { create: number; update: number; delete: number; totalSize: number }> = {};
    
    data.data.forEach(item => {
      if (!statsByEntityType[item.entity_type]) {
        statsByEntityType[item.entity_type] = { create: 0, update: 0, delete: 0, totalSize: 0 };
      }
      
      statsByEntityType[item.entity_type][item.action]++;
      if (item.data) {
        statsByEntityType[item.entity_type].totalSize += JSON.stringify(item.data).length;
      }
    });
    
    // Convert stats to array format for easier display
    const entityStats = Object.entries(statsByEntityType).map(([entityType, stats]) => ({
      entityType,
      ...stats,
      total: stats.create + stats.update + stats.delete
    }));
    
    // Get recent entries (limited if specified)
    const maxLimit = limit ? parseInt(limit, 10) : 100;
    const recentEntries = data.data.slice(-maxLimit).reverse().map(item => ({
      entityType: item.entity_type,
      entityId: item.entity_id,
      action: item.action,
      dataSize: item.data ? JSON.stringify(item.data).length : 0,
      hasData: !!item.data,
      timestamp: item.data?.properties?.last_updated || item.data?.properties?.created || null
    }));
    
    const majorVersion = await this.syncService.getCurrentMajorVersion();
    
    return {
      version: data.version,
      majorVersion,
      summary: {
        totalEntries: data.data.length,
        lastSyncVersion: data.version,
        entityTypes: Object.keys(statsByEntityType).length,
      },
      entityStats,
      recentEntries
    };
  }

  @Post('sync/reset')
  async resetSync() {
    return this.syncService.resetSync();
  }
}