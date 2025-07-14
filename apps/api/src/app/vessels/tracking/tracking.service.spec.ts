import { Test, TestingModule } from '@nestjs/testing';
import { Repository, DataSource } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TrackingService } from './tracking.service';
import { TrackingGateway } from './tracking.gateway';
import { VesselService } from '../vessel.service';
import { VesselTelemetry } from './vessel-telemetry.entity';
import { Vessel } from '../vessel.entity';
import { VesselTelemetryInputDto } from './dto/vessel-telemetry-input.dto';
import { GeoPoint } from '@ghanawaters/shared-models';

describe('TrackingService', () => {
  let service: TrackingService;
  let trackingRepository: Repository<VesselTelemetry>;
  let vesselRepository: Repository<Vessel>;
  let trackingGateway: TrackingGateway;
  let vesselService: VesselService;
  let dataSource: DataSource;

  const mockVessel: Partial<Vessel> = {
    id: 1,
    name: 'Test Vessel',
    vessel_type: { id: 1, name: 'Cargo' } as any,
    latest_position_id: 1
  };

  const mockTelemetry: Partial<VesselTelemetry> = {
    id: 1,
    vessel_id: 1,
    timestamp: new Date(),
    speed_knots: 10.5,
    heading_degrees: 180,
    status: 'moving',
    device_id: 'device-123',
    created: new Date()
  };

  const mockPosition: GeoPoint = {
    type: 'Point',
    coordinates: [-0.1225, 5.6037]
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TrackingService,
        {
          provide: getRepositoryToken(VesselTelemetry),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            save: jest.fn(),
            query: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Vessel),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
          },
        },
        {
          provide: TrackingGateway,
          useValue: {
            server: { emit: jest.fn() },
            broadcastPosition: jest.fn(),
            broadcastPositions: jest.fn(),
          },
        },
        {
          provide: VesselService,
          useValue: {
            findOne: jest.fn(),
            findOneEntity: jest.fn(),
          },
        },
        {
          provide: DataSource,
          useValue: {
            transaction: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<TrackingService>(TrackingService);
    trackingRepository = module.get<Repository<VesselTelemetry>>(
      getRepositoryToken(VesselTelemetry)
    );
    vesselRepository = module.get<Repository<Vessel>>(
      getRepositoryToken(Vessel)
    );
    trackingGateway = module.get<TrackingGateway>(TrackingGateway);
    vesselService = module.get<VesselService>(VesselService);
    dataSource = module.get<DataSource>(DataSource);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new telemetry record and broadcast via WebSocket', async () => {
      const telemetryInput: VesselTelemetryInputDto = {
        timestamp: new Date().toISOString(),
        position: mockPosition,
        speed_knots: 10.5,
        heading_degrees: 180,
        status: 'moving'
      };

      const savedTelemetry = { ...mockTelemetry, id: 2 };
      
      // Mock transaction
      const mockManager = {
        save: jest.fn().mockResolvedValue(savedTelemetry),
        update: jest.fn().mockResolvedValue(undefined),
      };
      
      (dataSource.transaction as jest.Mock).mockImplementation(async (cb) => {
        return cb(mockManager);
      });

      jest.spyOn(vesselService, 'findOneEntity').mockResolvedValue(mockVessel as Vessel);

      const result = await service.create(1, telemetryInput, 'device-123');

      expect(result).toEqual({
        id: 2,
        created: savedTelemetry.created,
        timestamp: savedTelemetry.timestamp,
        vessel_id: 1,
        position: mockPosition,
        speed_knots: 10.5,
        heading_degrees: 180,
        device_id: 'device-123',
        status: 'moving'
      });

      expect(mockManager.save).toHaveBeenCalledWith(VesselTelemetry, expect.objectContaining({
        vessel_id: 1,
        position: mockPosition,
        speed_knots: 10.5,
        heading_degrees: 180,
        device_id: 'device-123',
        status: 'moving'
      }));

      expect(mockManager.update).toHaveBeenCalledWith(Vessel, 1, {
        latest_position_id: 2
      });

      expect(trackingGateway.broadcastPosition).toHaveBeenCalledWith(
        savedTelemetry,
        mockVessel,
        mockPosition
      );
    });

    it('should handle WebSocket broadcast errors gracefully', async () => {
      const telemetryInput: VesselTelemetryInputDto = {
        position: mockPosition,
        speed_knots: 10.5,
        heading_degrees: 180,
      };

      const savedTelemetry = { ...mockTelemetry, id: 3 };
      
      const mockManager = {
        save: jest.fn().mockResolvedValue(savedTelemetry),
        update: jest.fn().mockResolvedValue(undefined),
      };
      
      (dataSource.transaction as jest.Mock).mockImplementation(async (cb) => {
        return cb(mockManager);
      });

      // Mock WebSocket broadcast to throw error
      jest.spyOn(trackingGateway, 'broadcastPosition').mockImplementation(() => {
        throw new Error('WebSocket error');
      });
      jest.spyOn(vesselService, 'findOneEntity').mockResolvedValue(mockVessel as Vessel);

      // Should not throw error even if WebSocket fails
      const result = await service.create(1, telemetryInput);

      expect(result).toBeDefined();
      expect(result.id).toBe(3);
    });

    it('should handle missing vessel gracefully', async () => {
      const telemetryInput: VesselTelemetryInputDto = {
        position: mockPosition,
        speed_knots: 10.5,
        heading_degrees: 180,
      };

      const savedTelemetry = { ...mockTelemetry, id: 4 };
      
      const mockManager = {
        save: jest.fn().mockResolvedValue(savedTelemetry),
        update: jest.fn().mockResolvedValue(undefined),
      };
      
      (dataSource.transaction as jest.Mock).mockImplementation(async (cb) => {
        return cb(mockManager);
      });

      jest.spyOn(vesselService, 'findOneEntity').mockResolvedValue(null);

      const result = await service.create(1, telemetryInput);

      expect(result).toBeDefined();
      expect(trackingGateway.broadcastPosition).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return all telemetry records with position data', async () => {
      const telemetryRecords = [mockTelemetry, { ...mockTelemetry, id: 2 }];
      
      jest.spyOn(trackingRepository, 'find').mockResolvedValue(telemetryRecords as VesselTelemetry[]);
      jest.spyOn(trackingRepository, 'query').mockResolvedValue([
        { longitude: -0.1225, latitude: 5.6037 },
        { longitude: -0.1235, latitude: 5.6045 }
      ]);

      const result = await service.findAll();

      expect(result).toHaveLength(2);
      expect(result[0].position).toEqual(mockPosition);
      expect(trackingRepository.find).toHaveBeenCalledWith({
        order: { timestamp: 'DESC' },
        take: 1000
      });
    });
  });

  describe('findByVessel', () => {
    it('should return telemetry records for a specific vessel', async () => {
      const telemetryRecords = [mockTelemetry];
      
      jest.spyOn(trackingRepository, 'find').mockResolvedValue(telemetryRecords as VesselTelemetry[]);
      jest.spyOn(trackingRepository, 'query').mockResolvedValue([
        { longitude: -0.1225, latitude: 5.6037 }
      ]);

      const result = await service.findByVessel(1, 50);

      expect(result).toHaveLength(1);
      expect(trackingRepository.find).toHaveBeenCalledWith({
        where: { vessel_id: 1 },
        order: { timestamp: 'DESC' },
        take: 50
      });
    });
  });

  describe('getLatestPositions', () => {
    it('should return latest positions for all vessels', async () => {
      const vesselWithPosition = {
        ...mockVessel,
        latest_position: mockTelemetry
      };

      jest.spyOn(vesselRepository, 'find').mockResolvedValue([vesselWithPosition as Vessel]);
      jest.spyOn(trackingRepository, 'query').mockResolvedValue([
        { longitude: -0.1225, latitude: 5.6037 }
      ]);

      const result = await service.getLatestPositions();

      expect(result).toHaveLength(1);
      expect(result[0].vessel_id).toBe(1);
      expect(result[0].position).toEqual(mockPosition);
      expect((result[0] as any).vessel).toEqual({
        id: 1,
        created: vesselWithPosition.created,
        last_updated: vesselWithPosition.last_updated,
        name: 'Test Vessel',
        vessel_type: 'Cargo',
      });
    });

    it('should handle vessels without positions', async () => {
      const vesselWithoutPosition = {
        ...mockVessel,
        latest_position_id: null,
        latest_position: null
      };

      jest.spyOn(vesselRepository, 'find').mockResolvedValue([
        vesselWithoutPosition as Vessel,
        { ...mockVessel, latest_position: mockTelemetry } as Vessel
      ]);
      jest.spyOn(trackingRepository, 'query').mockResolvedValue([
        { longitude: -0.1225, latitude: 5.6037 }
      ]);

      const result = await service.getLatestPositions();

      expect(result).toHaveLength(1);
      expect(vesselRepository.find).toHaveBeenCalledWith({
        relations: ['latest_position', 'vessel_type'],
        where: { latest_position_id: expect.anything() }
      });
    });
  });

  describe('getVesselLatestPosition', () => {
    it('should return the latest position for a specific vessel', async () => {
      const vesselWithPosition = {
        ...mockVessel,
        latest_position: mockTelemetry
      };

      jest.spyOn(vesselRepository, 'findOne').mockResolvedValue(vesselWithPosition as Vessel);
      jest.spyOn(trackingRepository, 'query').mockResolvedValue([
        { longitude: -0.1225, latitude: 5.6037 }
      ]);

      const result = await service.getVesselLatestPosition(1);

      expect(result).toBeDefined();
      expect(result.vessel_id).toBe(1);
      expect(result.position).toEqual(mockPosition);
    });

    it('should return null if vessel has no position', async () => {
      const vesselWithoutPosition = {
        ...mockVessel,
        latest_position: null
      };

      jest.spyOn(vesselRepository, 'findOne').mockResolvedValue(vesselWithoutPosition as Vessel);

      const result = await service.getVesselLatestPosition(1);

      expect(result).toBeNull();
    });

    it('should return null if vessel not found', async () => {
      jest.spyOn(vesselRepository, 'findOne').mockResolvedValue(null);

      const result = await service.getVesselLatestPosition(999);

      expect(result).toBeNull();
    });
  });
});