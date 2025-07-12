import { Test, TestingModule } from '@nestjs/testing';
import { MqttTrackingService } from './mqtt-tracking.service';
import { TrackingService } from './tracking.service';
import { VesselService } from '../vessel.service';
import * as mqtt from 'mqtt';
import { VesselTelemetryInputDto } from './dto/vessel-telemetry-input.dto';

jest.mock('mqtt');

describe('MqttTrackingService', () => {
  let service: MqttTrackingService;
  let trackingService: jest.Mocked<TrackingService>;
  let vesselService: jest.Mocked<VesselService>;
  let mockClient: jest.Mocked<mqtt.MqttClient>;

  const mockVessel = {
    id: 42,
    name: 'Test Vessel',
    vessel_type_id: 1,
    imo_number: '1234567',
    call_sign: 'TEST123',
    mmsi: '123456789',
  };

  beforeEach(async () => {
    // Create mock MQTT client
    mockClient = {
      on: jest.fn(),
      subscribe: jest.fn(),
      publish: jest.fn(),
      end: jest.fn(),
      removeAllListeners: jest.fn(),
    } as any;

    // Mock mqtt.connect
    (mqtt.connect as jest.Mock).mockReturnValue(mockClient);

    // Create mock services
    const mockTrackingService = {
      create: jest.fn().mockResolvedValue({ id: 1 }),
    };

    const mockVesselService = {
      findOne: jest.fn().mockResolvedValue(mockVessel),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MqttTrackingService,
        {
          provide: TrackingService,
          useValue: mockTrackingService,
        },
        {
          provide: VesselService,
          useValue: mockVesselService,
        },
      ],
    }).compile();

    service = module.get<MqttTrackingService>(MqttTrackingService);
    trackingService = module.get(TrackingService);
    vesselService = module.get(VesselService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    delete process.env.MQTT_ENABLED;
    delete process.env.MQTT_BROKER_URL;
    delete process.env.MQTT_API_PASSWORD;
  });

  describe('onModuleInit', () => {
    it('should connect to MQTT broker when enabled', async () => {
      process.env.MQTT_BROKER_URL = 'mqtt://test-broker:1883';
      process.env.MQTT_API_PASSWORD = 'test-password';

      await service.onModuleInit();

      expect(mqtt.connect).toHaveBeenCalledWith('mqtt://test-broker:1883', {
        username: 'api',
        password: 'test-password',
        clientId: expect.stringMatching(/^api-tracking-\d+$/),
      });
    });

    it('should skip connection when MQTT is disabled', async () => {
      process.env.MQTT_ENABLED = 'false';

      await service.onModuleInit();

      expect(mqtt.connect).not.toHaveBeenCalled();
    });

    it('should subscribe to vessel position topics on connect', async () => {
      await service.onModuleInit();

      // Get the connect handler
      const connectHandler = mockClient.on.mock.calls.find(call => call[0] === 'connect')[1];
      connectHandler();

      expect(mockClient.subscribe).toHaveBeenCalledWith('vessels/+/position');
    });

    it('should register message handler', async () => {
      await service.onModuleInit();

      const messageHandlerCall = mockClient.on.mock.calls.find(call => call[0] === 'message');
      expect(messageHandlerCall).toBeDefined();
    });
  });

  describe('message handling', () => {
    let messageHandler: (topic: string, payload: Buffer) => Promise<void>;

    beforeEach(async () => {
      await service.onModuleInit();
      messageHandler = mockClient.on.mock.calls.find(call => call[0] === 'message')[1];
    });

    it('should process valid position message', async () => {
      const topic = 'vessels/42/position';
      const message = {
        timestamp: '2025-01-15T12:00:00Z',
        position: {
          type: 'Point',
          coordinates: [-0.5, 5.5],
        },
        speed_knots: 10.5,
        heading_degrees: 180,
        status: 'moving',
        device_id: 'device-123',
      };

      await messageHandler(topic, Buffer.from(JSON.stringify(message)));

      expect(vesselService.findOne).toHaveBeenCalledWith(42);
      expect(trackingService.create).toHaveBeenCalledWith(
        42,
        expect.objectContaining({
          timestamp: message.timestamp,
          position: message.position,
          speed_knots: message.speed_knots,
          heading_degrees: message.heading_degrees,
          status: message.status,
        }),
        message.device_id
      );
    });

    it('should reject invalid topic format', async () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      const topic = 'vessels/invalid/topic/format';
      const message = { position: { type: 'Point', coordinates: [0, 0] } };

      await messageHandler(topic, Buffer.from(JSON.stringify(message)));

      expect(consoleWarnSpy).toHaveBeenCalledWith('Invalid topic format:', topic);
      expect(vesselService.findOne).not.toHaveBeenCalled();
      expect(trackingService.create).not.toHaveBeenCalled();

      consoleWarnSpy.mockRestore();
    });

    it('should reject non-numeric vessel ID in topic', async () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      const topic = 'vessels/abc/position';
      const message = { position: { type: 'Point', coordinates: [0, 0] } };

      await messageHandler(topic, Buffer.from(JSON.stringify(message)));

      expect(consoleWarnSpy).toHaveBeenCalledWith('Invalid topic format:', topic);
      expect(vesselService.findOne).not.toHaveBeenCalled();

      consoleWarnSpy.mockRestore();
    });

    it('should reject unknown vessel ID', async () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      vesselService.findOne.mockResolvedValue(null);

      const topic = 'vessels/999/position';
      const message = { position: { type: 'Point', coordinates: [0, 0] } };

      await messageHandler(topic, Buffer.from(JSON.stringify(message)));

      expect(vesselService.findOne).toHaveBeenCalledWith(999);
      expect(consoleWarnSpy).toHaveBeenCalledWith('Received data for unknown vessel ID: 999');
      expect(trackingService.create).not.toHaveBeenCalled();

      consoleWarnSpy.mockRestore();
    });

    it('should handle invalid JSON payload', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const topic = 'vessels/42/position';

      await messageHandler(topic, Buffer.from('invalid json'));

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error processing MQTT message:',
        expect.any(Error)
      );
      expect(trackingService.create).not.toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it('should validate position data format', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const topic = 'vessels/42/position';
      const invalidMessages = [
        { position: null }, // Missing position
        { position: { type: 'Point' } }, // Missing coordinates
        { position: { type: 'Point', coordinates: [] } }, // Empty coordinates
        { position: { type: 'Point', coordinates: [0] } }, // Only one coordinate
        { position: { type: 'Point', coordinates: [0, 0, 0] } }, // Too many coordinates
      ];

      for (const message of invalidMessages) {
        await messageHandler(topic, Buffer.from(JSON.stringify(message)));
        expect(consoleErrorSpy).toHaveBeenCalledWith('Invalid position format in MQTT message');
        expect(trackingService.create).not.toHaveBeenCalled();
        consoleErrorSpy.mockClear();
      }

      consoleErrorSpy.mockRestore();
    });

    it('should calculate status from speed if not provided', async () => {
      const topic = 'vessels/42/position';
      
      // Test moving status
      const movingMessage = {
        timestamp: '2025-01-15T12:00:00Z',
        position: { type: 'Point', coordinates: [-0.5, 5.5] },
        speed_knots: 5.0,
        heading_degrees: 90,
      };

      await messageHandler(topic, Buffer.from(JSON.stringify(movingMessage)));

      expect(trackingService.create).toHaveBeenCalledWith(
        42,
        expect.objectContaining({ status: 'moving' }),
        undefined
      );

      // Test stationary status
      trackingService.create.mockClear();
      const stationaryMessage = {
        timestamp: '2025-01-15T12:00:00Z',
        position: { type: 'Point', coordinates: [-0.5, 5.5] },
        speed_knots: 0.3,
        heading_degrees: 90,
      };

      await messageHandler(topic, Buffer.from(JSON.stringify(stationaryMessage)));

      expect(trackingService.create).toHaveBeenCalledWith(
        42,
        expect.objectContaining({ status: 'stationary' }),
        undefined
      );
    });

    it('should handle tracking service errors', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      trackingService.create.mockRejectedValue(new Error('Database error'));

      const topic = 'vessels/42/position';
      const message = {
        timestamp: '2025-01-15T12:00:00Z',
        position: { type: 'Point', coordinates: [-0.5, 5.5] },
        speed_knots: 10.5,
        heading_degrees: 180,
      };

      await messageHandler(topic, Buffer.from(JSON.stringify(message)));

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error processing MQTT message:',
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe('error handling', () => {
    it('should handle MQTT connection errors', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      
      await service.onModuleInit();

      const errorHandler = mockClient.on.mock.calls.find(call => call[0] === 'error')[1];
      const testError = new Error('Connection failed');
      errorHandler(testError);

      expect(consoleErrorSpy).toHaveBeenCalledWith('MQTT Error:', testError);

      consoleErrorSpy.mockRestore();
    });
  });

  describe('concurrent message processing', () => {
    it('should handle multiple messages concurrently', async () => {
      await service.onModuleInit();
      const messageHandler = mockClient.on.mock.calls.find(call => call[0] === 'message')[1];

      // Create multiple vessels
      const vessels = [
        { ...mockVessel, id: 1 },
        { ...mockVessel, id: 2 },
        { ...mockVessel, id: 3 },
      ];

      vesselService.findOne
        .mockResolvedValueOnce(vessels[0])
        .mockResolvedValueOnce(vessels[1])
        .mockResolvedValueOnce(vessels[2]);

      const messages = vessels.map(vessel => ({
        topic: `vessels/${vessel.id}/position`,
        data: {
          timestamp: new Date().toISOString(),
          position: { type: 'Point', coordinates: [-0.5, 5.5] },
          speed_knots: 10,
          heading_degrees: 90,
          device_id: `device-${vessel.id}`,
        },
      }));

      // Process all messages concurrently
      await Promise.all(
        messages.map(msg =>
          messageHandler(msg.topic, Buffer.from(JSON.stringify(msg.data)))
        )
      );

      expect(trackingService.create).toHaveBeenCalledTimes(3);
      vessels.forEach((vessel, index) => {
        expect(trackingService.create).toHaveBeenCalledWith(
          vessel.id,
          expect.any(Object),
          `device-${vessel.id}`
        );
      });
    });
  });
});