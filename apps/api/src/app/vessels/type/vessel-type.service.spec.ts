import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { VesselTypeService } from './vessel-type.service';
import { VesselType } from './vessel-type.entity';
import { Vessel } from '../vessel.entity';
import { VesselTypeInputDto } from './dto/vessel-type-input.dto';

describe('VesselTypeService', () => {
  let service: VesselTypeService;
  let repository: jest.Mocked<Repository<VesselType>>;

  const mockVesselType = {
    id: 1,
    name: 'Unspecified',
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-01-01'),
    vessels: [],
    toResponseDto: jest.fn().mockReturnValue({
      id: 1,
      name: 'Unspecified',
      created_at: '2024-01-01T00:00:00.000Z',
      updated_at: '2024-01-01T00:00:00.000Z',
      vessel_count: 0
    })
  } as unknown as VesselType;

  const mockVesselTypeCargo = {
    id: 2,
    name: 'Cargo',
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-01-01'),
    vessels: [],
    toResponseDto: jest.fn().mockReturnValue({
      id: 2,
      name: 'Cargo',
      created_at: '2024-01-01T00:00:00.000Z',
      updated_at: '2024-01-01T00:00:00.000Z',
      vessel_count: 0
    })
  } as unknown as VesselType;

  beforeEach(async () => {
    const mockRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
      findOneBy: jest.fn(),
      count: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VesselTypeService,
        {
          provide: getRepositoryToken(VesselType),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(Vessel),
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<VesselTypeService>(VesselTypeService);
    repository = module.get(getRepositoryToken(VesselType));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return all vessel types with vessel counts', async () => {
      const vesselTypes = [mockVesselType, mockVesselTypeCargo];
      repository.find.mockResolvedValue(vesselTypes);

      const result = await service.findAll();

      expect(repository.find).toHaveBeenCalledWith({
        relations: ['vessels'],
        order: { id: 'ASC' }
      });
      expect(result).toHaveLength(2);
      expect(mockVesselType.toResponseDto).toHaveBeenCalled();
      expect(mockVesselTypeCargo.toResponseDto).toHaveBeenCalled();
    });

    it('should return empty array when no vessel types exist', async () => {
      repository.find.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return a vessel type by id', async () => {
      repository.findOne.mockResolvedValue(mockVesselType);

      const result = await service.findOne(1);

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        relations: ['vessels']
      });
      expect(mockVesselType.toResponseDto).toHaveBeenCalled();
      expect(result).toEqual(mockVesselType.toResponseDto());
    });

    it('should throw BadRequestException when vessel type not found', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(BadRequestException);
      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: 999 },
        relations: ['vessels']
      });
    });
  });

  describe('create', () => {
    const createDto: VesselTypeInputDto = { name: 'Fishing Vessel' };
    
    it('should create a new vessel type', async () => {
      const newVesselType = {
        ...mockVesselType,
        id: 3,
        name: 'Fishing Vessel',
        toResponseDto: jest.fn().mockReturnValue({
          id: 3,
          name: 'Fishing Vessel',
          created_at: '2024-01-01T00:00:00.000Z',
          updated_at: '2024-01-01T00:00:00.000Z',
          vessel_count: 0
        })
      } as unknown as VesselType;

      repository.create.mockReturnValue(newVesselType);
      repository.save.mockResolvedValue(newVesselType);

      const result = await service.create(createDto);

      expect(repository.create).toHaveBeenCalledWith(createDto);
      expect(repository.save).toHaveBeenCalledWith(newVesselType);
      expect(newVesselType.toResponseDto).toHaveBeenCalled();
    });

    it('should handle duplicate name errors', async () => {
      const existingType = { ...mockVesselType, name: 'Fishing Vessel' };
      repository.findOne.mockResolvedValue(existingType);

      await expect(service.create(createDto)).rejects.toThrow(ConflictException);
    });

    it('should handle other database errors', async () => {
      repository.create.mockReturnValue(mockVesselType);
      repository.save.mockRejectedValue(new Error('Database error'));

      await expect(service.create(createDto)).rejects.toThrow('Database error');
    });
  });

  describe('update', () => {
    const updateDto: VesselTypeInputDto = { name: 'Updated Cargo' };

    it('should update a vessel type', async () => {
      const updatedVesselType = {
        ...mockVesselTypeCargo,
        name: 'Updated Cargo',
        updated_at: new Date('2024-01-02'),
        toResponseDto: jest.fn().mockReturnValue({
          id: 2,
          name: 'Updated Cargo',
          created_at: '2024-01-01T00:00:00.000Z',
          updated_at: '2024-01-02T00:00:00.000Z',
          vessel_count: 0
        })
      } as unknown as VesselType;

      repository.findOne.mockResolvedValue(mockVesselTypeCargo);
      repository.save.mockResolvedValue(updatedVesselType);

      const result = await service.update(2, updateDto);

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: 2 },
        relations: ['vessels']
      });
      expect(repository.save).toHaveBeenCalledWith({
        ...mockVesselTypeCargo,
        name: 'Updated Cargo'
      });
      expect(updatedVesselType.toResponseDto).toHaveBeenCalled();
    });

    it('should throw BadRequestException when trying to update vessel type ID 1', async () => {
      await expect(service.update(1, updateDto)).rejects.toThrow(
        new BadRequestException('Cannot rename the Unspecified vessel type')
      );
      
      expect(repository.findOne).not.toHaveBeenCalled();
      expect(repository.save).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when vessel type not found', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.update(999, updateDto)).rejects.toThrow(NotFoundException);
    });

    it('should handle duplicate name errors during update', async () => {
      repository.findOne.mockResolvedValue(mockVesselTypeCargo);
      repository.save.mockRejectedValue({
        code: '23505',
        constraint: 'UQ_vessel_type_name'
      });

      await expect(service.update(2, updateDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('remove', () => {
    it('should remove a vessel type', async () => {
      repository.findOneBy.mockResolvedValue(mockVesselTypeCargo);
      repository.remove.mockResolvedValue(mockVesselTypeCargo);

      await service.remove(2);

      expect(repository.findOneBy).toHaveBeenCalledWith({ id: 2 });
      expect(repository.remove).toHaveBeenCalledWith(mockVesselTypeCargo);
    });

    it('should throw BadRequestException when trying to delete vessel type ID 1', async () => {
      await expect(service.remove(1)).rejects.toThrow(
        new BadRequestException('Cannot delete the Unspecified vessel type')
      );
      
      expect(repository.findOneBy).not.toHaveBeenCalled();
      expect(repository.remove).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when vessel type not found', async () => {
      repository.findOneBy.mockResolvedValue(null);

      await expect(service.remove(999)).rejects.toThrow(NotFoundException);
    });

    it('should handle foreign key constraint violations', async () => {
      const vesselTypeWithVessels = {
        ...mockVesselTypeCargo,
        vessels: [{ id: 1 }] // Has associated vessels
      } as unknown as VesselType;
      
      repository.findOneBy.mockResolvedValue(vesselTypeWithVessels);
      repository.remove.mockRejectedValue({
        code: '23503', // Foreign key constraint violation
        constraint: 'FK_vessel_vessel_type'
      });

      await expect(service.remove(2)).rejects.toThrow(BadRequestException);
    });
  });

  describe('edge cases and validation', () => {
    it('should handle very long vessel type names', async () => {
      const longName = 'A'.repeat(31); // Exceeds 30 character limit
      const createDto: VesselTypeInputDto = { name: longName };
      
      repository.create.mockReturnValue(mockVesselType);
      repository.save.mockRejectedValue({
        code: '22001', // String data too long
      });

      await expect(service.create(createDto)).rejects.toThrow();
    });

    it('should handle empty string names', async () => {
      const createDto: VesselTypeInputDto = { name: '' };
      
      repository.create.mockReturnValue(mockVesselType);
      repository.save.mockRejectedValue({
        code: '23514', // Check constraint violation
      });

      await expect(service.create(createDto)).rejects.toThrow();
    });

    it('should handle whitespace-only names', async () => {
      const createDto: VesselTypeInputDto = { name: '   ' };
      
      repository.create.mockReturnValue(mockVesselType);
      repository.save.mockRejectedValue({
        code: '23514', // Check constraint violation
      });

      await expect(service.create(createDto)).rejects.toThrow();
    });

    it('should handle concurrent access scenarios', async () => {
      repository.findOne.mockResolvedValue(mockVesselTypeCargo);
      repository.save.mockRejectedValue({
        code: '40001', // Serialization failure
      });

      const updateDto: VesselTypeInputDto = { name: 'Updated Name' };
      await expect(service.update(2, updateDto)).rejects.toThrow();
    });
  });

  describe('performance and boundary conditions', () => {
    it('should handle large datasets efficiently', async () => {
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        ...mockVesselType,
        id: i + 1,
        name: `Type ${i + 1}`,
        toResponseDto: jest.fn().mockReturnValue({
          id: i + 1,
          name: `Type ${i + 1}`,
          created_at: '2024-01-01T00:00:00.000Z',
          updated_at: '2024-01-01T00:00:00.000Z',
          vessel_count: 0
        })
      })) as unknown as VesselType[];

      repository.find.mockResolvedValue(largeDataset);

      const start = Date.now();
      const result = await service.findAll();
      const duration = Date.now() - start;

      expect(result).toHaveLength(1000);
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should handle special characters in vessel type names', async () => {
      const specialNames = [
        'Fishing & Cargo',
        'Type (Commercial)',
        'Vessel-Type_1',
        'Åland Ferry',
        '货船', // Chinese characters
        'Рыболовное судно' // Cyrillic characters
      ];

      for (const name of specialNames) {
        const createDto: VesselTypeInputDto = { name };
        const vesselType = {
          ...mockVesselType,
          name,
          toResponseDto: jest.fn().mockReturnValue({
            id: 1,
            name,
            created_at: '2024-01-01T00:00:00.000Z',
            updated_at: '2024-01-01T00:00:00.000Z',
            vessel_count: 0
          })
        } as unknown as VesselType;

        repository.create.mockReturnValue(vesselType);
        repository.save.mockResolvedValue(vesselType);

        const result = await service.create(createDto);
        expect(result.name).toBe(name);
      }
    });
  });
});