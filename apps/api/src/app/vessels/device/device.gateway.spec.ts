import { Test, TestingModule } from '@nestjs/testing';
import { Server, Socket } from 'socket.io';
import { DeviceGateway } from './device.gateway';
import { Device, DeviceState } from './device.entity';
import { DeviceResponseDto } from './dto/device-response.dto';

describe('DeviceGateway', () => {
  let gateway: DeviceGateway;
  let mockServer: jest.Mocked<Server>;
  let mockClient: jest.Mocked<Socket>;

  beforeEach(async () => {
    // Mock Socket.io server
    mockServer = {
      to: jest.fn().mockReturnThis(),
      emit: jest.fn(),
    } as any;

    // Mock Socket.io client
    mockClient = {
      id: 'test-client-123',
      join: jest.fn(),
      leave: jest.fn(),
      emit: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [DeviceGateway],
    }).compile();

    gateway = module.get<DeviceGateway>(DeviceGateway);
    gateway.server = mockServer;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Gateway lifecycle', () => {
    it('should handle afterInit', () => {
      const consoleSpy = jest.spyOn(gateway['logger'], 'log');
      gateway.afterInit(mockServer);
      expect(consoleSpy).toHaveBeenCalledWith('Device WebSocket Gateway initialized');
    });

    it('should handle client connection', () => {
      const consoleSpy = jest.spyOn(gateway['logger'], 'log');
      gateway.handleConnection(mockClient);
      expect(consoleSpy).toHaveBeenCalledWith('Client connected to devices namespace: test-client-123');
    });

    it('should handle client disconnection', () => {
      const consoleSpy = jest.spyOn(gateway['logger'], 'log');
      gateway.handleDisconnect(mockClient);
      expect(consoleSpy).toHaveBeenCalledWith('Client disconnected from devices namespace: test-client-123');
    });
  });

  describe('Subscription management', () => {
    it('should handle vessel device subscription', () => {
      const vesselId = 123;
      const result = gateway.handleSubscribeVesselDevices(vesselId, mockClient);

      expect(mockClient.join).toHaveBeenCalledWith('vessel-devices-123');
      expect(result).toEqual({ event: 'subscribed', data: 'vessel-devices-123' });
    });

    it('should handle vessel device unsubscription', () => {
      const vesselId = 123;
      const result = gateway.handleUnsubscribeVesselDevices(vesselId, mockClient);

      expect(mockClient.leave).toHaveBeenCalledWith('vessel-devices-123');
      expect(result).toEqual({ event: 'unsubscribed', data: 'vessel-devices-123' });
    });
  });

  describe('Device event emissions', () => {
    const mockDevice = {
      device_id: 'test-device-id',
      device_token: 'test-token',
      activation_token: 'activation-token',
      auth_token: 'auth-token',
      state: DeviceState.ACTIVE,
      vessel_id: 123,
      activated_at: new Date(),
      created_at: new Date(),
      updated_at: new Date(),
      toResponseDto: jest.fn().mockReturnValue({
        device_id: 'test-device-id',
        device_token: 'test-token',
        state: DeviceState.ACTIVE,
      } as DeviceResponseDto),
    } as any as Device;

    it('should emit device-activated event', () => {
      const vesselId = 123;
      const consoleSpy = jest.spyOn(gateway['logger'], 'log');

      gateway.emitDeviceActivated(vesselId, mockDevice);

      expect(mockServer.to).toHaveBeenCalledWith('vessel-devices-123');
      expect(mockServer.emit).toHaveBeenCalledWith('device-activated', {
        vesselId: 123,
        device: mockDevice.toResponseDto(),
        timestamp: expect.any(Date),
      });
      expect(consoleSpy).toHaveBeenCalledWith(
        'Emitted device-activated event for vessel 123, device test-device-id'
      );
    });

    it('should emit device-created event with activation URL', () => {
      const vesselId = 123;
      const consoleSpy = jest.spyOn(gateway['logger'], 'log');
      
      // Mock toResponseDto with includeActivationUrl parameter
      mockDevice.toResponseDto = jest.fn().mockImplementation((includeUrl) => ({
        device_id: 'test-device-id',
        device_token: 'test-token',
        state: DeviceState.PENDING,
        activation_url: includeUrl ? 'ghanawaters://auth?token=activation-token' : undefined,
      }));

      gateway.emitDeviceCreated(vesselId, mockDevice);

      expect(mockDevice.toResponseDto).toHaveBeenCalledWith(true);
      expect(mockServer.to).toHaveBeenCalledWith('vessel-devices-123');
      expect(mockServer.emit).toHaveBeenCalledWith('device-created', {
        vesselId: 123,
        device: expect.objectContaining({
          device_id: 'test-device-id',
          activation_url: 'ghanawaters://auth?token=activation-token',
        }),
        timestamp: expect.any(Date),
      });
      expect(consoleSpy).toHaveBeenCalledWith(
        'Emitted device-created event for vessel 123, device test-device-id'
      );
    });

    it('should emit device-retired event', () => {
      const vesselId = 123;
      const deviceId = 'test-device-id';
      const consoleSpy = jest.spyOn(gateway['logger'], 'log');

      gateway.emitDeviceRetired(vesselId, deviceId);

      expect(mockServer.to).toHaveBeenCalledWith('vessel-devices-123');
      expect(mockServer.emit).toHaveBeenCalledWith('device-retired', {
        vesselId: 123,
        deviceId: 'test-device-id',
        timestamp: expect.any(Date),
      });
      expect(consoleSpy).toHaveBeenCalledWith(
        'Emitted device-retired event for vessel 123, device test-device-id'
      );
    });

    it('should emit device-deleted event', () => {
      const vesselId = 123;
      const deviceId = 'test-device-id';
      const consoleSpy = jest.spyOn(gateway['logger'], 'log');

      gateway.emitDeviceDeleted(vesselId, deviceId);

      expect(mockServer.to).toHaveBeenCalledWith('vessel-devices-123');
      expect(mockServer.emit).toHaveBeenCalledWith('device-deleted', {
        vesselId: 123,
        deviceId: 'test-device-id',
        timestamp: expect.any(Date),
      });
      expect(consoleSpy).toHaveBeenCalledWith(
        'Emitted device-deleted event for vessel 123, device test-device-id'
      );
    });
  });

  describe('Error scenarios', () => {
    it('should handle missing vessel ID gracefully', () => {
      const device = {
        device_id: 'test-device-id',
        vessel_id: null,
        toResponseDto: jest.fn().mockReturnValue({}),
      } as any as Device;

      // Should not throw
      expect(() => gateway.emitDeviceActivated(null as any, device)).not.toThrow();
      expect(mockServer.to).toHaveBeenCalledWith('vessel-devices-null');
    });
  });
});