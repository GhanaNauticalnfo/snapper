import { Injectable, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VesselType } from './vessel-type.entity';
import { Vessel } from '../vessel.entity';
import { VesselTypeInputDto } from './dto/vessel-type-input.dto';
import { VesselTypeResponseDto } from './dto/vessel-type-response.dto';
import { ResourceSettingsService } from '../../resource-settings/resource-settings.service';
import { SyncService } from '../../sync/sync.service';

@Injectable()
export class VesselTypeService {
  constructor(
    @InjectRepository(VesselType)
    private vesselTypeRepository: Repository<VesselType>,
    @InjectRepository(Vessel)
    private vesselRepository: Repository<Vessel>,
    private resourceSettingsService: ResourceSettingsService,
    private syncService: SyncService,
  ) {}

  async findAll(): Promise<VesselTypeResponseDto[]> {
    const vesselTypes = await this.vesselTypeRepository.find({
      relations: ['vessels'],
      order: {
        id: 'ASC' // ID 1 (Unspecified) first, then others
      }
    });

    const result = [];
    for (const type of vesselTypes) {
      const settings = await this.resourceSettingsService.getSettingsForResource('vessel_type', type.id);
      result.push(type.toResponseDto(settings));
    }

    return result;
  }

  async findOne(id: number): Promise<VesselTypeResponseDto> {
    const vesselType = await this.vesselTypeRepository.findOne({ 
      where: { id },
      relations: ['vessels']
    });
    
    if (!vesselType) {
      throw new BadRequestException(`Vessel type with ID ${id} not found`);
    }
    
    const settings = await this.resourceSettingsService.getSettingsForResource('vessel_type', vesselType.id);
    return vesselType.toResponseDto(settings);
  }

  async create(dto: VesselTypeInputDto): Promise<VesselTypeResponseDto> {
    // Check if name already exists
    const existingType = await this.vesselTypeRepository.findOne({
      where: { name: dto.name }
    });
    
    if (existingType) {
      throw new ConflictException(`Vessel type with name '${dto.name}' already exists`);
    }

    const vesselType = this.vesselTypeRepository.create({
      name: dto.name,
      color: dto.color
    });
    
    const saved = await this.vesselTypeRepository.save(vesselType);
    
    // Log sync change with full vessel type list
    const allTypes = await this.getAllVesselTypesForSync();
    await this.syncService.logChange(
      'vessel_types',
      'all',
      'update',
      allTypes
    );
    
    // Load with empty vessels array for consistent response
    saved.vessels = [];
    return saved.toResponseDto();
  }

  async update(id: number, dto: VesselTypeInputDto): Promise<VesselTypeResponseDto> {
    // Prevent renaming the Unspecified type
    if (id === 1) {
      throw new BadRequestException('Cannot rename the Unspecified vessel type');
    }

    // Use transaction to ensure both vessel type update and sync log are atomic
    return await this.vesselTypeRepository.manager.transaction(async manager => {
      const vesselType = await manager.findOne(VesselType, {
        where: { id },
        relations: ['vessels']
      });
      
      if (!vesselType) {
        throw new BadRequestException(`Vessel type with ID ${id} not found`);
      }
      
      // Check if new name already exists (excluding current record)
      if (dto.name !== vesselType.name) {
        const existingType = await manager.findOne(VesselType, {
          where: { name: dto.name }
        });
        
        if (existingType) {
          throw new ConflictException(`Vessel type with name '${dto.name}' already exists`);
        }
      }

      vesselType.name = dto.name;
      if (dto.color !== undefined) {
        vesselType.color = dto.color;
      }
      const saved = await manager.save(vesselType);
      
      // Get all vessel types for sync (within transaction to ensure consistency)
      const allTypes = await manager.find(VesselType, {
        order: { id: 'ASC' }
      });
      
      const syncData = allTypes.map(type => ({
        id: type.id,
        name: type.name,
        color: type.color
      }));
      
      // Log sync change within the transaction
      await this.syncService.logChangeInTransaction(
        manager,
        'vessel_types',
        'all',
        'update',
        syncData
      );
      
      return saved.toResponseDto();
    });
  }

  async remove(id: number): Promise<void> {
    // Prevent deletion of the Unspecified type
    if (id === 1) {
      throw new BadRequestException('Cannot delete the Unspecified vessel type');
    }

    const vesselType = await this.vesselTypeRepository.findOne({
      where: { id }
    });
    
    if (!vesselType) {
      throw new BadRequestException(`Vessel type with ID ${id} not found`);
    }
    
    // Use transaction to ensure data consistency
    await this.vesselTypeRepository.manager.transaction(async manager => {
      // Get the Unspecified type to set as the new relation
      const unspecifiedType = await manager.findOne(VesselType, { where: { id: 1 } });
      
      // Update all vessels using this type to use the Unspecified type
      await manager
        .createQueryBuilder()
        .update(Vessel)
        .set({ vessel_type: unspecifiedType })
        .where('vessel_type_id = :id', { id })
        .execute();
      
      // Delete the vessel type
      await manager.delete(VesselType, { id });
      
      // Get all remaining vessel types for sync
      const allTypes = await manager.find(VesselType, {
        order: { id: 'ASC' }
      });
      
      const syncData = allTypes.map(type => ({
        id: type.id,
        name: type.name,
        color: type.color
      }));
      
      // Log sync change within the transaction
      await this.syncService.logChangeInTransaction(
        manager,
        'vessel_types',
        'all',
        'update',
        syncData
      );
    });
  }

  private async getAllVesselTypesForSync(): Promise<any[]> {
    const vesselTypes = await this.vesselTypeRepository.find({
      order: { id: 'ASC' }
    });
    
    return vesselTypes.map(type => ({
      id: type.id,
      name: type.name,
      color: type.color
    }));
  }
}