import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, EntityManager, MoreThan } from 'typeorm';
import { SyncService } from './sync.service';
import { SyncLog } from './sync-log.entity';

describe('SyncService', () => {
  let service: SyncService;
  let repository: Repository<SyncLog>;
  let mockEntityManager: Partial<EntityManager>;

  const mockSyncLog = {
    id: 1,
    entity_type: 'route',
    entity_id: '123',
    action: 'create',
    data: { test: 'data' },
    created_at: new Date('2025-01-01T12:00:00Z'),
    is_latest: true,
  };

  beforeEach(async () => {
    mockEntityManager = {
      update: jest.fn().mockResolvedValue(undefined),
      save: jest.fn().mockResolvedValue(mockSyncLog),
    };

    const mockRepository = {
      find: jest.fn(),
      manager: {
        transaction: jest.fn((callback) => callback(mockEntityManager)),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SyncService,
        {
          provide: getRepositoryToken(SyncLog),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<SyncService>(SyncService);
    repository = module.get<Repository<SyncLog>>(getRepositoryToken(SyncLog));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getChangesSince', () => {
    it('should return changes since given date', async () => {
      const sinceDate = new Date('2025-01-01T00:00:00Z');
      const mockChanges = [
        {
          ...mockSyncLog,
          created_at: new Date('2025-01-01T12:00:00Z'),
        },
        {
          ...mockSyncLog,
          id: 2,
          entity_id: '456',
          action: 'update',
          created_at: new Date('2025-01-01T13:00:00Z'),
        },
      ];

      jest.spyOn(repository, 'find').mockResolvedValue(mockChanges as SyncLog[]);

      const result = await service.getChangesSince(sinceDate);

      expect(repository.find).toHaveBeenCalledWith({
        where: {
          created_at: MoreThan(sinceDate),
          is_latest: true,
        },
        order: {
          created_at: 'ASC',
          id: 'ASC',
        },
      });

      expect(result.data).toHaveLength(2);
      expect(result.data[0]).toEqual({
        entity_type: 'route',
        entity_id: '123',
        action: 'create',
        data: { test: 'data' },
      });
      expect(result.version).toBeDefined();
      expect(new Date(result.version)).toBeInstanceOf(Date);
    });

    it('should return empty array when no changes', async () => {
      const sinceDate = new Date('2025-01-01T00:00:00Z');
      jest.spyOn(repository, 'find').mockResolvedValue([]);

      const result = await service.getChangesSince(sinceDate);

      expect(result.data).toHaveLength(0);
      expect(result.version).toBeDefined();
    });
  });

  describe('logChange', () => {
    it('should log a create action with data', async () => {
      const entityType = 'route';
      const entityId = '123';
      const action = 'create' as const;
      const data = { name: 'Test Route' };

      await service.logChange(entityType, entityId, action, data);

      expect(repository.manager.transaction).toHaveBeenCalled();
      expect(mockEntityManager.update).toHaveBeenCalledWith(
        SyncLog,
        { entity_id: entityId, entity_type: entityType, is_latest: true },
        { is_latest: false }
      );
      expect(mockEntityManager.save).toHaveBeenCalledWith(SyncLog, {
        entity_type: entityType,
        entity_id: entityId,
        action: action,
        data: data,
        is_latest: true,
      });
    });

    it('should log an update action with data', async () => {
      const entityType = 'route';
      const entityId = '456';
      const action = 'update' as const;
      const data = { name: 'Updated Route' };

      await service.logChange(entityType, entityId, action, data);

      expect(mockEntityManager.save).toHaveBeenCalledWith(SyncLog, {
        entity_type: entityType,
        entity_id: entityId,
        action: action,
        data: data,
        is_latest: true,
      });
    });

    it('should log a delete action without data', async () => {
      const entityType = 'route';
      const entityId = '789';
      const action = 'delete' as const;

      await service.logChange(entityType, entityId, action);

      expect(mockEntityManager.save).toHaveBeenCalledWith(SyncLog, {
        entity_type: entityType,
        entity_id: entityId,
        action: action,
        data: null,
        is_latest: true,
      });
    });

    it('should handle transaction errors', async () => {
      const error = new Error('Transaction failed');
      repository.manager.transaction = jest.fn().mockRejectedValue(error);

      await expect(
        service.logChange('route', '123', 'create', {})
      ).rejects.toThrow('Transaction failed');
    });
  });
});