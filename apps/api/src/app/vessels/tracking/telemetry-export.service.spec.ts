import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken, TypeOrmModule } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Response } from 'express';
import { Transform } from 'stream';
import { TelemetryExportService } from './telemetry-export.service';
import { VesselTelemetry } from './vessel-telemetry.entity';
import { Vessel } from '../vessel.entity';
import { VesselType } from '../type/vessel-type.entity';

describe('TelemetryExportService', () => {
  let service: TelemetryExportService;
  let telemetryRepository: Repository<VesselTelemetry>;
  let vesselRepository: Repository<Vessel>;
  let vesselTypeRepository: Repository<VesselType>;
  let dataSource: DataSource;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TelemetryExportService,
        {
          provide: getRepositoryToken(VesselTelemetry),
          useValue: {
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Vessel),
          useValue: {},
        },
        {
          provide: getRepositoryToken(VesselType),
          useValue: {},
        },
        {
          provide: DataSource,
          useValue: {
            createQueryRunner: jest.fn().mockReturnValue({
              connect: jest.fn(),
              startTransaction: jest.fn(),
              query: jest.fn(),
              commitTransaction: jest.fn(),
              rollbackTransaction: jest.fn(),
              release: jest.fn(),
            }),
          },
        },
      ],
    }).compile();

    service = module.get<TelemetryExportService>(TelemetryExportService);
    telemetryRepository = module.get<Repository<VesselTelemetry>>(
      getRepositoryToken(VesselTelemetry)
    );
    vesselRepository = module.get<Repository<Vessel>>(
      getRepositoryToken(Vessel)
    );
    vesselTypeRepository = module.get<Repository<VesselType>>(
      getRepositoryToken(VesselType)
    );
    dataSource = module.get<DataSource>(DataSource);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Memory Efficiency', () => {
    it('should handle backpressure when output stream is slow', async () => {
      // Create a slow transform stream that simulates backpressure
      const slowStream = new Transform({
        objectMode: true,
        highWaterMark: 5, // Very small buffer to trigger backpressure quickly
        transform(chunk: any, encoding, callback) {
          // Simulate slow processing
          setTimeout(() => {
            this.push(JSON.stringify(chunk));
            callback();
          }, 10);
        }
      });

      const mockResults = Array.from({ length: 100 }, (_, i) => ({
        vessel_id: i,
        vessel_name: `Vessel ${i}`,
        vessel_type: 'Cargo',
        timestamp: new Date(),
        latitude: -5.55 + (i * 0.01),
        longitude: 0.0 + (i * 0.01),
        speed_knots: 10.5,
        heading_degrees: 180,
        device_id: `device_${i}`,
        status: 'active'
      }));

      // Mock the query runner to return data in batches
      const mockQueryRunner = {
        connect: jest.fn(),
        startTransaction: jest.fn(),
        query: jest.fn()
          .mockResolvedValueOnce([]) // DECLARE CURSOR
          .mockResolvedValueOnce(mockResults.slice(0, 50)) // First FETCH
          .mockResolvedValueOnce(mockResults.slice(50, 100)) // Second FETCH
          .mockResolvedValueOnce([]) // Third FETCH (empty, end of data)
          .mockResolvedValueOnce([]), // CLOSE CURSOR
        commitTransaction: jest.fn(),
        rollbackTransaction: jest.fn(),
        release: jest.fn(),
      };

      (dataSource.createQueryRunner as jest.Mock).mockReturnValue(mockQueryRunner);

      // Track drain events
      let drainCount = 0;
      slowStream.on('drain', () => {
        drainCount++;
      });

      // Execute the streaming with our slow stream
      await service['streamTelemetryDataWithPgStream'](
        {
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-12-31'),
        },
        slowStream
      );

      // Verify backpressure was handled (drain events occurred)
      expect(drainCount).toBeGreaterThan(0);
      
      // Verify cursor was properly managed
      expect(mockQueryRunner.startTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });

    it('should log memory usage during export', async () => {
      const consoleSpy = jest.spyOn(console, 'log');
      
      // Mock a large dataset
      const mockResults = Array.from({ length: 10000 }, (_, i) => ({
        vessel_id: i,
        vessel_name: `Vessel ${i}`,
        vessel_type: 'Cargo',
        timestamp: new Date(),
        latitude: -5.55,
        longitude: 0.0,
        speed_knots: 10.5,
        heading_degrees: 180,
        device_id: `device_${i}`,
        status: 'active'
      }));

      const mockQueryRunner = {
        connect: jest.fn(),
        startTransaction: jest.fn(),
        query: jest.fn()
          .mockResolvedValueOnce([]) // DECLARE CURSOR
          .mockImplementation((sql: string) => {
            if (sql.includes('FETCH')) {
              // Return 1000 records at a time
              const batch = mockResults.splice(0, 1000);
              return Promise.resolve(batch);
            }
            return Promise.resolve([]);
          }),
        commitTransaction: jest.fn(),
        rollbackTransaction: jest.fn(),
        release: jest.fn(),
      };

      (dataSource.createQueryRunner as jest.Mock).mockReturnValue(mockQueryRunner);

      const outputStream = new Transform({
        objectMode: true,
        transform(chunk: any, encoding, callback) {
          callback();
        }
      });

      await service['streamTelemetryDataWithPgStream'](
        {
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-12-31'),
        },
        outputStream
      );

      // Verify memory logging occurred
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Starting telemetry export with PostgreSQL cursor')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('PostgreSQL cursor export completed')
      );

      consoleSpy.mockRestore();
    });
  });
});