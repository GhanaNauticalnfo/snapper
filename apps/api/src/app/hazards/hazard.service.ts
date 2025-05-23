import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Hazard } from './hazard.entity';
import { SyncService } from '../sync/sync.service';

@Injectable()
export class HazardService {
  constructor(
    @InjectRepository(Hazard)
    private hazardRepository: Repository<Hazard>,
    private syncService: SyncService,
  ) {}

  async findAll(): Promise<Hazard[]> {
    return this.hazardRepository.find({
      order: { last_updated: 'DESC' },
    });
  }

  async findOne(id: number): Promise<Hazard> {
    const hazard = await this.hazardRepository.findOne({ where: { id } });
    if (!hazard) {
      throw new NotFoundException(`Hazard with ID ${id} not found`);
    }
    return hazard;
  }

  async findEnabled(): Promise<Hazard[]> {
    return this.hazardRepository.find({
      where: { enabled: true },
      order: { last_updated: 'DESC' },
    });
  }

  async create(hazardData: Partial<Hazard>): Promise<Hazard> {
    const hazard = this.hazardRepository.create(hazardData);
    const saved = await this.hazardRepository.save(hazard);
    
    // Log to sync
    await this.syncService.logChange('hazard', saved.id.toString(), 'create', this.convertToGeoJson(saved));
    
    return saved;
  }

  async update(id: number, hazardData: Partial<Hazard>): Promise<Hazard> {
    const hazard = await this.findOne(id);
    Object.assign(hazard, hazardData);
    const saved = await this.hazardRepository.save(hazard);
    
    // Log to sync
    await this.syncService.logChange('hazard', saved.id.toString(), 'update', this.convertToGeoJson(saved));
    
    return saved;
  }

  async remove(id: number): Promise<void> {
    const hazard = await this.findOne(id);
    await this.hazardRepository.remove(hazard);
    
    // Log to sync
    await this.syncService.logChange('hazard', id.toString(), 'delete');
  }
  
  private convertToGeoJson(hazard: Hazard): any {
    return {
      type: 'Feature',
      id: hazard.id,
      geometry: {
        type: 'Point',
        coordinates: [hazard.lng, hazard.lat]
      },
      properties: {
        id: hazard.id,
        name: hazard.name,
        description: hazard.description,
        radius: hazard.radius,
        type: hazard.type,
        color: hazard.color,
        enabled: hazard.enabled,
        created: hazard.created,
        last_updated: hazard.last_updated
      }
    };
  }
}