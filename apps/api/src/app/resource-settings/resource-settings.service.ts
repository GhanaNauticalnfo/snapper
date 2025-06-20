import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { SettingType, ResourceType } from './entities/setting-type.entity';
import { ResourceSetting } from './entities/resource-setting.entity';
import { SettingTypeInputDto } from './dto/setting-type-input.dto';
import { SettingTypeResponseDto } from './dto/setting-type-response.dto';
import { ResourceSettingInputDto } from './dto/resource-setting-input.dto';
import { ResourceSettingsMapResponseDto } from './dto/resource-setting-response.dto';

@Injectable()
export class ResourceSettingsService {
  constructor(
    @InjectRepository(SettingType)
    private settingTypeRepository: Repository<SettingType>,
    @InjectRepository(ResourceSetting)
    private resourceSettingRepository: Repository<ResourceSetting>,
    private dataSource: DataSource
  ) {}

  private validateResourceType(resourceType: string): ResourceType {
    const validTypes: ResourceType[] = ['vessel', 'route', 'landing_site', 'vessel_type'];
    if (!validTypes.includes(resourceType as ResourceType)) {
      throw new BadRequestException(`Invalid resource type: ${resourceType}. Valid types are: ${validTypes.join(', ')}`);
    }
    return resourceType as ResourceType;
  }

  async findAllSettingTypes(resourceType: string): Promise<SettingTypeResponseDto[]> {
    const validatedType = this.validateResourceType(resourceType);
    
    const settingTypes = await this.settingTypeRepository.find({
      where: { resource_type: validatedType },
      order: { setting_key: 'ASC' }
    });

    return settingTypes.map(type => type.toResponseDto());
  }

  async createSettingType(
    resourceType: string, 
    dto: SettingTypeInputDto
  ): Promise<SettingTypeResponseDto> {
    const validatedType = this.validateResourceType(resourceType);
    
    const maxKey = await this.settingTypeRepository
      .createQueryBuilder('st')
      .select('MAX(CAST(st.setting_key AS INTEGER))', 'max')
      .where('st.resource_type = :resourceType', { resourceType: validatedType })
      .getRawOne();
    
    const nextKey = (parseInt(maxKey?.max || '0') + 1).toString();

    const settingType = this.settingTypeRepository.create({
      resource_type: validatedType,
      setting_key: nextKey,
      display_name: dto.display_name,
      data_type: dto.data_type || 'string',
      is_required: dto.is_required || false
    });

    try {
      const saved = await this.settingTypeRepository.save(settingType);
      return saved.toResponseDto();
    } catch (error) {
      if (error.code === '23505') {
        throw new ConflictException('Setting type with this key already exists');
      }
      throw error;
    }
  }

  async updateSettingType(
    resourceType: string,
    settingKey: string,
    dto: SettingTypeInputDto
  ): Promise<SettingTypeResponseDto> {
    const validatedType = this.validateResourceType(resourceType);
    
    const settingType = await this.settingTypeRepository.findOne({
      where: { 
        resource_type: validatedType,
        setting_key: settingKey
      }
    });

    if (!settingType) {
      throw new NotFoundException(`Setting type not found for resource type ${resourceType} with key ${settingKey}`);
    }

    settingType.display_name = dto.display_name;
    if (dto.data_type !== undefined) {
      settingType.data_type = dto.data_type;
    }
    if (dto.is_required !== undefined) {
      settingType.is_required = dto.is_required;
    }

    const updated = await this.settingTypeRepository.save(settingType);
    return updated.toResponseDto();
  }

  async deleteSettingType(
    resourceType: string,
    settingKey: string
  ): Promise<void> {
    const validatedType = this.validateResourceType(resourceType);
    
    const result = await this.settingTypeRepository.delete({
      resource_type: validatedType,
      setting_key: settingKey
    });

    if (result.affected === 0) {
      throw new NotFoundException(`Setting type not found for resource type ${resourceType} with key ${settingKey}`);
    }
  }

  async getResourceSettings(
    resourceType: string,
    resourceId: number
  ): Promise<ResourceSettingsMapResponseDto> {
    const validatedType = this.validateResourceType(resourceType);
    
    const settings = await this.resourceSettingRepository.find({
      where: {
        resource_type: validatedType,
        resource_id: resourceId
      }
    });

    const settingsMap: Record<string, string> = {};
    settings.forEach(setting => {
      settingsMap[setting.setting_key] = setting.value;
    });

    return { settings: settingsMap };
  }

  async updateResourceSettings(
    resourceType: string,
    resourceId: number,
    dto: ResourceSettingInputDto
  ): Promise<ResourceSettingsMapResponseDto> {
    const validatedType = this.validateResourceType(resourceType);
    
    const settingTypes = await this.settingTypeRepository.find({
      where: { resource_type: validatedType }
    });

    const validKeys = settingTypes.map(st => st.setting_key);
    const invalidKeys = Object.keys(dto.settings).filter(key => !validKeys.includes(key));
    
    if (invalidKeys.length > 0) {
      throw new BadRequestException(`Invalid setting keys: ${invalidKeys.join(', ')}`);
    }

    await this.dataSource.transaction(async manager => {
      for (const [key, value] of Object.entries(dto.settings)) {
        if (value === null || value === '') {
          await manager.delete(ResourceSetting, {
            resource_type: validatedType,
            resource_id: resourceId,
            setting_key: key
          });
        } else {
          const existing = await manager.findOne(ResourceSetting, {
            where: {
              resource_type: validatedType,
              resource_id: resourceId,
              setting_key: key
            }
          });

          if (existing) {
            existing.value = value;
            await manager.save(existing);
          } else {
            const newSetting = manager.create(ResourceSetting, {
              resource_type: validatedType,
              resource_id: resourceId,
              setting_key: key,
              value: value
            });
            await manager.save(newSetting);
          }
        }
      }
    });

    return this.getResourceSettings(resourceType, resourceId);
  }

  async deleteResourceSetting(
    resourceType: string,
    resourceId: number,
    settingKey: string
  ): Promise<void> {
    const validatedType = this.validateResourceType(resourceType);
    
    const result = await this.resourceSettingRepository.delete({
      resource_type: validatedType,
      resource_id: resourceId,
      setting_key: settingKey
    });

    if (result.affected === 0) {
      throw new NotFoundException(`Setting not found for resource`);
    }
  }

  async getSettingsForResource(resourceType: ResourceType, resourceId: number): Promise<Record<string, string>> {
    const settings = await this.resourceSettingRepository.find({
      where: {
        resource_type: resourceType,
        resource_id: resourceId
      }
    });

    const settingsMap: Record<string, string> = {};
    settings.forEach(setting => {
      settingsMap[setting.setting_key] = setting.value;
    });

    return settingsMap;
  }
}