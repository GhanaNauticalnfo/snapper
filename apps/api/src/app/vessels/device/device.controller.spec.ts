import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DeviceController } from './device.controller';
import { DeviceAuthService } from './device-auth.service';
import { Device, DeviceState } from './device.entity';
import { DeviceResponseDto } from './dto/device-response.dto';
import { BadRequestException } from '@nestjs/common';

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
            deleteDevice: jest.fn(),
            activateDevice: jest.fn(),
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
        '(device.expires_at IS NULL OR device.expires_at > :now)', 
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
        '(device.expires_at IS NULL OR device.expires_at > :now)', 
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


  describe('activate', () => {
    it('should activate a device and return credentials', async () => {
      const activationResult = {
        device_id: 'test-device-id',
        device_token: 'test-device-token',
        auth_token: 'new-auth-token',
        vessel_id: 1,
      };
      
      deviceAuthService.activateDevice = jest.fn().mockResolvedValue(activationResult);

      const result = await controller.activate({ activation_token: 'test-activation-token' });

      expect(deviceAuthService.activateDevice).toHaveBeenCalledTimes(1);
      expect(deviceAuthService.activateDevice).toHaveBeenCalledWith('test-activation-token');
      expect(result).toEqual(activationResult);
    });

    it('should throw BadRequestException for invalid token', async () => {
      deviceAuthService.activateDevice = jest.fn().mockRejectedValue(
        new BadRequestException('Invalid or expired activation token')
      );

      await expect(
        controller.activate({ activation_token: 'invalid-token' })
      ).rejects.toThrow(BadRequestException);
      await expect(
        controller.activate({ activation_token: 'invalid-token' })
      ).rejects.toThrow('Invalid or expired activation token');
    });

    it('should throw BadRequestException for already activated device', async () => {
      deviceAuthService.activateDevice = jest.fn().mockRejectedValue(
        new BadRequestException('Device is already activated')
      );

      await expect(
        controller.activate({ activation_token: 'test-activation-token' })
      ).rejects.toThrow(BadRequestException);
      await expect(
        controller.activate({ activation_token: 'test-activation-token' })
      ).rejects.toThrow('Device is already activated');
    });
  });
});