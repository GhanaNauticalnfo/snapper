import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Marker } from './marker.entity';
import { SyncService } from '../sync/sync.service';

@Injectable()
export class MarkerService {
  constructor(
    @InjectRepository(Marker)
    private markerRepository: Repository<Marker>,
    private syncService: SyncService,
  ) {}

  async findAll(): Promise<Marker[]> {
    return this.markerRepository.find({
      order: { last_updated: 'DESC' },
    });
  }

  async findOne(id: number): Promise<Marker> {
    const marker = await this.markerRepository.findOne({ where: { id } });
    if (!marker) {
      throw new NotFoundException(`Marker with ID ${id} not found`);
    }
    return marker;
  }

  async findEnabled(): Promise<Marker[]> {
    return this.markerRepository.find({
      where: { enabled: true },
      order: { last_updated: 'DESC' },
    });
  }

  async create(markerData: Partial<Marker>): Promise<Marker> {
    const marker = this.markerRepository.create(markerData);
    const saved = await this.markerRepository.save(marker);
    
    // Log to sync
    await this.syncService.logChange('marker', saved.id.toString(), 'create', this.convertToGeoJson(saved));
    
    return saved;
  }

  async update(id: number, markerData: Partial<Marker>): Promise<Marker> {
    const marker = await this.findOne(id);
    Object.assign(marker, markerData);
    const saved = await this.markerRepository.save(marker);
    
    // Log to sync
    await this.syncService.logChange('marker', saved.id.toString(), 'update', this.convertToGeoJson(saved));
    
    return saved;
  }

  async remove(id: number): Promise<void> {
    const marker = await this.findOne(id);
    await this.markerRepository.remove(marker);
    
    // Log to sync
    await this.syncService.logChange('marker', id.toString(), 'delete');
  }
  
  private convertToGeoJson(marker: Marker): any {
    return {
      type: 'Feature',
      id: marker.id,
      geometry: {
        type: 'Point',
        coordinates: [marker.lng, marker.lat]
      },
      properties: {
        id: marker.id,
        name: marker.name,
        description: marker.description,
        icon: marker.icon,
        color: marker.color,
        enabled: marker.enabled,
        created: marker.created,
        last_updated: marker.last_updated
      }
    };
  }
}