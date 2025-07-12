import { Test, TestingModule } from '@nestjs/testing';
import { MqttSyncService } from './mqtt-sync.service';
import * as mqtt from 'mqtt';

// Mock the mqtt module
jest.mock('mqtt');

describe('MqttSyncService', () => {
  let service: MqttSyncService;
  let mockClient: jest.Mocked<mqtt.MqttClient>;

  beforeEach(async () => {
    // Create a mock MQTT client
    mockClient = {
      on: jest.fn(),
      end: jest.fn(),
      publish: jest.fn(),
      subscribe: jest.fn(),
      unsubscribe: jest.fn(),
      removeAllListeners: jest.fn(),
    } as any;

    // Mock the connect function to return our mock client
    (mqtt.connect as jest.Mock).mockReturnValue(mockClient);

    const module: TestingModule = await Test.createTestingModule({
      providers: [MqttSyncService],
    }).compile();

    service = module.get<MqttSyncService>(MqttSyncService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    delete process.env.MQTT_ENABLED;
    delete process.env.MQTT_BROKER_URL;
    delete process.env.MQTT_API_PASSWORD;
  });

  describe('onModuleInit', () => {
    it('should connect to MQTT broker when enabled', async () => {
      process.env.MQTT_ENABLED = 'true';
      process.env.MQTT_BROKER_URL = 'mqtt://test-broker:1883';
      process.env.MQTT_API_PASSWORD = 'test-password';

      await service.onModuleInit();

      expect(mqtt.connect).toHaveBeenCalledWith('mqtt://test-broker:1883', {
        username: 'api',
        password: 'test-password',
        clientId: expect.stringMatching(/^api-sync-\d+$/),
        reconnectPeriod: 5000,
      });
    });

    it('should skip connection when MQTT is disabled', async () => {
      process.env.MQTT_ENABLED = 'false';

      await service.onModuleInit();

      expect(mqtt.connect).not.toHaveBeenCalled();
    });

    it('should use default values when env vars not set', async () => {
      await service.onModuleInit();

      expect(mqtt.connect).toHaveBeenCalledWith('mqtt://localhost:1883', {
        username: 'api',
        password: 'mqtt_api_password',
        clientId: expect.stringMatching(/^api-sync-\d+$/),
        reconnectPeriod: 5000,
      });
    });

    it('should register event handlers', async () => {
      await service.onModuleInit();

      expect(mockClient.on).toHaveBeenCalledWith('connect', expect.any(Function));
      expect(mockClient.on).toHaveBeenCalledWith('error', expect.any(Function));
      expect(mockClient.on).toHaveBeenCalledWith('close', expect.any(Function));
      expect(mockClient.on).toHaveBeenCalledWith('offline', expect.any(Function));
      expect(mockClient.on).toHaveBeenCalledWith('reconnect', expect.any(Function));
    });

    it('should handle connect event', async () => {
      await service.onModuleInit();

      // Get the connect handler and call it
      const connectHandler = mockClient.on.mock.calls.find(call => call[0] === 'connect')[1];
      connectHandler();

      // Service should be marked as connected
      expect(service['isConnected']).toBe(true);
    });

    it('should handle error event', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      await service.onModuleInit();

      const errorHandler = mockClient.on.mock.calls.find(call => call[0] === 'error')[1];
      const testError = new Error('Test error');
      errorHandler(testError);

      expect(service['isConnected']).toBe(false);
      consoleErrorSpy.mockRestore();
    });
  });

  describe('onModuleDestroy', () => {
    it('should end MQTT connection if client exists', async () => {
      await service.onModuleInit();
      await service.onModuleDestroy();

      expect(mockClient.end).toHaveBeenCalled();
    });

    it('should handle when no client exists', async () => {
      process.env.MQTT_ENABLED = 'false';
      await service.onModuleInit();
      await service.onModuleDestroy();

      expect(mockClient.end).not.toHaveBeenCalled();
    });
  });

  describe('publishSyncNotification', () => {
    beforeEach(async () => {
      await service.onModuleInit();
      // Simulate connected state
      const connectHandler = mockClient.on.mock.calls.find(call => call[0] === 'connect')[1];
      connectHandler();
    });

    it('should publish sync notification when connected', async () => {
      mockClient.publish.mockImplementation((topic, message, opts, callback) => {
        if (callback) callback(null);
        return mockClient;
      });

      await service.publishSyncNotification(2, 123);

      expect(mockClient.publish).toHaveBeenCalledWith(
        '/sync',
        JSON.stringify({ major_version: 2, minor_version: 123 }),
        { qos: 0 },
        expect.any(Function)
      );
    });

    it('should handle publish errors gracefully', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      mockClient.publish.mockImplementation((topic, message, opts, callback) => {
        if (callback) callback(new Error('Publish failed'));
        return mockClient;
      });

      await service.publishSyncNotification(2, 123);

      expect(mockClient.publish).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });

    it('should skip publishing when not connected', async () => {
      // Simulate offline state
      const offlineHandler = mockClient.on.mock.calls.find(call => call[0] === 'offline')[1];
      offlineHandler();

      await service.publishSyncNotification(2, 123);

      expect(mockClient.publish).not.toHaveBeenCalled();
    });

    it('should skip publishing when client is null', async () => {
      process.env.MQTT_ENABLED = 'false';
      const newService = new MqttSyncService();
      await newService.onModuleInit();

      await newService.publishSyncNotification(2, 123);

      expect(mockClient.publish).not.toHaveBeenCalled();
    });

    it('should handle exceptions in publish', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      mockClient.publish.mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      await service.publishSyncNotification(2, 123);

      // Should not throw, just log
      consoleErrorSpy.mockRestore();
    });

    it('should format notification correctly', async () => {
      mockClient.publish.mockImplementation((topic, message, opts, callback) => {
        if (callback) callback(null);
        return mockClient;
      });

      await service.publishSyncNotification(5, 456);

      const publishCall = mockClient.publish.mock.calls[0];
      const publishedMessage = JSON.parse(publishCall[1] as string);
      
      expect(publishedMessage).toEqual({
        major_version: 5,
        minor_version: 456,
      });
    });
  });

  describe('Connection state management', () => {
    beforeEach(async () => {
      await service.onModuleInit();
    });

    it('should update connection state on close event', () => {
      const closeHandler = mockClient.on.mock.calls.find(call => call[0] === 'close')[1];
      closeHandler();

      expect(service['isConnected']).toBe(false);
    });

    it('should update connection state on offline event', () => {
      const offlineHandler = mockClient.on.mock.calls.find(call => call[0] === 'offline')[1];
      offlineHandler();

      expect(service['isConnected']).toBe(false);
    });

    it('should log reconnection attempts', () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
      
      const reconnectHandler = mockClient.on.mock.calls.find(call => call[0] === 'reconnect')[1];
      reconnectHandler();

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('reconnect'));
      consoleLogSpy.mockRestore();
    });
  });
});