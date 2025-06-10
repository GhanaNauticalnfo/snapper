import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Route } from './route.entity';
import { SyncService } from '../sync/sync.service';

@Injectable()
export class RouteService {
  constructor(
    @InjectRepository(Route)
    private routeRepository: Repository<Route>,
    private syncService: SyncService,
  ) {}

  async findAll(): Promise<Route[]> {
    return this.routeRepository.find({
      order: { last_updated: 'DESC' },
    });
  }

  async findOne(id: number): Promise<Route> {
    const route = await this.routeRepository.findOne({ where: { id } });
    if (!route) {
      throw new NotFoundException(`Route with ID ${id} not found`);
    }
    return route;
  }

  async findEnabled(): Promise<Route[]> {
    return this.routeRepository.find({
      where: { enabled: true },
      order: { last_updated: 'DESC' },
    });
  }

  async create(routeData: Partial<Route>): Promise<Route> {
    const route = this.routeRepository.create(routeData);
    const saved = await this.routeRepository.save(route);
    
    // Log to sync
    await this.syncService.logChange('route', saved.id.toString(), 'create', this.convertToGeoJson(saved));
    
    return saved;
  }

  async update(id: number, routeData: Partial<Route>): Promise<Route> {
    const route = await this.findOne(id);
    Object.assign(route, routeData);
    const saved = await this.routeRepository.save(route);
    
    // Log to sync
    await this.syncService.logChange('route', saved.id.toString(), 'update', this.convertToGeoJson(saved));
    
    return saved;
  }

  async remove(id: number): Promise<void> {
    const route = await this.findOne(id);
    await this.routeRepository.remove(route);
    
    // Log to sync
    await this.syncService.logChange('route', id.toString(), 'delete');
  }
  
  private convertToGeoJson(route: Route): any {
    // Convert waypoints to LineString geometry
    const coordinates = route.waypoints
      .sort((a, b) => a.order - b.order)
      .map(wp => [wp.lng, wp.lat]); // GeoJSON format is [longitude, latitude]
    
    return {
      type: 'Feature',
      id: route.id,
      geometry: {
        type: 'LineString',
        coordinates: coordinates
      },
      properties: {
        id: route.id,
        name: route.name,
        description: route.description,
        enabled: route.enabled,
        created: route.created,
        last_updated: route.last_updated
      }
    };
  }
}