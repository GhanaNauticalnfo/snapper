import { Test, TestingModule } from '@nestjs/testing';
import { SyncController } from './sync.controller';
import { SyncService } from './sync.service';

describe('SyncController', () => {
  let controller: SyncController;
  let service: SyncService;

  const mockSyncService = {
    getChangesSince: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SyncController],
      providers: [
        {
          provide: SyncService,
          useValue: mockSyncService,
        },
      ],
    }).compile();

    controller = module.get<SyncController>(SyncController);
    service = module.get<SyncService>(SyncService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('syncData', () => {
    it('should call service with date from query parameter', async () => {
      const mockResponse = {
        version: '2025-01-01T12:00:00Z',
        data: [
          {
            entity_type: 'route',
            entity_id: '123',
            action: 'create',
            data: { test: 'data' },
          },
        ],
      };
      mockSyncService.getChangesSince.mockResolvedValue(mockResponse);

      const sinceString = '2025-01-01T00:00:00Z';
      const result = await controller.syncData(sinceString);

      expect(service.getChangesSince).toHaveBeenCalledWith(new Date(sinceString));
      expect(result).toEqual(mockResponse);
    });

    it('should use epoch date when no since parameter provided', async () => {
      const mockResponse = {
        version: '2025-01-01T12:00:00Z',
        data: [],
      };
      mockSyncService.getChangesSince.mockResolvedValue(mockResponse);

      const result = await controller.syncData();

      expect(service.getChangesSince).toHaveBeenCalledWith(new Date(0));
      expect(result).toEqual(mockResponse);
    });

    it('should handle invalid date strings', async () => {
      const mockResponse = {
        version: '2025-01-01T12:00:00Z',
        data: [],
      };
      mockSyncService.getChangesSince.mockResolvedValue(mockResponse);

      const invalidDate = 'invalid-date';
      const result = await controller.syncData(invalidDate);

      // JavaScript Date constructor with invalid string returns Invalid Date
      // which when passed to getChangesSince should be handled
      expect(service.getChangesSince).toHaveBeenCalled();
      const calledDate = mockSyncService.getChangesSince.mock.calls[0][0];
      expect(calledDate.toString()).toBe('Invalid Date');
    });
  });
});