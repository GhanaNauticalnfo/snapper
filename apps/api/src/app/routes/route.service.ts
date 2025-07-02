import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Route } from './route.entity';
import { SyncService } from '../sync/sync.service';
import { ResourceSettingsService } from '../resource-settings/resource-settings.service';
import { RouteResponseDto } from './dto/route-response.dto';
import { RouteInputDto } from './dto/route-input.dto';

@Injectable()
export class RouteService {
  constructor(
    @InjectRepository(Route)
    private routeRepository: Repository<Route>,
    private syncService: SyncService,
    private resourceSettingsService: ResourceSettingsService,
  ) {}

  async findAll(): Promise<RouteResponseDto[]> {
    const routes = await this.routeRepository.find({
      order: { last_updated: 'DESC' },
    });
    
    const result = [];
    for (const route of routes) {
      const settings = await this.resourceSettingsService.getSettingsForResource('route', route.id);
      result.push(route.toResponseDto(settings));
    }
    
    return result;
  }

  async findOne(id: number): Promise<RouteResponseDto> {
    const route = await this.findOneEntity(id);
    const settings = await this.resourceSettingsService.getSettingsForResource('route', route.id);
    return route.toResponseDto(settings);
  }

  async findOneEntity(id: number): Promise<Route> {
    const route = await this.routeRepository.findOne({ where: { id } });
    if (!route) {
      throw new NotFoundException(`Route with ID ${id} not found`);
    }
    return route;
  }


  async create(routeInput: RouteInputDto): Promise<Route> {
    const route = this.routeRepository.create(routeInput);
    const saved = await this.routeRepository.save(route);
    
    // Log to sync
    await this.syncService.logChange('route', saved.id.toString(), 'create', this.convertToGeoJson(saved));
    
    return saved;
  }

  async update(id: number, routeInput: RouteInputDto): Promise<Route> {
    const route = await this.findOneEntity(id);
    Object.assign(route, routeInput);
    const saved = await this.routeRepository.save(route);
    
    // Log to sync
    await this.syncService.logChange('route', saved.id.toString(), 'update', this.convertToGeoJson(saved));
    
    return saved;
  }

  async remove(id: number): Promise<void> {
    const route = await this.findOneEntity(id);
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