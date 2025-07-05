// apps/api/src/app/volta-depth/volta-depth.controller.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { VoltaDepthController } from './volta-depth.controller';
import { VoltaDepthService } from './volta-depth.service';
import { CommitUploadDto } from './dto/commit-upload.dto';
import { UploadResponseDto } from './dto/upload-response.dto';
import { TileInfoDto } from './dto/tile-info.dto';
import { VoltaDepthTile } from './entities/volta-depth-tile.entity';
import { Express } from 'express';
import { Readable } from 'stream';

// Explicitly type the mock service
const mockVoltaDepthService: Partial<Record<keyof VoltaDepthService, jest.Mock>> = {
  processUpload: jest.fn(),
  commitUpload: jest.fn(),
  listTiles: jest.fn(),
  getTileInfo: jest.fn(),
};

const mockFile: Express.Multer.File = {
  fieldname: 'file',
  originalname: 'test.geojson',
  encoding: '7bit',
  mimetype: 'application/json',
  size: 1024,
  buffer: Buffer.from(JSON.stringify({ type: 'FeatureCollection', features: [] })),
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  stream: new Readable({ read() {} }),
  destination: '',
  filename: '',
  path: '',
};


describe('VoltaDepthController', () => {
  let controller: VoltaDepthController;
  let service: VoltaDepthService; // Keep and USE this service reference

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [VoltaDepthController],
      providers: [
        {
          provide: VoltaDepthService,
          useValue: mockVoltaDepthService, // Provide the mock object
        },
      ],
    }).compile();

    controller = module.get<VoltaDepthController>(VoltaDepthController);
    // Get the instance provided (which is our mock object, but typed as the service)
    service = module.get<VoltaDepthService>(VoltaDepthService);

    // Clear mocks using the mock object directly is fine, or use service methods if needed later
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // --- Test POST /upload ---
  describe('uploadFile', () => {
    it('should call service.processUpload and return result', async () => {
      // Initialize with all required properties
      const expectedResult: UploadResponseDto = {
        uploadId: 'test-uuid',
        deducedTileId: 'AA',
        isUpdate: false,
        featureCount: 5,
        message: 'Validated successfully...',
        // currentVersion is optional, so undefined is okay here
      };
      // Use the service variable (typed as VoltaDepthService) to set up mock
      // but cast the method to jest.Mock to access mockResolvedValue
      (service.processUpload as jest.Mock).mockResolvedValue(expectedResult);

      const result = await controller.uploadFile(mockFile);

      // Expect call on the service variable
      expect(service.processUpload).toHaveBeenCalledWith(mockFile);
      expect(result).toEqual(expectedResult);
    });

     it('should let service handle errors during upload processing', async () => {
      const errorMessage = 'Invalid GeoJSON';
      (service.processUpload as jest.Mock).mockRejectedValue(new Error(errorMessage));

      await expect(controller.uploadFile(mockFile)).rejects.toThrow(errorMessage);
      expect(service.processUpload).toHaveBeenCalledWith(mockFile);
    });
  });

  // --- Test POST /commit ---
  describe('commitUpload', () => {
    it('should call service.commitUpload with uploadId and return success message', async () => {
      const commitDto: CommitUploadDto = { uploadId: 'test-uuid' };
      const mockTileResult = { id: 'AA', version: 1 } as VoltaDepthTile;
      const expectedResponse = { message: 'Tile data committed successfully.', tileId: 'AA' };

      (service.commitUpload as jest.Mock).mockResolvedValue(mockTileResult);

      const result = await controller.commitUpload(commitDto);

      expect(service.commitUpload).toHaveBeenCalledWith(commitDto.uploadId);
      expect(result).toEqual(expectedResponse);
    });

     it('should let service handle errors during commit processing', async () => {
      const commitDto: CommitUploadDto = { uploadId: 'expired-uuid' };
      const errorMessage = 'Upload session not found';
      (service.commitUpload as jest.Mock).mockRejectedValue(new Error(errorMessage));

      await expect(controller.commitUpload(commitDto)).rejects.toThrow(errorMessage);
      expect(service.commitUpload).toHaveBeenCalledWith(commitDto.uploadId);
    });
  });

  // --- Test GET /tiles ---
  describe('listTiles', () => {
    it('should call service.listTiles and return an array of TileInfoDto', async () => {
      // Initialize with placeholder values satisfying the type
      const expectedResult: TileInfoDto[] = [
        { id: 'AA', numberOfFeatures: 0, created: new Date(), lastUpdated: new Date(), version: 0 },
        { id: 'AB', numberOfFeatures: 0, created: new Date(), lastUpdated: new Date(), version: 0 },
      ];
      // Assign specific test values
      expectedResult[0] = { id: 'AA', numberOfFeatures: 10, created: new Date(), lastUpdated: new Date(), version: 1 };
      expectedResult[1] = { id: 'AB', numberOfFeatures: 15, created: new Date(), lastUpdated: new Date(), version: 2 };

      (service.listTiles as jest.Mock).mockResolvedValue(expectedResult);

      const result = await controller.listTiles();

      expect(service.listTiles).toHaveBeenCalledTimes(1);
      expect(result).toEqual(expectedResult);
    });
  });

  // --- Test GET /tiles/:tileId ---
  describe('getTileInfo', () => {
    it('should call service.getTileInfo with tileId and return TileInfoDto', async () => {
      const tileId = 'AA';
      // Initialize with placeholder values
      const expectedResult: TileInfoDto = {
          id: 'AA', numberOfFeatures: 0, created: new Date(), lastUpdated: new Date(), version: 0
      };
      // Assign specific test values
       expectedResult.numberOfFeatures = 10; expectedResult.version = 1;

      (service.getTileInfo as jest.Mock).mockResolvedValue(expectedResult);

      const result = await controller.getTileInfo(tileId);

      expect(service.getTileInfo).toHaveBeenCalledWith(tileId);
      expect(result).toEqual(expectedResult);
    });

     it('should let service handle not found errors for getTileInfo', async () => {
      const tileId = 'ZZ';
      const errorMessage = `Tile with ID '${tileId}' not found.`;
      (service.getTileInfo as jest.Mock).mockRejectedValue(new Error(errorMessage));

      await expect(controller.getTileInfo(tileId)).rejects.toThrow(errorMessage);
      expect(service.getTileInfo).toHaveBeenCalledWith(tileId);
    });
  });
});