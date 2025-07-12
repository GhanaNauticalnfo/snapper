import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, EntityManager, MoreThan } from 'typeorm';
import { SyncService } from './sync.service';
import { SyncLog } from './sync-log.entity';
import { SyncVersion } from './sync-version.entity';
import { MqttSyncService } from './mqtt-sync.service';

describe('SyncService', () => {
  let service: SyncService;
  let repository: Repository<SyncLog>;
  let versionRepository: Repository<SyncVersion>;
  let mqttSyncService: jest.Mocked<MqttSyncService>;
  let mockEntityManager: Partial<EntityManager>;

  const mockSyncLog = {
    id: 1,
    entity_type: 'route',
    entity_id: '123',
    action: 'create',
    data: { test: 'data' },
    created_at: new Date('2025-01-01T12:00:00Z'),
    is_latest: true,
    major_version: 1,
  };

  const mockSyncVersion = {
    id: 1,
    major_version: 1,
    created_at: new Date('2025-01-01T00:00:00Z'),
    is_current: true,
  };

  beforeEach(async () => {
    mockEntityManager = {
      update: jest.fn().mockResolvedValue(undefined),
      save: jest.fn().mockResolvedValue(mockSyncLog),
      find: jest.fn().mockResolvedValue([mockSyncLog]),
      findOne: jest.fn().mockResolvedValue(mockSyncVersion),
    };

    const mockRepository = {
      find: jest.fn(),
      manager: {
        transaction: jest.fn((callback) => callback(mockEntityManager)),
      },
    };

    const mockVersionRepository = {
      findOne: jest.fn().mockResolvedValue(mockSyncVersion),
    };

    const mockMqttSyncService = {
      publishSyncNotification: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SyncService,
        {
          provide: getRepositoryToken(SyncLog),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(SyncVersion),
          useValue: mockVersionRepository,
        },
        {
          provide: MqttSyncService,
          useValue: mockMqttSyncService,
        },
      ],
    }).compile();

    service = module.get<SyncService>(SyncService);
    repository = module.get<Repository<SyncLog>>(getRepositoryToken(SyncLog));
    versionRepository = module.get<Repository<SyncVersion>>(getRepositoryToken(SyncVersion));
    mqttSyncService = module.get(MqttSyncService);
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
          major_version: 1,
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
      expect(result.majorVersion).toBe(1);
    });

    it('should return empty array when no changes', async () => {
      const sinceDate = new Date('2025-01-01T00:00:00Z');
      jest.spyOn(repository, 'find').mockResolvedValue([]);

      const result = await service.getChangesSince(sinceDate);

      expect(result.data).toHaveLength(0);
      expect(result.version).toBeDefined();
      expect(result.majorVersion).toBe(1);
    });
  });

  describe('logChange', () => {
    it('should log a create action with data and publish MQTT notification', async () => {
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
        major_version: 1,
      });
      
      // Should publish MQTT notification after transaction
      expect(mqttSyncService.publishSyncNotification).toHaveBeenCalledWith(1, 1);
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
        major_version: 1,
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
        major_version: 1,
      });
    });

    it('should handle transaction errors', async () => {
      const error = new Error('Transaction failed');
      repository.manager.transaction = jest.fn().mockRejectedValue(error);

      await expect(
        service.logChange('route', '123', 'create', {})
      ).rejects.toThrow('Transaction failed');
      
      // MQTT should not be called on transaction failure
      expect(mqttSyncService.publishSyncNotification).not.toHaveBeenCalled();
    });

    it('should handle MQTT publish errors gracefully', async () => {
      mqttSyncService.publishSyncNotification.mockRejectedValue(new Error('MQTT failed'));
      
      // Should not throw even if MQTT fails
      await expect(
        service.logChange('route', '123', 'create', {})
      ).resolves.not.toThrow();
      
      expect(mqttSyncService.publishSyncNotification).toHaveBeenCalled();
    });
  });

  describe('getCurrentMajorVersion', () => {
    it('should return current major version', async () => {
      const version = await service.getCurrentMajorVersion();
      
      expect(versionRepository.findOne).toHaveBeenCalledWith({
        where: { is_current: true },
      });
      expect(version).toBe(1);
    });

    it('should return 1 when no version exists', async () => {
      jest.spyOn(versionRepository, 'findOne').mockResolvedValue(null);
      
      const version = await service.getCurrentMajorVersion();
      
      expect(version).toBe(1);
    });
  });

  describe('resetSync', () => {
    it('should create new major version and reset sync log', async () => {
      const mockCurrentEntities = [
        { ...mockSyncLog, action: 'create' },
        { ...mockSyncLog, id: 2, entity_id: '456', action: 'update' },
        { ...mockSyncLog, id: 3, entity_id: '789', action: 'delete', data: null },
      ];

      mockEntityManager.find = jest.fn().mockResolvedValue(mockCurrentEntities);
      mockEntityManager.save = jest.fn()
        .mockResolvedValueOnce({ ...mockSyncVersion, major_version: 2 })
        .mockResolvedValue(mockSyncLog);

      const result = await service.resetSync();

      // Should mark old version as not current
      expect(mockEntityManager.update).toHaveBeenCalledWith(
        SyncVersion,
        { id: 1 },
        { is_current: false }
      );

      // Should create new major version
      expect(mockEntityManager.save).toHaveBeenCalledWith(SyncVersion, {
        major_version: 2,
        is_current: true,
      });

      // Should mark all sync logs as not latest
      expect(mockEntityManager.update).toHaveBeenCalledWith(
        SyncLog,
        { is_latest: true },
        { is_latest: false }
      );

      // Should create new entries for non-deleted entities
      expect(mockEntityManager.save).toHaveBeenCalledTimes(3); // 1 for version + 2 for entities
      
      expect(result.success).toBe(true);
      expect(result.majorVersion).toBe(1); // Returns from getCurrentMajorVersion
    });

    it('should handle first major version creation', async () => {
      mockEntityManager.findOne = jest.fn().mockResolvedValue(null);
      mockEntityManager.find = jest.fn().mockResolvedValue([]);

      const result = await service.resetSync();

      expect(mockEntityManager.save).toHaveBeenCalledWith(SyncVersion, {
        major_version: 1,
        is_current: true,
      });
      
      expect(result.success).toBe(true);
    });
  });

  describe('logChangeInTransaction', () => {
    it('should publish MQTT notification within transaction', async () => {
      const manager = mockEntityManager as EntityManager;
      const entityType = 'route';
      const entityId = '999';
      const action = 'create' as const;
      const data = { name: 'Transaction Test' };

      const result = await service.logChangeInTransaction(
        manager,
        entityType,
        entityId,
        action,
        data
      );

      expect(manager.update).toHaveBeenCalled();
      expect(manager.save).toHaveBeenCalled();
      expect(mqttSyncService.publishSyncNotification).toHaveBeenCalledWith(1, 1);
      expect(result).toEqual(mockSyncLog);
    });

    it('should use provided major version', async () => {
      const manager = mockEntityManager as EntityManager;
      const providedMajorVersion = 5;

      await service.logChangeInTransaction(
        manager,
        'route',
        '123',
        'update',
        {},
        providedMajorVersion
      );

      expect(manager.save).toHaveBeenCalledWith(SyncLog, expect.objectContaining({
        major_version: providedMajorVersion,
      }));
      expect(mqttSyncService.publishSyncNotification).toHaveBeenCalledWith(5, 1);
    });

    it('should handle MQTT errors within transaction gracefully', async () => {
      const manager = mockEntityManager as EntityManager;
      mqttSyncService.publishSyncNotification.mockRejectedValue(new Error('MQTT failed'));

      const result = await service.logChangeInTransaction(
        manager,
        'route',
        '123',
        'create',
        {}
      );

      // Should still return the sync log even if MQTT fails
      expect(result).toEqual(mockSyncLog);
      expect(mqttSyncService.publishSyncNotification).toHaveBeenCalled();
    });
  });
});