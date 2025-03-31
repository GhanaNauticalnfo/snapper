// apps/api/src/app/volta-depth/volta-depth.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { DataSource } from 'typeorm';
import { Cache } from 'cache-manager';
import { v4 as uuidv4 } from 'uuid';
import * as turf from '@turf/turf';
// Import GeoJSON types correctly
import { FeatureCollection, MultiPolygon, GeoJsonProperties, Feature } from 'geojson';
import { BadRequestException, Logger, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { Readable } from 'stream';
import { Express } from 'express';

import { VoltaDepthService } from './volta-depth.service';
import { VoltaDepthTile } from './entities/volta-depth-tile.entity';
import { VoltaDepthTileFeature } from './entities/volta-depth-tile-feature.entity';
import { VOLTA_TILE_DEFINITIONS } from './constants/volta-tile-definitions.const';

// --- Mocks ---
const mockTileRepository = { findOneBy: jest.fn(), find: jest.fn(), save: jest.fn() };
const mockFeatureRepository = { delete: jest.fn(), save: jest.fn() };
const mockCacheManager = { get: jest.fn(), set: jest.fn(), del: jest.fn() };
const mockQueryRunner = { connect: jest.fn(), startTransaction: jest.fn(), commitTransaction: jest.fn(), rollbackTransaction: jest.fn(), release: jest.fn(), manager: { delete: jest.fn(), save: jest.fn() } };
const mockDataSource = { createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner) };

jest.mock('uuid', () => ({ v4: jest.fn() }));

const createMockFile = (content: object): Express.Multer.File => ({
  fieldname: 'file',
  originalname: 'upload.geojson',
  encoding: '7bit',
  mimetype: 'application/json',
  size: 1000,
  buffer: Buffer.from(JSON.stringify(content)),
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  stream: new Readable({ read() {} }),
  destination: '',
  filename: '',
  path: '',
});

// --- Explicitly type validGeoJson ---
const validGeoJson: FeatureCollection<MultiPolygon, GeoJsonProperties> = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: { fid: 1, group: 1, Description: 'Test Desc' },
      geometry: { type: 'MultiPolygon', coordinates: [ [[[-1.4, 8.8], [-1.3, 8.8], [-1.3, 8.9], [-1.4, 8.9], [-1.4, 8.8]]], ] },
    },
     {
      type: 'Feature',
      properties: { fid: 2 },
      geometry: { type: 'MultiPolygon', coordinates: [ [[[-1.45, 8.85], [-1.35, 8.85], [-1.35, 8.95], [-1.45, 8.95], [-1.45, 8.85]]], ] },
    },
  ],
};

const tileAA = VOLTA_TILE_DEFINITIONS.find(t => t.properties.id === 'AA');
if (!tileAA) { throw new Error("Test setup error: Tile 'AA' not found."); }
// Find Tile BB needed for the specific test, ensure it exists
const tileBB = VOLTA_TILE_DEFINITIONS.find(t => t.properties.id === 'BB');
if (!tileBB) { throw new Error("Test setup error: Tile 'BB' not found."); }


