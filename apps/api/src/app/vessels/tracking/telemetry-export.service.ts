import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder, In } from 'typeorm';
import { Response } from 'express';
import { VesselTelemetry } from './vessel-telemetry.entity';
import { Vessel } from '../vessel.entity';
import { VesselType } from '../type/vessel-type.entity';
import archiver = require('archiver');
import { Transform } from 'stream';

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

    // Create zip archive
    const archive = archiver('zip', { zlib: { level: 9 } });
    
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
          const header = 'vessel_id,vessel_name,vessel_type,timestamp,latitude,longitude,speed_knots,heading_degrees,battery_level,signal_strength,device_id,status\n';
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
          chunk.battery_level || '',
          chunk.signal_strength || '',
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
   * Stream telemetry data in chunks to avoid memory issues
   */
  private async streamTelemetryData(
    filters: TelemetryExportFilters,
    outputStream: Transform
  ): Promise<void> {
    const CHUNK_SIZE = 1000; // Process 1000 records at a time
    let offset = 0;
    let hasMoreData = true;

    while (hasMoreData) {
      const query = this.buildDetailedQuery(filters)
        .limit(CHUNK_SIZE)
        .offset(offset);

      const results = await query.getRawMany();
      
      if (results.length === 0) {
        hasMoreData = false;
        break;
      }

      // Process each result through the transform stream
      for (const result of results) {
        outputStream.write({
          vessel_id: result.vessel_id,
          vessel_name: result.vessel_name,
          vessel_type: result.vessel_type,
          timestamp: new Date(result.timestamp),
          latitude: parseFloat(result.latitude),
          longitude: parseFloat(result.longitude),
          speed_knots: result.speed_knots,
          heading_degrees: result.heading_degrees,
          battery_level: result.battery_level,
          signal_strength: result.signal_strength,
          device_id: result.device_id,
          status: result.status
        });
      }

      offset += CHUNK_SIZE;
      
      // If we got fewer results than chunk size, we're done
      if (results.length < CHUNK_SIZE) {
        hasMoreData = false;
      }
    }
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
        'telemetry.battery_level as battery_level',
        'telemetry.signal_strength as signal_strength',
        'telemetry.device_id as device_id',
        'telemetry.status as status'
      ])
      .orderBy('telemetry.timestamp', 'ASC')
      .addOrderBy('telemetry.vessel_id', 'ASC');
  }
}