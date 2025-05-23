import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { RouteService } from './route.service';
import { Route } from './route.entity';
import { SyncService } from '../sync/sync.service';

describe('RouteService', () => {
  let service: RouteService;
  let repository: Repository<Route>;
  let syncService: SyncService;

  const mockRoute: Partial<Route> = {
    id: 1,
    name: 'Test Route',
    description: 'Test Description',
    waypoints: [
      { lat: 5.5509, lng: -0.1975, order: 1 },
      { lat: 5.5609, lng: -0.1875, order: 2 },
    ],
    color: '#FF0000',
    enabled: true,
    created: new Date('2025-01-01T12:00:00Z'),
    last_updated: new Date('2025-01-01T12:00:00Z'),
  };

  const mockRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
  };

  const mockSyncService = {
    logChange: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RouteService,
        {
          provide: getRepositoryToken(Route),
          useValue: mockRepository,
        },
        {
          provide: SyncService,
          useValue: mockSyncService,
        },
      ],
    }).compile();

    service = module.get<RouteService>(RouteService);
    repository = module.get<Repository<Route>>(getRepositoryToken(Route));
    syncService = module.get<SyncService>(SyncService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return an array of routes', async () => {
      const routes = [mockRoute as Route];
      mockRepository.find.mockResolvedValue(routes);

      const result = await service.findAll();

      expect(repository.find).toHaveBeenCalledWith({
        order: { last_updated: 'DESC' },
      });
      expect(result).toEqual(routes);
    });
  });

  describe('findOne', () => {
    it('should return a route by id', async () => {
      mockRepository.findOne.mockResolvedValue(mockRoute);

      const result = await service.findOne(1);

      expect(repository.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(result).toEqual(mockRoute);
    });

    it('should throw NotFoundException when route not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create a route and log to sync', async () => {
      const createData = {
        name: 'New Route',
        waypoints: [{ lat: 5.5, lng: -0.2, order: 1 }],
      };
      const createdRoute = { ...mockRoute, ...createData };

      mockRepository.create.mockReturnValue(createdRoute);
      mockRepository.save.mockResolvedValue(createdRoute);

      const result = await service.create(createData);

      expect(repository.create).toHaveBeenCalledWith(createData);
      expect(repository.save).toHaveBeenCalledWith(createdRoute);
      expect(syncService.logChange).toHaveBeenCalledWith(
        'route',
        '1',
        'create',
        expect.objectContaining({
          type: 'Feature',
          id: 1,
          geometry: expect.objectContaining({
            type: 'LineString',
            coordinates: [[-0.2, 5.5]],
          }),
          properties: expect.objectContaining({
            name: 'New Route',
          }),
        })
      );
      expect(result).toEqual(createdRoute);
    });
  });

  describe('update', () => {
    it('should update a route and log to sync', async () => {
      const updateData = { name: 'Updated Route' };
      const updatedRoute = { ...mockRoute, ...updateData };

      mockRepository.findOne.mockResolvedValue(mockRoute);
      mockRepository.save.mockResolvedValue(updatedRoute);

      const result = await service.update(1, updateData);

      expect(repository.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(repository.save).toHaveBeenCalledWith(expect.objectContaining(updateData));
      expect(syncService.logChange).toHaveBeenCalledWith(
        'route',
        '1',
        'update',
        expect.objectContaining({
          type: 'Feature',
          geometry: expect.any(Object),
          properties: expect.objectContaining({
            name: 'Updated Route',
          }),
        })
      );
      expect(result).toEqual(updatedRoute);
    });

    it('should throw NotFoundException when route not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.update(999, {})).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should remove a route and log to sync', async () => {
      mockRepository.findOne.mockResolvedValue(mockRoute);
      mockRepository.remove.mockResolvedValue(mockRoute);

      await service.remove(1);

      expect(repository.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(repository.remove).toHaveBeenCalledWith(mockRoute);
      expect(syncService.logChange).toHaveBeenCalledWith(
        'route',
        '1',
        'delete'
      );
    });

    it('should throw NotFoundException when route not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.remove(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('convertToGeoJson', () => {
    it('should convert route to valid GeoJSON', async () => {
      // Create a route service instance to test the private method
      const testRoute: Route = {
        id: 1,
        name: 'Test Route',
        description: 'Test',
        waypoints: [
          { lat: 5.5, lng: -0.2, order: 2 },
          { lat: 5.6, lng: -0.1, order: 1 },
          { lat: 5.7, lng: -0.3, order: 3 },
        ],
        color: '#FF0000',
        enabled: true,
        created: new Date(),
        last_updated: new Date(),
      };

      mockRepository.create.mockReturnValue(testRoute);
      mockRepository.save.mockResolvedValue(testRoute);

      await service.create(testRoute);

      // Check that sync was called with properly sorted waypoints
      expect(syncService.logChange).toHaveBeenCalledWith(
        'route',
        '1',
        'create',
        expect.objectContaining({
          geometry: {
            type: 'LineString',
            coordinates: [
              [-0.1, 5.6], // order: 1
              [-0.2, 5.5], // order: 2
              [-0.3, 5.7], // order: 3
            ],
          },
        })
      );
    });
  });
});