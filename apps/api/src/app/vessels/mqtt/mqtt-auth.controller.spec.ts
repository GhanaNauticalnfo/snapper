import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { MqttAuthController } from './mqtt-auth.controller';
import { DeviceAuthService } from '../device/device-auth.service';
import { Device, DeviceState } from '../device/device.entity';

describe('MqttAuthController', () => {
  let controller: MqttAuthController;
  let deviceAuthService: jest.Mocked<DeviceAuthService>;

  const mockDevice: Device = {
    id: 1,
    device_id: 'test-device-123',
    vessel_id: 42,
    state: DeviceState.ACTIVE,
    activation_token: null,
    auth_token: 'device-auth-token',
    activated_at: new Date(),
    expires_at: null,
    created_at: new Date(),
    updated_at: new Date(),
    vessel: null,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MqttAuthController],
      providers: [
        {
          provide: DeviceAuthService,
          useValue: {
            validateDevice: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<MqttAuthController>(MqttAuthController);
    deviceAuthService = module.get(DeviceAuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('authenticate', () => {
    describe('API user authentication', () => {
      it('should authenticate API user with correct password', async () => {
        const originalEnv = process.env.MQTT_API_PASSWORD;
        process.env.MQTT_API_PASSWORD = 'test-api-password';

        await expect(
          controller.authenticate('api-client-1', 'api', 'test-api-password')
        ).resolves.toBeUndefined();

        expect(deviceAuthService.validateDevice).not.toHaveBeenCalled();

        process.env.MQTT_API_PASSWORD = originalEnv;
      });

      it('should reject API user with incorrect password', async () => {
        const originalEnv = process.env.MQTT_API_PASSWORD;
        process.env.MQTT_API_PASSWORD = 'test-api-password';

        await expect(
          controller.authenticate('api-client-1', 'api', 'wrong-password')
        ).rejects.toThrow(UnauthorizedException);

        expect(deviceAuthService.validateDevice).not.toHaveBeenCalled();

        process.env.MQTT_API_PASSWORD = originalEnv;
      });

      it('should use default password when env var not set', async () => {
        const originalEnv = process.env.MQTT_API_PASSWORD;
        delete process.env.MQTT_API_PASSWORD;

        await expect(
          controller.authenticate('api-client-1', 'api', 'mqtt_api_password')
        ).resolves.toBeUndefined();

        process.env.MQTT_API_PASSWORD = originalEnv;
      });
    });

    describe('Device authentication', () => {
      it('should authenticate device with valid token and matching vessel ID', async () => {
        deviceAuthService.validateDevice.mockResolvedValue(mockDevice);

        await expect(
          controller.authenticate('vessel-42', '42', 'device-auth-token')
        ).resolves.toBeUndefined();

        expect(deviceAuthService.validateDevice).toHaveBeenCalledWith('device-auth-token');
      });

      it('should reject device when vessel ID does not match username', async () => {
        deviceAuthService.validateDevice.mockResolvedValue(mockDevice);

        await expect(
          controller.authenticate('vessel-99', '99', 'device-auth-token')
        ).rejects.toThrow(UnauthorizedException);

        expect(deviceAuthService.validateDevice).toHaveBeenCalledWith('device-auth-token');
      });

      it('should reject device with invalid token', async () => {
        deviceAuthService.validateDevice.mockRejectedValue(new UnauthorizedException());

        await expect(
          controller.authenticate('vessel-42', '42', 'invalid-token')
        ).rejects.toThrow(UnauthorizedException);

        expect(deviceAuthService.validateDevice).toHaveBeenCalledWith('invalid-token');
      });

      it('should handle device without vessel assignment', async () => {
        const deviceWithoutVessel = { ...mockDevice, vessel_id: null };
        deviceAuthService.validateDevice.mockResolvedValue(deviceWithoutVessel);

        await expect(
          controller.authenticate('vessel-null', 'null', 'device-auth-token')
        ).rejects.toThrow(UnauthorizedException);
      });

      it('should handle string vessel IDs correctly', async () => {
        const deviceWithStringId = { ...mockDevice, vessel_id: 42 };
        deviceAuthService.validateDevice.mockResolvedValue(deviceWithStringId);

        await expect(
          controller.authenticate('vessel-42', '42', 'device-auth-token')
        ).resolves.toBeUndefined();

        expect(deviceAuthService.validateDevice).toHaveBeenCalledWith('device-auth-token');
      });
    });

    describe('Edge cases', () => {
      it('should handle empty clientId', async () => {
        await expect(
          controller.authenticate('', 'api', 'mqtt_api_password')
        ).resolves.toBeUndefined();
      });

      it('should handle numeric username for non-vessel auth', async () => {
        deviceAuthService.validateDevice.mockRejectedValue(new UnauthorizedException());

        await expect(
          controller.authenticate('client-123', '123', 'some-token')
        ).rejects.toThrow(UnauthorizedException);
      });

      it('should handle special characters in credentials', async () => {
        const originalEnv = process.env.MQTT_API_PASSWORD;
        process.env.MQTT_API_PASSWORD = 'p@ssw0rd!#$%';

        await expect(
          controller.authenticate('api-client', 'api', 'p@ssw0rd!#$%')
        ).resolves.toBeUndefined();

        process.env.MQTT_API_PASSWORD = originalEnv;
      });
    });
  });
});