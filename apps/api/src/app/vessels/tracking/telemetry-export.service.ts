import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder, In, DataSource } from 'typeorm';
import { Response } from 'express';
import { VesselTelemetry } from './vessel-telemetry.entity';
import { Vessel } from '../vessel.entity';
import { VesselType } from '../type/vessel-type.entity';
import archiver = require('archiver');
import { Transform, Readable } from 'stream';

interface CsvTransformStream extends Transform {
  headerWritten?: boolean;
}

export interface TelemetryExportFilters {
  startDate: Date;
  endDate: Date;
  vesselIds?: number[];
  vesselTypeIds?: number[];
}

export interface TelemetryExportStats {
  totalRecords: number;
  dateRange: {
    min: Date;
    max: Date;
  };
}

@Injectable()
export class TelemetryExportService {
  constructor(
    @InjectRepository(VesselTelemetry)
    private telemetryRepository: Repository<VesselTelemetry>,
    @InjectRepository(Vessel)
    private vesselRepository: Repository<Vessel>,
    @InjectRepository(VesselType)
    private vesselTypeRepository: Repository<VesselType>,
    private dataSource: DataSource,
  ) {}

  /**
   * Get statistics about available telemetry data for export
   */
  async getExportStats(filters?: Partial<TelemetryExportFilters>): Promise<TelemetryExportStats> {
    const query = this.buildBaseQuery(filters);
    
    const [{ count }, dateRangeResult] = await Promise.all([
      query.select('COUNT(telemetry.id)', 'count').getRawOne(),
      this.telemetryRepository.createQueryBuilder('telemetry')
        .select('MIN(telemetry.timestamp)', 'min')
        .addSelect('MAX(telemetry.timestamp)', 'max')
        .getRawOne()
    ]);

    return {
      totalRecords: parseInt(count),
      dateRange: {
        min: new Date(dateRangeResult.min),
        max: new Date(dateRangeResult.max)
      }
    };
  }

  /**
   * Stream telemetry data as a zipped CSV file
   */
  async streamTelemetryExport(
    filters: TelemetryExportFilters,
    response: Response
  ): Promise<void> {
    // Set response headers for file download
    const fileName = `telemetry-export-${new Date().toISOString().split('T')[0]}.zip`;
    response.setHeader('Content-Type', 'application/zip');
    response.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    response.setHeader('Transfer-Encoding', 'chunked');

    // Create zip archive with reduced compression level for better memory efficiency
    const archive = archiver('zip', { 
      zlib: { level: 6 }, // Reduced from 9 to balance compression vs memory
      highWaterMark: 16 * 1024 // 16KB buffer
    });
    
    // Handle archive errors
    archive.on('error', (err) => {
      console.error('Archive error:', err);
      if (!response.headersSent) {
        response.status(500).json({ error: 'Failed to create export archive' });
      }
    });

    // Pipe archive to response
    archive.pipe(response);

    // Create CSV transform stream
    const csvTransform = new Transform({
      objectMode: true,
      transform(chunk: any, encoding, callback) {
        const self = this as CsvTransformStream;
        if (!self.headerWritten) {
          // Write CSV header
          const header = 'vessel_id,vessel_name,vessel_type,timestamp,latitude,longitude,speed_knots,heading_degrees,device_id,status\n';
          this.push(header);
          self.headerWritten = true;
        }

        // Transform telemetry record to CSV row
        // Safely handle timestamp conversion
        let timestampStr = '';
        try {
          if (chunk.timestamp && chunk.timestamp instanceof Date && !isNaN(chunk.timestamp.getTime())) {
            timestampStr = chunk.timestamp.toISOString();
          } else if (chunk.timestamp) {
            // Try to parse as date if it's a string
            const parsedDate = new Date(chunk.timestamp);
            if (!isNaN(parsedDate.getTime())) {
              timestampStr = parsedDate.toISOString();
            }
          }
        } catch (error) {
          console.warn('Invalid timestamp in telemetry data:', chunk.timestamp, error);
        }

        const row = [
          chunk.vessel_id,
          `"${(chunk.vessel_name || '').replace(/"/g, '""')}"`, // Escape quotes
          `"${(chunk.vessel_type || '').replace(/"/g, '""')}"`,
          timestampStr,
          chunk.latitude,
          chunk.longitude,
          chunk.speed_knots || '',
          chunk.heading_degrees || '',
          chunk.device_id || '',
          `"${(chunk.status || '').replace(/"/g, '""')}"`
        ].join(',') + '\n';

        this.push(row);
        callback();
      }
    });

    // Add CSV file to archive
    archive.append(csvTransform, { name: 'telemetry-data.csv' });

    try {
      // Stream telemetry data
      await this.streamTelemetryData(filters, csvTransform);
      
      // End CSV stream
      csvTransform.end();
      
      // Finalize archive
      await archive.finalize();
    } catch (error) {
      console.error('Error streaming telemetry data:', error);
      csvTransform.destroy(error);
      archive.destroy();
      
      if (!response.headersSent) {
        response.status(500).json({ error: 'Failed to export telemetry data' });
      }
    }
  }