describe('VoltaDepthService', () => {
  let service: VoltaDepthService;
  let cacheManager: Cache;
  let dataSource: DataSource;

  beforeEach(async () => {
     const module: TestingModule = await Test.createTestingModule({
      providers: [
        VoltaDepthService,
        Logger,
        { provide: getRepositoryToken(VoltaDepthTile), useValue: mockTileRepository },
        { provide: getRepositoryToken(VoltaDepthTileFeature), useValue: mockFeatureRepository },
        { provide: DataSource, useValue: mockDataSource },
        { provide: CACHE_MANAGER, useValue: mockCacheManager },
      ],
    }).compile();

    service = module.get<VoltaDepthService>(VoltaDepthService);
    cacheManager = module.get<Cache>(CACHE_MANAGER);
    dataSource = module.get<DataSource>(DataSource);

    // Clear all mocks state (like call counts) before each test
    jest.clearAllMocks();
    // Reset mock return values if needed globally, like UUID
    (uuidv4 as jest.Mock).mockReturnValue('mock-upload-uuid-123');
  });

  // ADDED afterEach to restore mocks created with jest.spyOn
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

   describe('processUpload', () => {
    // This beforeEach sets up mocks for MOST tests in this describe block.
    // Specific tests might override these mocks.
    // These mocks will be restored by the outer afterEach block.
    beforeEach(() => {
         // Default turf mocks
         jest.spyOn(turf, 'pointOnFeature').mockReturnValue({ type: 'Feature', geometry: { type: 'Point', coordinates: [-1.4, 8.8] }, properties: {} });
         jest.spyOn(turf, 'booleanPointInPolygon').mockImplementation((point, polygon) => {
             // Default behavior: only match Tile AA's geometry
             return polygon === tileAA.geometry;
         });
    });

    it('should process valid GeoJSON for a new tile successfully', async () => {
        const mockFile = createMockFile(validGeoJson);
        mockTileRepository.findOneBy.mockResolvedValue(null);

        const result = await service.processUpload(mockFile);

        expect(mockTileRepository.findOneBy).toHaveBeenCalledWith({ id: 'AA' });
        expect(cacheManager.set).toHaveBeenCalledWith('mock-upload-uuid-123', { tileId: 'AA', geoJson: validGeoJson }, 900);
        expect(result).toEqual({ uploadId: 'mock-upload-uuid-123', deducedTileId: 'AA', isUpdate: false, featureCount: 2, message: expect.any(String), currentVersion: undefined });
        expect(turf.pointOnFeature).toHaveBeenCalledTimes(2);
        expect(turf.booleanPointInPolygon).toHaveBeenCalled();
    });

     it('should process valid GeoJSON for an existing tile successfully', async () => {
       const mockFile = createMockFile(validGeoJson);
       const existingTile = { id: 'AA', version: 3 } as VoltaDepthTile;
       mockTileRepository.findOneBy.mockResolvedValue(existingTile);

       const result = await service.processUpload(mockFile);

       expect(mockTileRepository.findOneBy).toHaveBeenCalledWith({ id: 'AA' });
       expect(cacheManager.set).toHaveBeenCalledWith('mock-upload-uuid-123', { tileId: 'AA', geoJson: validGeoJson }, 900);
       expect(result).toEqual({ uploadId: 'mock-upload-uuid-123', deducedTileId: 'AA', isUpdate: true, featureCount: 2, message: expect.any(String), currentVersion: 3 });
       expect(turf.pointOnFeature).toHaveBeenCalledTimes(2);
       expect(turf.booleanPointInPolygon).toHaveBeenCalled();
    });

    it('should throw BadRequestException for invalid JSON', async () => {
        const mockFile = { ...createMockFile({}), buffer: Buffer.from('{invalid json') };
        await expect(service.processUpload(mockFile)).rejects.toThrow(BadRequestException);
        expect(cacheManager.set).not.toHaveBeenCalled();
        expect(turf.pointOnFeature).not.toHaveBeenCalled();
        expect(turf.booleanPointInPolygon).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if not a FeatureCollection', async () => {
        const mockFile = createMockFile({ type: 'Feature', properties: {}, geometry: null });
        await expect(service.processUpload(mockFile)).rejects.toThrow(/Invalid GeoJSON structure: Must be a FeatureCollection/);
         expect(cacheManager.set).not.toHaveBeenCalled();
         expect(turf.pointOnFeature).not.toHaveBeenCalled();
         expect(turf.booleanPointInPolygon).not.toHaveBeenCalled();
    });

     it('should throw BadRequestException if features array is empty', async () => {
        const mockFile = createMockFile({ type: 'FeatureCollection', features: [] });
        await expect(service.processUpload(mockFile)).rejects.toThrow(/GeoJSON file contains no features/);
         expect(cacheManager.set).not.toHaveBeenCalled();
         expect(turf.pointOnFeature).not.toHaveBeenCalled();
         expect(turf.booleanPointInPolygon).not.toHaveBeenCalled();
    });

     it('should throw BadRequestException if geometry type is wrong', async () => {
        const invalidGeoJson = {
            type: 'FeatureCollection',
            features: [{
                type: 'Feature',
                properties: { fid: 1 },
                geometry: { type: 'Point', coordinates: [-1.4, 8.8] }
            }]
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any;
        const mockFile = createMockFile(invalidGeoJson);

        await expect(service.processUpload(mockFile)).rejects.toThrow(/Expected 'MultiPolygon'/);
        expect(cacheManager.set).not.toHaveBeenCalled();
        expect(turf.pointOnFeature).not.toHaveBeenCalled();
        expect(turf.booleanPointInPolygon).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if features are outside known tiles', async () => {
        const mockFile = createMockFile(validGeoJson);
        // *** Override the default turf mock for this specific test ***
        jest.spyOn(turf, 'booleanPointInPolygon').mockReturnValue(false);

        await expect(service.processUpload(mockFile)).rejects.toThrow(/does not fall within any known tile boundary/);

        expect(cacheManager.set).not.toHaveBeenCalled();
        expect(turf.pointOnFeature).toHaveBeenCalledTimes(1);
        expect(turf.booleanPointInPolygon).toHaveBeenCalled(); // It was called, but returned false
    });

     it('should throw BadRequestException if features span multiple tiles', async () => {
        const mockFile = createMockFile(validGeoJson); // Contains 2 features

        // *** Override the mock specifically for this test ***
        // Mock the service's own method to control its output directly.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const findTileSpy = jest.spyOn(service as any, 'findTileForFeature')
            .mockReturnValueOnce('AA') // Mock return value for the first feature
            .mockReturnValueOnce('BB'); // Mock return value for the second feature

        await expect(service.processUpload(mockFile)).rejects.toThrow(/All features must belong to the same tile/);

        expect(findTileSpy).toHaveBeenCalledTimes(2);
        expect(cacheManager.set).not.toHaveBeenCalled();
        // Since findTileForFeature was mocked, the actual turf methods inside it were NOT called.
        // Use the mocks set in the beforeEach for this block
        expect(turf.pointOnFeature).not.toHaveBeenCalled();
        expect(turf.booleanPointInPolygon).not.toHaveBeenCalled();
    });

  });

  describe('commitUpload', () => {
     const uploadId = 'mock-upload-uuid-123';
    const tileId = 'AA';
    const tempUploadData = { tileId, geoJson: validGeoJson };

    it('should commit new tile data successfully', async () => {
        mockCacheManager.get.mockResolvedValue(tempUploadData);
        mockTileRepository.findOneBy.mockResolvedValue(null);
        mockQueryRunner.manager.delete.mockResolvedValue({ affected: 0 });
        mockQueryRunner.manager.save
            .mockResolvedValueOnce(undefined)
            .mockResolvedValueOnce({ id: tileId, numberOfFeatures: 2, version: 1, created: new Date(), lastUpdated: new Date() });

        const result = await service.commitUpload(uploadId);

        expect(cacheManager.get).toHaveBeenCalledWith(uploadId);
        expect(dataSource.createQueryRunner).toHaveBeenCalled();
        expect(mockQueryRunner.connect).toHaveBeenCalled();
        expect(mockQueryRunner.startTransaction).toHaveBeenCalled();
        expect(mockQueryRunner.manager.delete).toHaveBeenCalledWith(VoltaDepthTileFeature, { tileId });
        expect(mockQueryRunner.manager.save).toHaveBeenCalledWith(VoltaDepthTileFeature, expect.any(Array), { chunk: 100 });
        expect(mockQueryRunner.manager.save).toHaveBeenCalledWith(VoltaDepthTile, { id: tileId, numberOfFeatures: 2, version: 1 });
        expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
        expect(mockQueryRunner.rollbackTransaction).not.toHaveBeenCalled();
        expect(cacheManager.del).toHaveBeenCalledWith(uploadId);
        expect(mockQueryRunner.release).toHaveBeenCalled();
        expect(result.version).toBe(1);
        expect(result.id).toBe(tileId);
    });

     it('should commit updated tile data successfully and increment version', async () => {
        const existingTile = { id: tileId, version: 2, numberOfFeatures: 99, created: new Date(), lastUpdated: new Date() } as VoltaDepthTile;
        mockCacheManager.get.mockResolvedValue(tempUploadData);
        mockTileRepository.findOneBy.mockResolvedValue(existingTile);
        mockQueryRunner.manager.delete.mockResolvedValue({ affected: 99 });
        mockQueryRunner.manager.save
            .mockResolvedValueOnce(undefined)
            .mockResolvedValueOnce({ id: tileId, numberOfFeatures: 2, version: 3, created: existingTile.created, lastUpdated: new Date() });

        const result = await service.commitUpload(uploadId);

        expect(cacheManager.get).toHaveBeenCalledWith(uploadId);
        expect(mockTileRepository.findOneBy).toHaveBeenCalledWith({ id: tileId });
        expect(mockQueryRunner.manager.delete).toHaveBeenCalledWith(VoltaDepthTileFeature, { tileId });
        expect(mockQueryRunner.manager.save).toHaveBeenCalledWith(VoltaDepthTileFeature, expect.any(Array), { chunk: 100 });
        expect(mockQueryRunner.manager.save).toHaveBeenCalledWith(VoltaDepthTile, { id: tileId, numberOfFeatures: 2, version: 3 });
        expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
        expect(mockQueryRunner.rollbackTransaction).not.toHaveBeenCalled();
        expect(cacheManager.del).toHaveBeenCalledWith(uploadId);
        expect(mockQueryRunner.release).toHaveBeenCalled();
        expect(result.version).toBe(3);
    });

    it('should throw NotFoundException if uploadId not found in cache', async () => {
        mockCacheManager.get.mockResolvedValue(null);
        await expect(service.commitUpload(uploadId)).rejects.toThrow(NotFoundException);
        expect(cacheManager.get).toHaveBeenCalledWith(uploadId);
        expect(dataSource.createQueryRunner).not.toHaveBeenCalled();
        expect(cacheManager.del).not.toHaveBeenCalled();
    });

    it('should rollback transaction and throw InternalServerErrorException on database error during feature save', async () => {
        mockCacheManager.get.mockResolvedValue(tempUploadData);
        mockTileRepository.findOneBy.mockResolvedValue(null);
        const dbError = new Error('DB connection failed');
        mockQueryRunner.manager.save.mockRejectedValueOnce(dbError);

        await expect(service.commitUpload(uploadId)).rejects.toThrow(InternalServerErrorException);

        expect(cacheManager.get).toHaveBeenCalledWith(uploadId);
        expect(dataSource.createQueryRunner).toHaveBeenCalled();
        expect(mockQueryRunner.startTransaction).toHaveBeenCalled();
        expect(mockQueryRunner.manager.delete).toHaveBeenCalled();
        expect(mockQueryRunner.manager.save).toHaveBeenCalledTimes(1);
        expect(mockQueryRunner.commitTransaction).not.toHaveBeenCalled();
        expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
        expect(cacheManager.del).not.toHaveBeenCalled();
        expect(mockQueryRunner.release).toHaveBeenCalled();
    });

     it('should rollback transaction and throw InternalServerErrorException on database error during tile metadata save', async () => {
        mockCacheManager.get.mockResolvedValue(tempUploadData);
        mockTileRepository.findOneBy.mockResolvedValue(null);
        const dbError = new Error('DB connection failed');
        mockQueryRunner.manager.save
            .mockResolvedValueOnce(undefined)
            .mockRejectedValueOnce(dbError);

        await expect(service.commitUpload(uploadId)).rejects.toThrow(InternalServerErrorException);

        expect(cacheManager.get).toHaveBeenCalledWith(uploadId);
        expect(dataSource.createQueryRunner).toHaveBeenCalled();
        expect(mockQueryRunner.startTransaction).toHaveBeenCalled();
        expect(mockQueryRunner.manager.delete).toHaveBeenCalled();
        expect(mockQueryRunner.manager.save).toHaveBeenCalledTimes(2);
        expect(mockQueryRunner.commitTransaction).not.toHaveBeenCalled();
        expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
        expect(cacheManager.del).not.toHaveBeenCalled();
        expect(mockQueryRunner.release).toHaveBeenCalled();
    });
  });

  describe('listTiles', () => {
     it('should return an array mapped to TileInfoDto', async () => {
        const mockTiles = [
            { id: 'AA', numberOfFeatures: 10, created: new Date(), lastUpdated: new Date(), version: 1 },
            { id: 'BB', numberOfFeatures: 20, created: new Date(), lastUpdated: new Date(), version: 3 }
        ] as VoltaDepthTile[];
        mockTileRepository.find.mockResolvedValue(mockTiles);

        const result = await service.listTiles();

        expect(mockTileRepository.find).toHaveBeenCalledWith({ order: { id: 'ASC' } });
        expect(result).toHaveLength(2);
        expect(result[0]).toEqual(expect.objectContaining({ id: 'AA', numberOfFeatures: 10, version: 1 }));
        expect(result[1]).toEqual(expect.objectContaining({ id: 'BB', numberOfFeatures: 20, version: 3 }));
        expect(result[0].created).toBeInstanceOf(Date);
        expect(result[0].lastUpdated).toBeInstanceOf(Date);
    });

     it('should return an empty array if no tiles exist', async () => {
        mockTileRepository.find.mockResolvedValue([]);
        const result = await service.listTiles();
        expect(mockTileRepository.find).toHaveBeenCalledWith({ order: { id: 'ASC' } });
        expect(result).toEqual([]);
    });
  });

  describe('getTileInfo', () => {
      it('should return mapped TileInfoDto for a valid tileId', async () => {
          const tileId = 'AA';
          const mockTile = { id: 'AA', numberOfFeatures: 10, created: new Date(), lastUpdated: new Date(), version: 2 } as VoltaDepthTile;
          mockTileRepository.findOneBy.mockResolvedValue(mockTile);

          const result = await service.getTileInfo(tileId);

          expect(mockTileRepository.findOneBy).toHaveBeenCalledWith({ id: tileId });
          expect(result).toEqual({
              id: mockTile.id,
              numberOfFeatures: mockTile.numberOfFeatures,
              created: mockTile.created,
              lastUpdated: mockTile.lastUpdated,
              version: mockTile.version,
          });
      });

       it('should throw NotFoundException for an invalid tileId', async () => {
          const tileId = 'ZZ';
          mockTileRepository.findOneBy.mockResolvedValue(null);

          await expect(service.getTileInfo(tileId)).rejects.toThrow(NotFoundException);
          await expect(service.getTileInfo(tileId)).rejects.toThrow(`Tile with ID '${tileId}' not found.`);

          expect(mockTileRepository.findOneBy).toHaveBeenCalledWith({ id: tileId });
      });
  });

  // Optional: Test the private findTileForFeature method using REAL turf functions
  describe('findTileForFeature (private method test - optional)', () => {
      // NO beforeEach here, we want the original turf functions restored by the outer afterEach

      it('should return the correct tile ID for a feature within AA', () => {
          const featureInAA: Feature<MultiPolygon> = {
              type: 'Feature',
              properties: {},
              geometry: { type: 'MultiPolygon', coordinates: [ [[[-1.4, 8.8], [-1.3, 8.8], [-1.3, 8.9], [-1.4, 8.9], [-1.4, 8.8]]], ] },
          };
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const result = (service as any).findTileForFeature(featureInAA);
          // This assertion now uses the REAL turf functions because mocks were restored
          expect(result).toBe('AA');
      });

      it('should return null for a feature outside all tiles', () => {
           const featureOutside: Feature<MultiPolygon> = {
              type: 'Feature',
              properties: {},
              geometry: { type: 'MultiPolygon', coordinates: [ [[[10, 10], [11, 10], [11, 11], [10, 11], [10, 10]]], ] },
           };
           // eslint-disable-next-line @typescript-eslint/no-explicit-any
           const result = (service as any).findTileForFeature(featureOutside);
           // This assertion now uses the REAL turf functions because mocks were restored
           expect(result).toBeNull(); // <-- This should now pass
      });
  })

});