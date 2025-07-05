import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DeviceController } from './device.controller';
import { DeviceAuthService } from './device-auth.service';
import { Device, DeviceState } from './device.entity';
import { DeviceResponseDto } from './dto/device-response.dto';

describe('DeviceController', () => {
  let controller: DeviceController;
  let deviceAuthService: jest.Mocked<DeviceAuthService>;
  let deviceRepository: jest.Mocked<Repository<Device>>;

  const createMockDevice = (overrides: Partial<Device> = {}): Device => {
    const baseDevice = {
      device_id: 'test-device-id',
      device_token: 'test-device-token',
      activation_token: 'test-activation-token',
      auth_token: null,
      state: DeviceState.PENDING,
      activated_at: null,
      expires_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      vessel_id: 1,
      vessel: null,
      created_at: new Date(),
      updated_at: new Date(),
      ...overrides
    };
    
    return {
      ...baseDevice,
      toResponseDto: jest.fn().mockReturnValue({
        device_id: baseDevice.device_id,
        device_token: baseDevice.device_token,
        activation_token: baseDevice.activation_token,
        auth_token: baseDevice.auth_token || undefined,
        state: baseDevice.state,
        activated_at: baseDevice.activated_at || undefined,
        expires_at: baseDevice.expires_at || undefined,
        created_at: baseDevice.created_at,
        updated_at: baseDevice.updated_at,
        vessel: baseDevice.vessel ? {
          id: baseDevice.vessel.id,
          name: baseDevice.vessel.name
        } : undefined,
        activation_url: `ghmaritimeapp://auth?token=${baseDevice.activation_token}`
      } as DeviceResponseDto)
    } as Device;
  };

  const mockDevice = createMockDevice();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DeviceController],
      providers: [
        {
          provide: DeviceAuthService,
          useValue: {
            createDevice: jest.fn(),
            retireDevice: jest.fn(),
            deleteDevice: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Device),
          useValue: {
            findOne: jest.fn(),
            createQueryBuilder: jest.fn(() => ({
              leftJoinAndSelect: jest.fn().mockReturnThis(),
              andWhere: jest.fn().mockReturnThis(),
              orderBy: jest.fn().mockReturnThis(),
              getMany: jest.fn(),
            })),
          },
        },
      ],
    }).compile();

    controller = module.get<DeviceController>(DeviceController);
    deviceAuthService = module.get(DeviceAuthService);
    deviceRepository = module.get(getRepositoryToken(Device));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return all devices with default filters', async () => {
      const mockDevices = [mockDevice];
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockDevices),
      };
      
      deviceRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      const result = await controller.findAll();

      expect(deviceRepository.createQueryBuilder).toHaveBeenCalledWith('device');
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith('device.vessel', 'vessel');
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'device.expires_at IS NULL OR device.expires_at > :now', 
        { now: expect.any(Date) }
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'device.state != :retiredState', 
        { retiredState: 'retired' }
      );
      expect(result).toEqual([mockDevice.toResponseDto()]);
    });

    it('should include retired devices when requested', async () => {
      const mockDevices = [mockDevice];
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockDevices),
      };
      
      deviceRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      await controller.findAll(undefined, 'true');

      expect(mockQueryBuilder.andWhere).not.toHaveBeenCalledWith(
        'device.state != :retiredState', 
        { retiredState: 'retired' }
      );
    });

    it('should filter by vessel_id when provided', async () => {
      const mockDevices = [mockDevice];
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockDevices),
      };
      
      deviceRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      await controller.findAll(undefined, undefined, 1);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'device.vessel_id = :vesselId', 
        { vesselId: 1 }
      );
    });

    it('should include expired devices when requested', async () => {
      const mockDevices = [mockDevice];
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockDevices),
      };
      
      deviceRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      await controller.findAll('true');

      expect(mockQueryBuilder.andWhere).not.toHaveBeenCalledWith(
        'device.expires_at IS NULL OR device.expires_at > :now', 
        { now: expect.any(Date) }
      );
    });
  });

  describe('findOne', () => {
    it('should return a device by ID', async () => {
      deviceRepository.findOne.mockResolvedValue(mockDevice);

      const result = await controller.findOne('test-device-id');

      expect(deviceRepository.findOne).toHaveBeenCalledWith({
        where: { device_id: 'test-device-id' },
        relations: ['vessel']
      });
      expect(result).toEqual(mockDevice.toResponseDto());
    });
  });

  describe('create', () => {
    it('should create a new device with activation URL', async () => {
      const createdDevice = createMockDevice();
      deviceAuthService.createDevice.mockResolvedValue(createdDevice);

      const result = await controller.create({ vessel_id: 1, expires_in_days: 3 });

      expect(deviceAuthService.createDevice).toHaveBeenCalledWith(1, 3);
      expect(result).toEqual(createdDevice.toResponseDto(true));
    });

    it('should use default expiration when not provided', async () => {
      const createdDevice = createMockDevice();
      deviceAuthService.createDevice.mockResolvedValue(createdDevice);

      await controller.create({ vessel_id: 1 });

      expect(deviceAuthService.createDevice).toHaveBeenCalledWith(1, 30);
    });
  });

  describe('remove', () => {
    it('should delete a device successfully', async () => {
      deviceAuthService.deleteDevice.mockResolvedValue();

      const result = await controller.remove('test-device-id');

      expect(deviceAuthService.deleteDevice).toHaveBeenCalledWith('test-device-id');
      expect(result).toEqual({ success: true });
    });
  });

  describe('retire', () => {
    it('should retire an active device successfully', async () => {
      const retiredDevice = createMockDevice({ state: DeviceState.RETIRED });
      deviceAuthService.retireDevice.mockResolvedValue(retiredDevice);

      const result = await controller.retire('test-device-id');

      expect(deviceAuthService.retireDevice).toHaveBeenCalledWith('test-device-id');
      expect(result).toEqual(retiredDevice.toResponseDto());
    });
  });

  describe('revoke (deprecated)', () => {
    it('should retire device for backward compatibility', async () => {
      const retiredDevice = createMockDevice({ state: DeviceState.RETIRED });
      deviceAuthService.retireDevice.mockResolvedValue(retiredDevice);

      const result = await controller.revoke('test-device-id');

      expect(deviceAuthService.retireDevice).toHaveBeenCalledWith('test-device-id');
      expect(result).toEqual({ success: true, device: retiredDevice.toResponseDto() });
    });
  });

  describe('regenerate', () => {
    it('should regenerate device token successfully', async () => {
      const existingDevice = createMockDevice();
      const newDevice = createMockDevice({ device_id: 'new-device-id' });
      
      deviceRepository.findOne.mockResolvedValue(existingDevice);
      deviceAuthService.createDevice.mockResolvedValue(newDevice);
      deviceAuthService.deleteDevice.mockResolvedValue();

      const result = await controller.regenerate('test-device-id');

      expect(deviceRepository.findOne).toHaveBeenCalledWith({
        where: { device_id: 'test-device-id' }
      });
      expect(deviceAuthService.createDevice).toHaveBeenCalledWith(1, 3);
      expect(deviceAuthService.deleteDevice).toHaveBeenCalledWith('test-device-id');
      expect(result).toEqual(newDevice.toResponseDto(true));
    });

    it('should throw error when device not found', async () => {
      deviceRepository.findOne.mockResolvedValue(null);

      await expect(controller.regenerate('non-existent-id')).rejects.toThrow('Device not found');
    });
  });
});