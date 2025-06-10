import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { VesselTypeController } from './vessel-type.controller';
import { VesselTypeService } from './vessel-type.service';
import { VesselTypeInputDto } from './dto/vessel-type-input.dto';
import { VesselTypeResponseDto } from './dto/vessel-type-response.dto';

describe('VesselTypeController (Unit)', () => {
  let controller: VesselTypeController;
  let service: jest.Mocked<VesselTypeService>;

  const mockVesselTypeResponse: VesselTypeResponseDto = {
    id: 1,
    name: 'Cargo',
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
    vessel_count: 2
  };

  const mockVesselTypesResponse: VesselTypeResponseDto[] = [
    {
      id: 1,
      name: 'Unspecified',
      created_at: '2024-01-01T00:00:00.000Z',
      updated_at: '2024-01-01T00:00:00.000Z',
      vessel_count: 0
    },
    mockVesselTypeResponse
  ];

  beforeEach(async () => {
    const mockService = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [VesselTypeController],
      providers: [
        {
          provide: VesselTypeService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<VesselTypeController>(VesselTypeController);
    service = module.get(VesselTypeService);
  });

  describe('findAll', () => {
    it('should return all vessel types', async () => {
      service.findAll.mockResolvedValue(mockVesselTypesResponse);

      const result = await controller.findAll();

      expect(result).toEqual(mockVesselTypesResponse);
      expect(service.findAll).toHaveBeenCalledTimes(1);
    });

    it('should return empty array when no vessel types exist', async () => {
      service.findAll.mockResolvedValue([]);

      const result = await controller.findAll();

      expect(result).toEqual([]);
      expect(service.findAll).toHaveBeenCalledTimes(1);
    });
  });

  describe('findOne', () => {
    it('should return a vessel type by id', async () => {
      service.findOne.mockResolvedValue(mockVesselTypeResponse);

      const result = await controller.findOne(1);

      expect(result).toEqual(mockVesselTypeResponse);
      expect(service.findOne).toHaveBeenCalledWith(1);
    });

    it('should throw NotFoundException when vessel type not found', async () => {
      service.findOne.mockRejectedValue(new NotFoundException('Vessel type not found'));

      await expect(controller.findOne(999)).rejects.toThrow(NotFoundException);
      expect(service.findOne).toHaveBeenCalledWith(999);
    });
  });

  describe('create', () => {
    const createDto: VesselTypeInputDto = { name: 'Fishing Vessel' };

    it('should create a new vessel type', async () => {
      const newVesselType: VesselTypeResponseDto = {
        id: 3,
        name: 'Fishing Vessel',
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
        vessel_count: 0
      };

      service.create.mockResolvedValue(newVesselType);

      const result = await controller.create(createDto);

      expect(result).toEqual(newVesselType);
      expect(service.create).toHaveBeenCalledWith(createDto);
    });

    it('should handle duplicate name errors', async () => {
      service.create.mockRejectedValue(new BadRequestException('Vessel type name already exists'));

      await expect(controller.create(createDto)).rejects.toThrow(BadRequestException);
      expect(service.create).toHaveBeenCalledWith(createDto);
    });
  });

  describe('update', () => {
    const updateDto: VesselTypeInputDto = { name: 'Updated Cargo' };

    it('should update a vessel type', async () => {
      const updatedVesselType: VesselTypeResponseDto = {
        ...mockVesselTypeResponse,
        name: 'Updated Cargo',
        updated_at: '2024-01-02T00:00:00.000Z'
      };

      service.update.mockResolvedValue(updatedVesselType);

      const result = await controller.update(2, updateDto);

      expect(result).toEqual(updatedVesselType);
      expect(service.update).toHaveBeenCalledWith(2, updateDto);
    });

    it('should prevent updating vessel type ID 1', async () => {
      service.update.mockRejectedValue(new BadRequestException('Cannot rename the Unspecified vessel type'));

      await expect(controller.update(1, updateDto)).rejects.toThrow(BadRequestException);
      expect(service.update).toHaveBeenCalledWith(1, updateDto);
    });

    it('should throw NotFoundException when vessel type not found', async () => {
      service.update.mockRejectedValue(new NotFoundException('Vessel type not found'));

      await expect(controller.update(999, updateDto)).rejects.toThrow(NotFoundException);
      expect(service.update).toHaveBeenCalledWith(999, updateDto);
    });
  });

  describe('remove', () => {
    it('should delete a vessel type', async () => {
      service.remove.mockResolvedValue(undefined);

      await controller.remove(2);

      expect(service.remove).toHaveBeenCalledWith(2);
    });

    it('should prevent deleting vessel type ID 1', async () => {
      service.remove.mockRejectedValue(new BadRequestException('Cannot delete the Unspecified vessel type'));

      await expect(controller.remove(1)).rejects.toThrow(BadRequestException);
      expect(service.remove).toHaveBeenCalledWith(1);
    });

    it('should throw NotFoundException when vessel type not found', async () => {
      service.remove.mockRejectedValue(new NotFoundException('Vessel type not found'));

      await expect(controller.remove(999)).rejects.toThrow(NotFoundException);
      expect(service.remove).toHaveBeenCalledWith(999);
    });

    it('should handle foreign key constraint violations', async () => {
      service.remove.mockRejectedValue(new BadRequestException('Cannot delete vessel type: vessels are using this type'));

      await expect(controller.remove(2)).rejects.toThrow(BadRequestException);
      expect(service.remove).toHaveBeenCalledWith(2);
    });
  });

  describe('ID 1 Protection', () => {
    it('should consistently protect ID 1 from updates', async () => {
      const protectionError = new BadRequestException('Cannot rename the Unspecified vessel type');
      service.update.mockRejectedValue(protectionError);

      const updateAttempts = [
        'New Name',
        'Modified Unspecified',
        'System',
        'Default'
      ];

      for (const name of updateAttempts) {
        await expect(controller.update(1, { name })).rejects.toThrow(BadRequestException);
        expect(service.update).toHaveBeenCalledWith(1, { name });
      }
    });

    it('should consistently protect ID 1 from deletion', async () => {
      const protectionError = new BadRequestException('Cannot delete the Unspecified vessel type');
      service.remove.mockRejectedValue(protectionError);

      await expect(controller.remove(1)).rejects.toThrow(BadRequestException);
      expect(service.remove).toHaveBeenCalledWith(1);
    });

    it('should allow normal operations on other IDs', async () => {
      service.update.mockResolvedValue({
        id: 2,
        name: 'Updated Name',
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-02T00:00:00.000Z',
        vessel_count: 0
      });
      service.remove.mockResolvedValue(undefined);

      // Should work for other IDs
      await controller.update(2, { name: 'Updated Name' });
      await controller.remove(2);

      expect(service.update).toHaveBeenCalledWith(2, { name: 'Updated Name' });
      expect(service.remove).toHaveBeenCalledWith(2);
    });
  });

  describe('Error Handling', () => {
    it('should handle service errors gracefully', async () => {
      const testCases = [
        { method: 'findAll', params: [], error: new Error('Database error') },
        { method: 'findOne', params: [1], error: new NotFoundException('Not found') },
        { method: 'create', params: [{ name: 'Test' }], error: new BadRequestException('Validation error') },
        { method: 'update', params: [1, { name: 'Test' }], error: new Error('Update error') },
        { method: 'remove', params: [1], error: new Error('Delete error') }
      ];

      for (const testCase of testCases) {
        service[testCase.method].mockRejectedValue(testCase.error);

        await expect(controller[testCase.method](...testCase.params)).rejects.toThrow(testCase.error);
      }
    });

    it('should handle invalid input types gracefully', async () => {
      // Test with invalid DTO - this would be caught by validation pipes in real app
      const invalidDto = { name: 123 } as any;
      service.create.mockRejectedValue(new BadRequestException('Validation failed'));

      await expect(controller.create(invalidDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('Performance', () => {
    it('should handle concurrent requests efficiently', async () => {
      service.findAll.mockResolvedValue(mockVesselTypesResponse);

      const concurrentRequests = Array.from({ length: 10 }, () => controller.findAll());
      const results = await Promise.all(concurrentRequests);

      results.forEach(result => {
        expect(result).toEqual(mockVesselTypesResponse);
      });
      expect(service.findAll).toHaveBeenCalledTimes(10);
    });

    it('should respond quickly to simple operations', async () => {
      service.findOne.mockResolvedValue(mockVesselTypeResponse);

      const start = Date.now();
      await controller.findOne(1);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(100); // Should be very fast for unit tests
    });
  });
});