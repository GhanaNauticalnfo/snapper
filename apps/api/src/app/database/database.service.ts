import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, DataSource } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DatabaseStatistics } from './database-statistics.entity';
import { SettingService } from '../settings/setting.service';
import { SETTING_KEYS } from '../settings/constants/settings.constants';

@Injectable()
export class DatabaseService {
  private readonly logger = new Logger(DatabaseService.name);

  constructor(
    @InjectRepository(DatabaseStatistics)
    private databaseStatisticsRepository: Repository<DatabaseStatistics>,
    private dataSource: DataSource,
    @Inject(forwardRef(() => SettingService))
    private settingService: SettingService,
  ) {}

  /**
   * Daily cron job that runs at 2 AM
   * 1. Calculates and stores database statistics
   * 2. Cleans up old telemetry data based on retention setting
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async dailyDatabaseMaintenance() {
    this.logger.log('Starting daily database maintenance');
    
    try {
      // Calculate and store statistics
      await this.calculateAndStoreStatistics();
      
      // Clean up old telemetry data
      await this.cleanupOldTelemetryData();
      
      this.logger.log('Daily database maintenance completed successfully');
    } catch (error) {
      this.logger.error('Error during daily database maintenance', error);
    }
  }

  /**
   * Calculate current database statistics and store them
   */
  private async calculateAndStoreStatistics() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get vessel telemetry table size and count
    const sizeResult = await this.dataSource.query(`
      SELECT 
        pg_size_pretty(pg_total_relation_size('vessel_telemetry')) as size,
        pg_total_relation_size('vessel_telemetry') as size_bytes,
        COUNT(*) as count
      FROM vessel_telemetry
    `);

    const sizeInBytes = parseFloat(sizeResult[0].size_bytes);
    const sizeInGb = sizeInBytes / (1024 * 1024 * 1024);
    const count = sizeResult[0].count;

    // Store statistics
    const stats = this.databaseStatisticsRepository.create({
      date: today,
      vesselTelemetrySizeGb: sizeInGb,
      vesselTelemetryCount: count.toString()
    });

    await this.databaseStatisticsRepository.save(stats);
    
    this.logger.log(`Stored database statistics: ${sizeInGb.toFixed(4)} GB, ${count} records`);
  }

  /**
   * Clean up old telemetry data based on retention setting
   */
  private async cleanupOldTelemetryData() {
    // Get retention days setting
    const retentionDaysStr = await this.settingService.getSettingValue(
      SETTING_KEYS.DATABASE_TELEMETRY_RETENTION_DAYS
    );
    const retentionDays = parseInt(retentionDaysStr, 10);

    // Calculate cutoff date
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    // Delete old records
    const result = await this.dataSource.query(`
      DELETE FROM vessel_telemetry 
      WHERE created < $1
    `, [cutoffDate]);

    const deletedCount = result[1];
    this.logger.log(`Deleted ${deletedCount} telemetry records older than ${retentionDays} days`);
  }

  /**
   * Get database statistics for display
   */
  async getDatabaseStatistics() {
    // Get current size
    const currentSize = await this.getCurrentSize();
    
    // Get historical statistics (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const statistics = await this.databaseStatisticsRepository.find({
      order: {
        date: 'DESC'
      },
      take: 30
    });

    return {
      currentSizeGb: currentSize,
      history: statistics.map(stat => stat.toResponseDto())
    };
  }

  /**
   * Get current vessel telemetry table size
   */
  private async getCurrentSize(): Promise<number> {
    const result = await this.dataSource.query(`
      SELECT pg_total_relation_size('vessel_telemetry') as size_bytes
    `);
    
    const sizeInBytes = parseFloat(result[0].size_bytes);
    return sizeInBytes / (1024 * 1024 * 1024);
  }
}