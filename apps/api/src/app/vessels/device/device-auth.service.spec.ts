import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HttpException, HttpStatus } from '@nestjs/common';
import { DeviceAuthService } from './device-auth.service';
import { Device, DeviceState } from './device.entity';
import { DeviceGateway } from './device.gateway';

describe('DeviceAuthService', () => {
  let service: DeviceAuthService;
  let deviceRepository: jest.Mocked<Repository<Device>>;
  let deviceGateway: jest.Mocked<DeviceGateway>;

  const mockDevice: Partial<Device> = {
    device_id: 'test-device-id',
    device_token: 'test-device-token',
    activation_token: 'test-activation-token',
    auth_token: null,
    state: DeviceState.PENDING,
    activated_at: null,
    expires_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
    vessel_id: 1,
    created_at: new Date(),
    updated_at: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeviceAuthService,
        {
          provide: getRepositoryToken(Device),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            save: jest.fn(),
            delete: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: DeviceGateway,
          useValue: {
            emitDeviceActivated: jest.fn(),
            emitDeviceCreated: jest.fn(),
            emitDeviceRetired: jest.fn(),
            emitDeviceDeleted: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<DeviceAuthService>(DeviceAuthService);
    deviceRepository = module.get(getRepositoryToken(Device));
    deviceGateway = module.get(DeviceGateway);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createDevice', () => {
    it('should create a device successfully', async () => {
      deviceRepository.find.mockResolvedValue([]);
      deviceRepository.save.mockResolvedValue(mockDevice as Device);

      const result = await service.createDevice(1, 3);

      expect(deviceRepository.find).toHaveBeenCalledWith({
        where: { vessel_id: 1 }
      });
      expect(deviceRepository.save).toHaveBeenCalled();
      expect(result.state).toBe(DeviceState.PENDING);
      expect(result.vessel_id).toBe(1);
    });

    it('should emit device-created WebSocket event when device is created', async () => {
      deviceRepository.find.mockResolvedValue([]);
      deviceRepository.save.mockResolvedValue(mockDevice as Device);

      await service.createDevice(1, 3);

      expect(deviceGateway.emitDeviceCreated).toHaveBeenCalledWith(1, mockDevice);
    });

    it('should throw error if vessel already has an active device and pending device', async () => {
      const activeDevice = { ...mockDevice, state: DeviceState.ACTIVE };
      const pendingDevice = { ...mockDevice, state: DeviceState.PENDING };
      
      deviceRepository.find.mockResolvedValue([activeDevice, pendingDevice] as Device[]);

      await expect(service.createDevice(1, 3)).rejects.toThrow(
        new HttpException('Vessel already has a pending device. Please activate or delete it first.', HttpStatus.BAD_REQUEST)
      );
    });

    it('should throw error if vessel has multiple active devices', async () => {
      const activeDevice1 = { ...mockDevice, device_id: 'active-1', state: DeviceState.ACTIVE };
      const activeDevice2 = { ...mockDevice, device_id: 'active-2', state: DeviceState.ACTIVE };
      
      deviceRepository.find.mockResolvedValue([activeDevice1, activeDevice2] as Device[]);

      await expect(service.createDevice(1, 3)).rejects.toThrow(
        new HttpException('Vessel already has more than one active device. Please clean up first.', HttpStatus.BAD_REQUEST)
      );
    });

    it('should allow creating pending device when only one active device exists', async () => {
      const activeDevice = { ...mockDevice, state: DeviceState.ACTIVE };
      
      deviceRepository.find.mockResolvedValue([activeDevice] as Device[]);
      deviceRepository.save.mockResolvedValue(mockDevice as Device);

      const result = await service.createDevice(1, 3);

      expect(deviceRepository.save).toHaveBeenCalled();
      expect(result.state).toBe(DeviceState.PENDING);
    });

    it('should ignore expired pending devices when checking constraints', async () => {
      const expiredPendingDevice = { 
        ...mockDevice, 
        state: DeviceState.PENDING, 
        expires_at: new Date(Date.now() - 1000) // expired
      };
      
      deviceRepository.find.mockResolvedValue([expiredPendingDevice] as Device[]);
      deviceRepository.save.mockResolvedValue(mockDevice as Device);

      const result = await service.createDevice(1, 3);

      expect(deviceRepository.save).toHaveBeenCalled();
      expect(result.state).toBe(DeviceState.PENDING);
    });
  });

  describe('activateDevice', () => {
    it('should activate a device successfully', async () => {
      const pendingDevice = { 
        ...mockDevice, 
        state: DeviceState.PENDING,
        vessel: { name: 'Test Vessel' }
      };
      
      deviceRepository.findOne.mockResolvedValue(pendingDevice as Device);
      deviceRepository.save.mockResolvedValue({
        ...pendingDevice,
        state: DeviceState.ACTIVE,
        activated_at: new Date(),
        auth_token: 'generated-auth-token'
      } as Device);

      const result = await service.activateDevice('test-activation-token');

      expect(deviceRepository.findOne).toHaveBeenCalledWith({
        where: { activation_token: 'test-activation-token' },
        relations: ['vessel']
      });
      expect(result.auth_token).toBeDefined();
      expect(result.device_token).toBe('test-device-token');
      expect(result.vessel).toBe('Test Vessel');
    });

    it('should emit device-activated WebSocket event when device is activated', async () => {
      const pendingDevice = { 
        ...mockDevice, 
        state: DeviceState.PENDING,
        vessel: { name: 'Test Vessel' }
      };
      
      deviceRepository.findOne.mockResolvedValue(pendingDevice as Device);
      deviceRepository.save.mockImplementation((device) => Promise.resolve(device as Device));

      await service.activateDevice('test-activation-token');

      expect(deviceGateway.emitDeviceActivated).toHaveBeenCalledWith(
        1, 
        expect.objectContaining({
          device_id: 'test-device-id',
          state: DeviceState.ACTIVE,
          activated_at: expect.any(Date),
          auth_token: expect.any(String)
        })
      );
    });

    it('should throw error for invalid activation token', async () => {
      deviceRepository.findOne.mockResolvedValue(null);

      await expect(service.activateDevice('invalid-token')).rejects.toThrow(
        new HttpException('Invalid activation token', HttpStatus.NOT_FOUND)
      );
    });

    it('should throw error for already activated device', async () => {
      const activeDevice = { 
        ...mockDevice, 
        state: DeviceState.ACTIVE 
      };
      
      deviceRepository.findOne.mockResolvedValue(activeDevice as Device);

      await expect(service.activateDevice('test-activation-token')).rejects.toThrow(
        new HttpException('Token already activated', HttpStatus.GONE)
      );
    });

    it('should throw error for expired activation token', async () => {
      const expiredDevice = { 
        ...mockDevice, 
        expires_at: new Date(Date.now() - 1000) // expired
      };
      
      deviceRepository.findOne.mockResolvedValue(expiredDevice as Device);

      await expect(service.activateDevice('test-activation-token')).rejects.toThrow(
        HttpException
      );
    });
  });

  describe('validateDevice', () => {
    it('should validate an active device successfully', async () => {
      const activeDevice = { 
        ...mockDevice, 
        auth_token: 'valid-auth-token',
        state: DeviceState.ACTIVE,
        vessel: { name: 'Test Vessel' }
      };
      
      deviceRepository.findOne.mockResolvedValue(activeDevice as Device);

      const result = await service.validateDevice('valid-auth-token');

      expect(deviceRepository.findOne).toHaveBeenCalledWith({
        where: { 
          auth_token: 'valid-auth-token',
          state: DeviceState.ACTIVE
        },
        relations: ['vessel']
      });
      expect(result).toBe(activeDevice);
    });

    it('should throw error for invalid auth token', async () => {
      deviceRepository.findOne.mockResolvedValue(null);

      await expect(service.validateDevice('invalid-auth-token')).rejects.toThrow(
        'Invalid device token'
      );
    });
  });

  describe('getDevicesByVessel', () => {
    it('should return devices grouped by state', async () => {
      const activeDevice = { 
        ...mockDevice, 
        device_id: 'active-device',
        state: DeviceState.ACTIVE 
      };
      const pendingDevice = { 
        ...mockDevice, 
        device_id: 'pending-device',
        state: DeviceState.PENDING 
      };
      const retiredDevice = { 
        ...mockDevice, 
        device_id: 'retired-device',
        state: DeviceState.RETIRED 
      };
      
      deviceRepository.find.mockResolvedValue([
        activeDevice, 
        pendingDevice, 
        retiredDevice
      ] as Device[]);

      const result = await service.getDevicesByVessel(1);

      expect(result.active?.device_id).toBe('active-device');
      expect(result.pending?.device_id).toBe('pending-device');
      expect(result.retired).toHaveLength(1);
      expect(result.retired[0].device_id).toBe('retired-device');
    });

    it('should handle expired pending devices', async () => {
      const expiredPendingDevice = { 
        ...mockDevice, 
        device_id: 'expired-pending',
        state: DeviceState.PENDING,
        expires_at: new Date(Date.now() - 1000) // expired
      };
      
      deviceRepository.find.mockResolvedValue([expiredPendingDevice] as Device[]);

      const result = await service.getDevicesByVessel(1);

      expect(result.active).toBeNull();
      expect(result.pending).toBeNull(); // expired pending devices are not returned
      expect(result.retired).toHaveLength(0);
    });
  });


  describe('deleteDevice', () => {
    it('should delete a pending device successfully', async () => {
      const pendingDevice = { 
        ...mockDevice, 
        state: DeviceState.PENDING 
      };
      
      deviceRepository.findOne.mockResolvedValue(pendingDevice as Device);
      deviceRepository.delete.mockResolvedValue({ affected: 1 } as any);

      await service.deleteDevice('test-device-id');

      expect(deviceRepository.delete).toHaveBeenCalledWith({ device_id: 'test-device-id' });
    });

    it('should emit device-deleted WebSocket event when pending device is deleted', async () => {
      const pendingDevice = { 
        ...mockDevice, 
        state: DeviceState.PENDING,
        vessel_id: 1
      };
      
      deviceRepository.findOne.mockResolvedValue(pendingDevice as Device);
      deviceRepository.delete.mockResolvedValue({ affected: 1 } as any);

      await service.deleteDevice('test-device-id');

      expect(deviceGateway.emitDeviceDeleted).toHaveBeenCalledWith(1, 'test-device-id');
    });

    it('should delete a retired device successfully', async () => {
      const retiredDevice = { 
        ...mockDevice, 
        state: DeviceState.RETIRED 
      };
      
      deviceRepository.findOne.mockResolvedValue(retiredDevice as Device);
      deviceRepository.delete.mockResolvedValue({ affected: 1 } as any);

      await service.deleteDevice('test-device-id');

      expect(deviceRepository.delete).toHaveBeenCalledWith({ device_id: 'test-device-id' });
    });

    it('should retire active device instead of deleting', async () => {
      const activeDevice = { 
        ...mockDevice, 
        state: DeviceState.ACTIVE,
        auth_token: 'active-auth-token'
      };
      
      deviceRepository.findOne.mockResolvedValue(activeDevice as Device);
      deviceRepository.save.mockResolvedValue({
        ...activeDevice,
        state: DeviceState.RETIRED,
        auth_token: null
      } as Device);

      await service.deleteDevice('test-device-id');

      expect(deviceRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          device_id: 'test-device-id',
          state: DeviceState.RETIRED,
          auth_token: null
        })
      );
      expect(deviceRepository.delete).not.toHaveBeenCalled();
    });

    it('should emit device-retired WebSocket event when active device is retired', async () => {
      const activeDevice = { 
        ...mockDevice, 
        state: DeviceState.ACTIVE,
        auth_token: 'active-auth-token',
        vessel_id: 1
      };
      
      deviceRepository.findOne.mockResolvedValue(activeDevice as Device);
      deviceRepository.save.mockResolvedValue({
        ...activeDevice,
        state: DeviceState.RETIRED,
        auth_token: null
      } as Device);

      await service.deleteDevice('test-device-id');

      expect(deviceGateway.emitDeviceRetired).toHaveBeenCalledWith(1, 'test-device-id');
    });

    it('should throw error when device not found', async () => {
      deviceRepository.findOne.mockResolvedValue(null);

      await expect(service.deleteDevice('non-existent-id')).rejects.toThrow(
        new HttpException('Device not found', HttpStatus.NOT_FOUND)
      );
    });
  });
});