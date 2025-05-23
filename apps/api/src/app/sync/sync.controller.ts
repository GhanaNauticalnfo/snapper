import { Controller, Get, Query } from '@nestjs/common';
import { SyncService } from './sync.service';

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
}