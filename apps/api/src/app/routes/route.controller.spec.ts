import { Test, TestingModule } from '@nestjs/testing';
import { RouteController } from './route.controller';
import { RouteService } from './route.service';
import { RouteResponseDto } from './dto/route-response.dto';
import { RouteInputDto } from './dto/route-input.dto';
import { Route } from './route.entity';
import { NotFoundException } from '@nestjs/common';

describe('RouteController', () => {
  let controller: RouteController;
  let service: RouteService;

  const mockRouteService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  const mockRoute: Route = {
    id: 1,
    name: 'Test Route',
    notes: 'Test Notes',
    waypoints: [
      { id: '1', lat: 5.603717, lng: -0.186964, name: 'Accra', order: 0 },
      { id: '2', lat: 4.921971, lng: -1.774713, name: 'Takoradi', order: 1 },
    ],
    enabled: true,
    created: new Date('2025-01-01T00:00:00Z'),
    last_updated: new Date('2025-01-01T00:00:00Z'),
    toResponseDto: jest.fn().mockReturnValue({
      id: 1,
      name: 'Test Route',
      notes: 'Test Notes',
      waypoints: [
        { id: '1', lat: 5.603717, lng: -0.186964, name: 'Accra', order: 0 },
        { id: '2', lat: 4.921971, lng: -1.774713, name: 'Takoradi', order: 1 },
      ],
      enabled: true,
      created: '2025-01-01T00:00:00.000Z',
      last_updated: '2025-01-01T00:00:00.000Z',
    }),
  } as any;

  const mockRouteResponseDto: RouteResponseDto = {
    id: 1,
    name: 'Test Route',
    notes: 'Test Notes',
    waypoints: [
      { id: '1', lat: 5.603717, lng: -0.186964, name: 'Accra', order: 0 },
      { id: '2', lat: 4.921971, lng: -1.774713, name: 'Takoradi', order: 1 },
    ],
    enabled: true,
    created: '2025-01-01T00:00:00.000Z',
    last_updated: '2025-01-01T00:00:00.000Z',
  };

  const mockRouteInputDto: RouteInputDto = {
    name: 'New Route',
    notes: 'New Route Notes',
    waypoints: [
      { id: '1', lat: 5.603717, lng: -0.186964, name: 'Accra', order: 0 },
      { id: '2', lat: 4.921971, lng: -1.774713, name: 'Takoradi', order: 1 },
    ],
    enabled: true,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RouteController],
      providers: [
        {
          provide: RouteService,
          useValue: mockRouteService,
        },
      ],
    }).compile();

    controller = module.get<RouteController>(RouteController);
    service = module.get<RouteService>(RouteService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return an array of routes', async () => {
      const mockRoutes: RouteResponseDto[] = [
        mockRouteResponseDto,
        {
          ...mockRouteResponseDto,
          id: 2,
          name: 'Second Route',
        },
      ];
      mockRouteService.findAll.mockResolvedValue(mockRoutes);

      const result = await controller.findAll();

      expect(service.findAll).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockRoutes);
    });

    it('should return empty array when no routes exist', async () => {
      mockRouteService.findAll.mockResolvedValue([]);

      const result = await controller.findAll();

      expect(service.findAll).toHaveBeenCalledTimes(1);
      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return a single route by id', async () => {
      const routeId = 1;
      mockRouteService.findOne.mockResolvedValue(mockRouteResponseDto);

      const result = await controller.findOne(routeId);

      expect(service.findOne).toHaveBeenCalledWith(routeId);
      expect(result).toEqual(mockRouteResponseDto);
    });

    it('should let service handle route not found', async () => {
      const routeId = 999;
      const errorMessage = `Route with id ${routeId} not found`;
      mockRouteService.findOne.mockRejectedValue(new NotFoundException(errorMessage));

      await expect(controller.findOne(routeId)).rejects.toThrow(NotFoundException);
      await expect(controller.findOne(routeId)).rejects.toThrow(errorMessage);
      expect(service.findOne).toHaveBeenCalledWith(routeId);
    });
  });

  describe('create', () => {
    it('should create a new route and return response dto', async () => {
      const newRoute = {
        ...mockRoute,
        toResponseDto: jest.fn().mockReturnValue({
          ...mockRouteResponseDto,
          name: mockRouteInputDto.name,
          notes: mockRouteInputDto.notes,
        }),
      };
      mockRouteService.create.mockResolvedValue(newRoute);

      const result = await controller.create(mockRouteInputDto);

      expect(service.create).toHaveBeenCalledWith(mockRouteInputDto);
      expect(newRoute.toResponseDto).toHaveBeenCalled();
      expect(result.name).toEqual(mockRouteInputDto.name);
    });

    it('should handle validation errors from service', async () => {
      const errorMessage = 'Invalid route data';
      mockRouteService.create.mockRejectedValue(new Error(errorMessage));

      await expect(controller.create(mockRouteInputDto)).rejects.toThrow(errorMessage);
      expect(service.create).toHaveBeenCalledWith(mockRouteInputDto);
    });
  });

  describe('update', () => {
    it('should update an existing route and return response dto', async () => {
      const routeId = 1;
      const updatedRoute = {
        ...mockRoute,
        name: 'Updated Route',
        toResponseDto: jest.fn().mockReturnValue({
          ...mockRouteResponseDto,
          name: 'Updated Route',
        }),
      };
      mockRouteService.update.mockResolvedValue(updatedRoute);

      const result = await controller.update(routeId, mockRouteInputDto);

      expect(service.update).toHaveBeenCalledWith(routeId, mockRouteInputDto);
      expect(updatedRoute.toResponseDto).toHaveBeenCalled();
      expect(result.name).toEqual('Updated Route');
    });

    it('should handle route not found during update', async () => {
      const routeId = 999;
      const errorMessage = `Route with id ${routeId} not found`;
      mockRouteService.update.mockRejectedValue(new NotFoundException(errorMessage));

      await expect(controller.update(routeId, mockRouteInputDto)).rejects.toThrow(NotFoundException);
      await expect(controller.update(routeId, mockRouteInputDto)).rejects.toThrow(errorMessage);
      expect(service.update).toHaveBeenCalledWith(routeId, mockRouteInputDto);
    });

    it('should handle validation errors during update', async () => {
      const routeId = 1;
      const errorMessage = 'Invalid waypoint data';
      mockRouteService.update.mockRejectedValue(new Error(errorMessage));

      await expect(controller.update(routeId, mockRouteInputDto)).rejects.toThrow(errorMessage);
      expect(service.update).toHaveBeenCalledWith(routeId, mockRouteInputDto);
    });
  });

  describe('remove', () => {
    it('should delete a route successfully', async () => {
      const routeId = 1;
      mockRouteService.remove.mockResolvedValue(undefined);

      await controller.remove(routeId);

      expect(service.remove).toHaveBeenCalledWith(routeId);
    });

    it('should handle route not found during deletion', async () => {
      const routeId = 999;
      const errorMessage = `Route with id ${routeId} not found`;
      mockRouteService.remove.mockRejectedValue(new NotFoundException(errorMessage));

      await expect(controller.remove(routeId)).rejects.toThrow(NotFoundException);
      await expect(controller.remove(routeId)).rejects.toThrow(errorMessage);
      expect(service.remove).toHaveBeenCalledWith(routeId);
    });
  });
});