  /**
   * Stream telemetry data using PostgreSQL streaming for optimal performance
   * Falls back to chunked approach if streaming is not available
   */
  private async streamTelemetryData(
    filters: TelemetryExportFilters,
    outputStream: Transform
  ): Promise<void> {
    // Try to use PostgreSQL streaming first
    try {
      await this.streamTelemetryDataWithPgStream(filters, outputStream);
    } catch (error) {
      console.warn('PostgreSQL streaming failed, falling back to chunked approach:', error);
      await this.streamTelemetryDataChunked(filters, outputStream);
    }
  }

  /**
   * Stream telemetry data using PostgreSQL's cursor-based approach
   */
  private async streamTelemetryDataWithPgStream(
    filters: TelemetryExportFilters,
    outputStream: Transform
  ): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();

    try {
      // Build SQL query with parameters
      const { sql, parameters } = this.buildStreamingQuery(filters);
      
      // Use a cursor-based approach for streaming
      const cursorName = `telemetry_export_${Date.now()}`;
      
      // Start transaction and declare cursor
      await queryRunner.startTransaction();
      await queryRunner.query(`DECLARE ${cursorName} CURSOR FOR ${sql}`, parameters);
      
      let processedCount = 0;
      const startMemory = process.memoryUsage();
      console.log(`Starting telemetry export with PostgreSQL cursor. Initial memory: RSS=${Math.round(startMemory.rss / 1024 / 1024)}MB`);

      const BATCH_SIZE = 100000;
      let hasMoreData = true;

      while (hasMoreData) {
        // Fetch batch from cursor
        const results = await queryRunner.query(`FETCH ${BATCH_SIZE} FROM ${cursorName}`);
        
        if (results.length === 0) {
          hasMoreData = false;
          break;
        }

        // Process each row with backpressure handling
        for (const row of results) {
          const canContinue = outputStream.write({
            vessel_id: row.vessel_id,
            vessel_name: row.vessel_name,
            vessel_type: row.vessel_type,
            timestamp: new Date(row.timestamp),
            latitude: parseFloat(row.latitude),
            longitude: parseFloat(row.longitude),
            speed_knots: row.speed_knots,
            heading_degrees: row.heading_degrees,
            device_id: row.device_id,
            status: row.status
          });

          processedCount++;

          // Handle backpressure
          if (!canContinue) {
            console.log(`Stream buffer full at ${processedCount} records, waiting for drain...`);
            await new Promise<void>((resolve) => {
              outputStream.once('drain', () => {
                console.log('Stream drained, continuing...');
                resolve();
              });
            });
          }
        }

        // Log progress
        if (processedCount % 10000 === 0) {
          const currentMemory = process.memoryUsage();
          console.log(`Processed ${processedCount} records with cursor. Memory: RSS=${Math.round(currentMemory.rss / 1024 / 1024)}MB`);
        }
        
        // Check if we got less than batch size (indicates end of data)
        if (results.length < BATCH_SIZE) {
          hasMoreData = false;
        }
      }

      // Close cursor
      await queryRunner.query(`CLOSE ${cursorName}`);
      await queryRunner.commitTransaction();

      const endMemory = process.memoryUsage();
      console.log(`PostgreSQL cursor export completed. Processed ${processedCount} records. Final memory: RSS=${Math.round(endMemory.rss / 1024 / 1024)}MB`);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Build SQL query for streaming
   */
  private buildStreamingQuery(filters: TelemetryExportFilters): { sql: string; parameters: any[] } {
    let sql = `
      SELECT 
        t.vessel_id,
        v.name as vessel_name,
        vt.name as vessel_type,
        t.timestamp,
        ST_X(t.position::geometry) as longitude,
        ST_Y(t.position::geometry) as latitude,
        t.speed_knots,
        t.heading_degrees,
        t.device_id,
        t.status
      FROM vessel_telemetry t
      INNER JOIN vessel v ON t.vessel_id = v.id
      INNER JOIN vessel_type vt ON v.vessel_type_id = vt.id
      WHERE 1=1
    `;
    
    const parameters: any[] = [];
    let paramIndex = 1;

    if (filters.startDate) {
      sql += ` AND t.timestamp >= $${paramIndex}`;
      parameters.push(filters.startDate);
      paramIndex++;
    }

    if (filters.endDate) {
      sql += ` AND t.timestamp <= $${paramIndex}`;
      parameters.push(filters.endDate);
      paramIndex++;
    }

    if (filters.vesselIds && filters.vesselIds.length > 0) {
      sql += ` AND t.vessel_id = ANY($${paramIndex})`;
      parameters.push(filters.vesselIds);
      paramIndex++;
    }

    if (filters.vesselTypeIds && filters.vesselTypeIds.length > 0) {
      sql += ` AND v.vessel_type_id = ANY($${paramIndex})`;
      parameters.push(filters.vesselTypeIds);
      paramIndex++;
    }

    sql += ` ORDER BY t.timestamp ASC, t.vessel_id ASC`;

    return { sql, parameters };
  }

  /**
   * Stream telemetry data in chunks (fallback method)
   * Implements proper backpressure handling to prevent memory overflow
   */
  private async streamTelemetryDataChunked(
    filters: TelemetryExportFilters,
    outputStream: Transform
  ): Promise<void> {
    const CHUNK_SIZE = 50000;
    let offset = 0;
    let hasMoreData = true;
    let processedCount = 0;

    // Log memory usage at start
    const startMemory = process.memoryUsage();
    console.log(`Starting telemetry export. Initial memory: RSS=${Math.round(startMemory.rss / 1024 / 1024)}MB, Heap=${Math.round(startMemory.heapUsed / 1024 / 1024)}MB`);

    while (hasMoreData) {
      const query = this.buildDetailedQuery(filters)
        .limit(CHUNK_SIZE)
        .offset(offset);

      const results = await query.getRawMany();
      
      if (results.length === 0) {
        hasMoreData = false;
        break;
      }

      // Process each result through the transform stream with backpressure handling
      for (const result of results) {
        const canContinue = outputStream.write({
          vessel_id: result.vessel_id,
          vessel_name: result.vessel_name,
          vessel_type: result.vessel_type,
          timestamp: new Date(result.timestamp),
          latitude: parseFloat(result.latitude),
          longitude: parseFloat(result.longitude),
          speed_knots: result.speed_knots,
          heading_degrees: result.heading_degrees,
          device_id: result.device_id,
          status: result.status
        });

        processedCount++;

        // Handle backpressure - if stream buffer is full, wait for drain
        if (!canContinue) {
          console.log(`Stream buffer full at ${processedCount} records, waiting for drain...`);
          await new Promise<void>((resolve) => {
            outputStream.once('drain', () => {
              console.log('Stream drained, continuing...');
              resolve();
            });
          });
        }
      }

      offset += CHUNK_SIZE;
      
      // Log progress every 10,000 records
      if (processedCount % 10000 === 0) {
        const currentMemory = process.memoryUsage();
        console.log(`Processed ${processedCount} records. Memory: RSS=${Math.round(currentMemory.rss / 1024 / 1024)}MB, Heap=${Math.round(currentMemory.heapUsed / 1024 / 1024)}MB`);
        
        // Force garbage collection if heap usage is high (only in production with --expose-gc flag)
        if (global.gc && currentMemory.heapUsed > 500 * 1024 * 1024) {
          console.log('Running garbage collection...');
          global.gc();
        }
      }
      
      // If we got fewer results than chunk size, we're done
      if (results.length < CHUNK_SIZE) {
        hasMoreData = false;
      }
    }

    const endMemory = process.memoryUsage();
    console.log(`Export completed. Processed ${processedCount} records. Final memory: RSS=${Math.round(endMemory.rss / 1024 / 1024)}MB, Heap=${Math.round(endMemory.heapUsed / 1024 / 1024)}MB`);
  }

  /**
   * Build base query for telemetry data
   */
  private buildBaseQuery(filters?: Partial<TelemetryExportFilters>): SelectQueryBuilder<VesselTelemetry> {
    const query = this.telemetryRepository.createQueryBuilder('telemetry')
      .innerJoin('telemetry.vessel', 'vessel')
      .innerJoin('vessel.vessel_type', 'vessel_type');

    if (filters?.startDate) {
      query.andWhere('telemetry.timestamp >= :startDate', { startDate: filters.startDate });
    }

    if (filters?.endDate) {
      query.andWhere('telemetry.timestamp <= :endDate', { endDate: filters.endDate });
    }

    if (filters?.vesselIds && filters.vesselIds.length > 0) {
      query.andWhere('telemetry.vessel_id IN (:...vesselIds)', { vesselIds: filters.vesselIds });
    }

    if (filters?.vesselTypeIds && filters.vesselTypeIds.length > 0) {
      query.andWhere('vessel.vessel_type_id IN (:...vesselTypeIds)', { vesselTypeIds: filters.vesselTypeIds });
    }

    return query;
  }

  /**
   * Build detailed query with all required fields and coordinate extraction
   */
  private buildDetailedQuery(filters: TelemetryExportFilters): SelectQueryBuilder<VesselTelemetry> {
    return this.buildBaseQuery(filters)
      .select([
        'telemetry.id as id',
        'telemetry.vessel_id as vessel_id',
        'vessel.name as vessel_name',
        'vessel_type.name as vessel_type',
        'telemetry.timestamp as timestamp',
        'ST_X(telemetry.position::geometry) as longitude',
        'ST_Y(telemetry.position::geometry) as latitude',
        'telemetry.speed_knots as speed_knots',
        'telemetry.heading_degrees as heading_degrees',
        'telemetry.device_id as device_id',
        'telemetry.status as status'
      ])
      .orderBy('telemetry.timestamp', 'ASC')
      .addOrderBy('telemetry.vessel_id', 'ASC');
  }
}