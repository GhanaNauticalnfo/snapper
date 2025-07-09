import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Route } from './route.entity';
import { SyncService } from '../sync/sync.service';
import { ResourceSettingsService } from '../resource-settings/resource-settings.service';
import { RouteResponseDto } from './dto/route-response.dto';
import { RouteInputDto } from './dto/route-input.dto';
import { Waypoint } from '@ghanawaters/shared-models';

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
    // Validate route coherence before any database operation
    this.validateRouteCoherence(routeInput.waypoints);
    
    // Use transaction to ensure both route save and sync log are atomic
    return await this.routeRepository.manager.transaction(async manager => {
      // Create and save the route
      const route = manager.create(Route, routeInput);
      const saved = await manager.save(route);
      
      // Convert to GeoJSON (this could throw if data is invalid)
      const geoJson = this.convertToGeoJson(saved);
      
      // Log to sync within the same transaction
      await this.syncService.logChangeInTransaction(
        manager,
        'route',
        saved.id.toString(),
        'create',
        geoJson
      );
      
      return saved;
    });
  }

  async update(id: number, routeInput: RouteInputDto): Promise<Route> {
    // Validate route coherence before any database operation
    this.validateRouteCoherence(routeInput.waypoints);
    
    // Use transaction to ensure both route update and sync log are atomic
    return await this.routeRepository.manager.transaction(async manager => {
      // Find the route within the transaction
      const route = await manager.findOne(Route, { where: { id } });
      if (!route) {
        throw new NotFoundException(`Route with ID ${id} not found`);
      }
      
      // Update the route
      Object.assign(route, routeInput);
      const saved = await manager.save(route);
      
      // Convert to GeoJSON (this could throw if data is invalid)
      const geoJson = this.convertToGeoJson(saved);
      
      // Log to sync within the same transaction
      await this.syncService.logChangeInTransaction(
        manager,
        'route',
        saved.id.toString(),
        'update',
        geoJson
      );
      
      return saved;
    });
  }

  async remove(id: number): Promise<void> {
    // Use transaction to ensure both route deletion and sync log are atomic
    await this.routeRepository.manager.transaction(async manager => {
      // Find the route within the transaction
      const route = await manager.findOne(Route, { where: { id } });
      if (!route) {
        throw new NotFoundException(`Route with ID ${id} not found`);
      }
      
      // Remove the route
      await manager.remove(route);
      
      // Log to sync within the same transaction
      await this.syncService.logChangeInTransaction(
        manager,
        'route',
        id.toString(),
        'delete'
      );
    });
  }
  
  private convertToGeoJson(route: Route): any {
    // Validate waypoints before conversion
    this.validateWaypointsForGeoJson(route.waypoints);
    
    // Convert waypoints to LineString geometry
    const coordinates = route.waypoints
      .sort((a, b) => a.order - b.order)
      .map(wp => [wp.lng, wp.lat]); // GeoJSON format is [longitude, latitude]
    
    const geoJson = {
      type: 'Feature',
      id: route.id,
      geometry: {
        type: 'LineString',
        coordinates: coordinates
      },
      properties: {
        id: route.id,
        name: route.name,
        notes: route.notes,
        enabled: route.enabled,
        created: route.created,
        last_updated: route.last_updated
      }
    };
    
    // Validate the generated GeoJSON
    this.validateGeoJson(geoJson);
    
    return geoJson;
  }
  
  private validateWaypointsForGeoJson(waypoints: Waypoint[]): void {
    if (!waypoints || waypoints.length < 2) {
      throw new BadRequestException('Route must have at least 2 waypoints for valid GeoJSON LineString');
    }
    
    // Check for invalid coordinates
    for (const wp of waypoints) {
      if (typeof wp.lat !== 'number' || typeof wp.lng !== 'number') {
        throw new BadRequestException(`Invalid waypoint coordinates: lat=${wp.lat}, lng=${wp.lng}`);
      }
      
      if (wp.lat < -90 || wp.lat > 90) {
        throw new BadRequestException(`Invalid latitude ${wp.lat}: must be between -90 and 90`);
      }
      
      if (wp.lng < -180 || wp.lng > 180) {
        throw new BadRequestException(`Invalid longitude ${wp.lng}: must be between -180 and 180`);
      }
    }
  }
  
  private validateGeoJson(geoJson: any): void {
    // Validate basic GeoJSON structure
    if (!geoJson || typeof geoJson !== 'object') {
      throw new BadRequestException('Invalid GeoJSON: must be an object');
    }
    
    if (geoJson.type !== 'Feature') {
      throw new BadRequestException('Invalid GeoJSON: type must be "Feature"');
    }
    
    if (!geoJson.geometry || typeof geoJson.geometry !== 'object') {
      throw new BadRequestException('Invalid GeoJSON: missing geometry');
    }
    
    if (geoJson.geometry.type !== 'LineString') {
      throw new BadRequestException('Invalid GeoJSON: geometry type must be "LineString"');
    }
    
    if (!Array.isArray(geoJson.geometry.coordinates)) {
      throw new BadRequestException('Invalid GeoJSON: coordinates must be an array');
    }
    
    if (geoJson.geometry.coordinates.length < 2) {
      throw new BadRequestException('Invalid GeoJSON: LineString must have at least 2 coordinates');
    }
    
    // Validate each coordinate
    for (const coord of geoJson.geometry.coordinates) {
      if (!Array.isArray(coord) || coord.length !== 2) {
        throw new BadRequestException('Invalid GeoJSON: each coordinate must be [longitude, latitude]');
      }
      
      const [lng, lat] = coord;
      if (typeof lng !== 'number' || typeof lat !== 'number') {
        throw new BadRequestException('Invalid GeoJSON: coordinates must be numbers');
      }
    }
  }
  
  private validateRouteCoherence(waypoints: Waypoint[]): void {
    // Additional business logic validation
    
    // Check if route is too short (less than 1 meter)
    const totalDistance = this.calculateTotalDistance(waypoints);
    if (totalDistance < 0.001) { // Less than 1 meter in kilometers
      throw new BadRequestException('Route is too short: waypoints are too close together');
    }
    
    // Check for duplicate consecutive waypoints
    const sortedWaypoints = [...waypoints].sort((a, b) => a.order - b.order);
    for (let i = 1; i < sortedWaypoints.length; i++) {
      const prev = sortedWaypoints[i - 1];
      const curr = sortedWaypoints[i];
      
      if (prev.lat === curr.lat && prev.lng === curr.lng) {
        throw new BadRequestException(`Duplicate consecutive waypoints at order ${prev.order} and ${curr.order}`);
      }
    }
  }
  
  private calculateTotalDistance(waypoints: Waypoint[]): number {
    const sortedWaypoints = [...waypoints].sort((a, b) => a.order - b.order);
    let totalDistance = 0;
    
    for (let i = 1; i < sortedWaypoints.length; i++) {
      totalDistance += this.calculateDistance(
        sortedWaypoints[i - 1],
        sortedWaypoints[i]
      );
    }
    
    return totalDistance;
  }
  
  private calculateDistance(wp1: Waypoint, wp2: Waypoint): number {
    // Haversine formula for distance between two points
    const R = 6371; // Earth radius in kilometers
    const dLat = this.toRadians(wp2.lat - wp1.lat);
    const dLng = this.toRadians(wp2.lng - wp1.lng);
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(wp1.lat)) * Math.cos(this.toRadians(wp2.lat)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
  
  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
}