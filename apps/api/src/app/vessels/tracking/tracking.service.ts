import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, DataSource, Not, IsNull } from 'typeorm';
import { VesselTelemetry } from './vessel-telemetry.entity';
import { VesselTelemetryInputDto } from './dto/vessel-telemetry-input.dto';
import { VesselTelemetryResponseDto } from './dto/vessel-telemetry-response.dto';
import { TrackingGateway } from './tracking.gateway';
import { VesselService } from '../vessel.service';
import { Vessel } from '../vessel.entity';
import { GeoPoint } from '@ghanawaters/shared-models';

@Injectable()
export class TrackingService {
  constructor(
    @InjectRepository(VesselTelemetry)
    private trackingRepository: Repository<VesselTelemetry>,
    @InjectRepository(Vessel)
    private vesselRepository: Repository<Vessel>,
    @Inject(forwardRef(() => TrackingGateway))
    private trackingGateway: TrackingGateway,
    @Inject(forwardRef(() => VesselService))
    private vesselService: VesselService,
    private dataSource: DataSource,
  ) {}

  async findAll(): Promise<VesselTelemetryResponseDto[]> {
    const points = await this.trackingRepository.find({
      order: {
        timestamp: 'DESC'
      },
      take: 1000 // Limit to prevent loading too many points
    });

    return Promise.all(points.map(point => this.toResponseDto(point)));
  }

  async findOne(id: number): Promise<VesselTelemetryResponseDto> {
    const point = await this.trackingRepository.findOne({
      where: { id },
      relations: ['vessel']
    });

    if (!point) {
      return null;
    }

    return this.toResponseDto(point);
  }

  async findByVessel(vesselId: number, limit = 100): Promise<VesselTelemetryResponseDto[]> {
    const points = await this.trackingRepository.find({
      where: { vessel_id: vesselId },
      order: {
        timestamp: 'DESC'
      },
      take: limit
    });

    return Promise.all(points.map(point => this.toResponseDto(point)));
  }

  async findByVesselAndTimeRange(
    vesselId: number, 
    startTime: Date, 
    endTime: Date
  ): Promise<VesselTelemetryResponseDto[]> {
    const points = await this.trackingRepository.find({
      where: {
        vessel_id: vesselId,
        timestamp: Between(startTime, endTime)
      },
      order: {
        timestamp: 'ASC'
      }
    });

    return Promise.all(points.map(point => this.toResponseDto(point)));
  }

  async create(vesselId: number, trackingData: VesselTelemetryInputDto, deviceId?: string): Promise<VesselTelemetryResponseDto> {
    return await this.dataSource.transaction(async manager => {
      const point = new VesselTelemetry();
      point.vessel_id = vesselId;
      point.timestamp = trackingData.timestamp ? new Date(trackingData.timestamp) : new Date();
      point.speed_knots = trackingData.speed_knots;
      point.heading_degrees = trackingData.heading_degrees;
      point.device_id = deviceId;
      point.status = trackingData.status;
      
      // Set the position directly as GeoJSON object - TypeORM will handle PostGIS conversion
      point.position = trackingData.position;
      
      const savedPoint = await manager.save(VesselTelemetry, point);
      
      // Update vessel's latest position reference
      await manager.update(Vessel, vesselId, {
        latest_position_id: savedPoint.id
      });
      
      // Emit WebSocket event for real-time updates
      try {
        const vessel = await this.vesselService.findOneEntity(vesselId);
        if (vessel && this.trackingGateway.server) {
          this.trackingGateway.broadcastPosition(savedPoint, vessel, trackingData.position);
        }
      } catch (error) {
        console.error('Failed to broadcast position update:', error);
      }
      
      // Return the saved point with the position we already have
      return this.toResponseDtoWithPosition(savedPoint, trackingData.position);
    });
  }

  async getLatestPositions(): Promise<VesselTelemetryResponseDto[]> {
    // Use the new latest_position relation for much better performance
    const vessels = await this.vesselRepository.find({
      relations: ['latest_position', 'vessel_type'],
      where: {
        latest_position_id: Not(IsNull()) // Only vessels with tracking data
      }
    });

    const result = [];
    for (const vessel of vessels) {
      if (vessel.latest_position) {
        const dto = await this.toResponseDto(vessel.latest_position);
        // Add vessel info to the response
        (dto as any).vessel = {
          id: vessel.id,
          created: vessel.created,
          last_updated: vessel.last_updated,
          name: vessel.name,
          vessel_type: vessel.vessel_type?.name,
        };
        result.push(dto);
      }
    }
    
    return result;
  }

  async getVesselLatestPosition(vesselId: number): Promise<VesselTelemetryResponseDto> {
    const vessel = await this.vesselRepository.findOne({
      where: { id: vesselId },
      relations: ['latest_position']
    });

    if (!vessel || !vessel.latest_position) {
      return null;
    }

    return this.toResponseDto(vessel.latest_position);
  }

  private async toResponseDto(point: VesselTelemetry): Promise<VesselTelemetryResponseDto> {
    // Extract coordinates from PostGIS geography
    const coordsResult = await this.trackingRepository.query(
      'SELECT ST_X(position::geometry) as longitude, ST_Y(position::geometry) as latitude FROM vessel_telemetry WHERE id = $1',
      [point.id]
    );
    
    const coords = coordsResult[0];
    const geoPoint: GeoPoint = {
      type: 'Point',
      coordinates: [coords.longitude, coords.latitude]
    };

    return this.toResponseDtoWithPosition(point, geoPoint);
  }

  private toResponseDtoWithPosition(point: VesselTelemetry, position: GeoPoint): VesselTelemetryResponseDto {
    return {
      id: point.id,
      created: point.created,
      timestamp: point.timestamp,
      vessel_id: point.vessel_id,
      position: position,
      speed_knots: point.speed_knots,
      heading_degrees: point.heading_degrees,
      device_id: point.device_id,
      status: point.status
    };
  }
}