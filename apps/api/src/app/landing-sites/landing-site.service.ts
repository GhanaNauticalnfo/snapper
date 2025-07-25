import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike, FindOptionsOrder } from 'typeorm';
import { LandingSite } from './landing-site.entity';
import { CreateLandingSiteDto } from './dto/create-landing-site.dto';
import { UpdateLandingSiteDto } from './dto/update-landing-site.dto';
import { SyncService } from '../sync/sync.service';
import { LandingSiteResponseDto } from './dto/landing-site-response.dto';
import { ResourceSettingsService } from '../resource-settings/resource-settings.service';

@Injectable()
export class LandingSiteService {
  constructor(
    @InjectRepository(LandingSite)
    private landingSiteRepository: Repository<LandingSite>,
    private syncService: SyncService,
    private resourceSettingsService: ResourceSettingsService,
  ) {}

  async findAll(search?: string): Promise<LandingSiteResponseDto[]> {
    const where: any = {};
    if (search) {
      where.name = ILike(`%${search}%`);
    }

    const landingSites = await this.landingSiteRepository.find({
      where,
      order: { updated_at: 'DESC' },
    });
    
    const result = [];
    for (const site of landingSites) {
      const settings = await this.resourceSettingsService.getSettingsForResource('landing_site', site.id);
      result.push(site.toResponseDto(settings));
    }
    
    return result;
  }


  async findOne(id: number): Promise<LandingSiteResponseDto> {
    const landingSite = await this.landingSiteRepository.findOne({ where: { id } });
    if (!landingSite) {
      throw new NotFoundException(`Landing site with ID ${id} not found`);
    }
    const settings = await this.resourceSettingsService.getSettingsForResource('landing_site', landingSite.id);
    return landingSite.toResponseDto(settings);
  }

  async findEnabled(): Promise<LandingSiteResponseDto[]> {
    const landingSites = await this.landingSiteRepository.find({
      where: { status: 'active' },
      order: { name: 'ASC' },
    });
    
    const result = [];
    for (const site of landingSites) {
      const settings = await this.resourceSettingsService.getSettingsForResource('landing_site', site.id);
      result.push(site.toResponseDto(settings));
    }
    
    return result;
  }

  async create(createLandingSiteDto: CreateLandingSiteDto): Promise<LandingSiteResponseDto> {
    const landingSite = this.landingSiteRepository.create(createLandingSiteDto);
    const saved = await this.landingSiteRepository.save(landingSite);
    
    // Log to sync
    await this.syncService.logChange('landing_site', saved.id.toString(), 'create', this.convertToGeoJson(saved));
    
    return saved.toResponseDto();
  }

  async update(id: number, updateLandingSiteDto: UpdateLandingSiteDto): Promise<LandingSiteResponseDto> {
    const landingSite = await this.landingSiteRepository.findOne({ where: { id } });
    if (!landingSite) {
      throw new NotFoundException(`Landing site with ID ${id} not found`);
    }
    
    Object.assign(landingSite, updateLandingSiteDto);
    const saved = await this.landingSiteRepository.save(landingSite);
    
    // Log to sync
    await this.syncService.logChange('landing_site', saved.id.toString(), 'update', this.convertToGeoJson(saved));
    
    return saved.toResponseDto();
  }

  async remove(id: number): Promise<void> {
    const landingSite = await this.landingSiteRepository.findOne({ where: { id } });
    if (!landingSite) {
      throw new NotFoundException(`Landing site with ID ${id} not found`);
    }
    
    await this.landingSiteRepository.remove(landingSite);
    
    // Log to sync
    await this.syncService.logChange('landing_site', id.toString(), 'delete');
  }

  async findByBounds(minLon: number, minLat: number, maxLon: number, maxLat: number): Promise<LandingSiteResponseDto[]> {
    // For now, return all enabled sites
    // TODO: Fix spatial query with proper ST_Within
    const landingSites = await this.landingSiteRepository.find({
      where: { status: 'active' },
      order: { name: 'ASC' },
    });
    
    // Manual filtering by bounds for now
    const filtered = landingSites.filter(site => {
      if (!site.location || !site.location.coordinates) return false;
      const [lon, lat] = site.location.coordinates;
      return lon >= minLon && lon <= maxLon && lat >= minLat && lat <= maxLat;
    });
    
    return filtered.map(site => site.toResponseDto());
  }

  async findNearest(longitude: number, latitude: number, limit: number = 5): Promise<LandingSiteResponseDto[]> {
    // For now, just return all enabled sites sorted by name
    // TODO: Fix spatial query with proper ST_Distance
    const landingSites = await this.landingSiteRepository.find({
      where: { status: 'active' },
      order: { name: 'ASC' },
      take: limit || 5,
    });
    
    return landingSites.map(site => site.toResponseDto());
  }
  
  private convertToGeoJson(landingSite: LandingSite): any {
    return {
      type: 'Feature',
      id: landingSite.id,
      geometry: landingSite.location,
      properties: {
        id: landingSite.id,
        name: landingSite.name,
        description: landingSite.description,
        status: landingSite.status,
        created_at: landingSite.created_at,
        updated_at: landingSite.updated_at
      }
    };
  }
}