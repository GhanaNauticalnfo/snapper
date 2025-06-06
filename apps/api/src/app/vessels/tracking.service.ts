// tracking.service.ts
import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { TrackingPoint } from './tracking-point.entity';
import { CreateTrackingPointDto } from './tracking-point.dto';
import { TrackingGateway } from './tracking.gateway';
import { VesselService } from './vessel.service';

@Injectable()
export class TrackingService {
  constructor(
    @InjectRepository(TrackingPoint)
    private trackingRepository: Repository<TrackingPoint>,
    @Inject(forwardRef(() => TrackingGateway))
    private trackingGateway: TrackingGateway,
    @Inject(forwardRef(() => VesselService))
    private vesselService: VesselService,
  ) {}

  async findAll(): Promise<TrackingPoint[]> {
    return this.trackingRepository.find({
      order: {
        timestamp: 'DESC'
      },
      take: 1000 // Limit to prevent loading too many points
    });
  }

  async findOne(id: number): Promise<TrackingPoint> {
    return this.trackingRepository.findOne({
      where: { id },
      relations: ['vessel']
    });
  }

  async findByVessel(vesselId: number, limit = 100): Promise<TrackingPoint[]> {
    return this.trackingRepository.find({
      where: { vessel_id: vesselId },
      order: {
        timestamp: 'DESC'
      },
      take: limit
    });
  }

  async findByVesselAndTimeRange(
    vesselId: number, 
    startTime: Date, 
    endTime: Date
  ): Promise<TrackingPoint[]> {
    return this.trackingRepository.find({
      where: {
        vessel_id: vesselId,
        timestamp: Between(startTime, endTime)
      },
      order: {
        timestamp: 'ASC'
      }
    });
  }

  async create(trackingData: CreateTrackingPointDto): Promise<TrackingPoint> {
    const point = new TrackingPoint();
    point.vessel_id = trackingData.vessel_id;
    point.timestamp = trackingData.timestamp || new Date();
    point.speed_knots = trackingData.speed_knots;
    point.heading_degrees = trackingData.heading_degrees;
    point.battery_level = trackingData.battery_level;
    point.signal_strength = trackingData.signal_strength;
    point.device_id = trackingData.device_id;
    point.status = trackingData.status;
    
    // Set PostGIS point from lat/lng
    if (trackingData.latitude !== undefined && trackingData.longitude !== undefined) {
      // Use direct query for setting the geography point
      const result = await this.trackingRepository.query(
        `INSERT INTO tracking_point(
          vessel_id, timestamp, position, speed_knots, heading_degrees, 
          battery_level, signal_strength, device_id, status, created
        ) VALUES (
          $1, $2, ST_SetSRID(ST_MakePoint($3, $4), 4326)::geography, $5, $6, $7, $8, $9, $10, $11
        ) RETURNING *`,
        [
          point.vessel_id,
          point.timestamp,
          trackingData.longitude,
          trackingData.latitude,
          point.speed_knots,
          point.heading_degrees,
          point.battery_level,
          point.signal_strength,
          point.device_id,
          point.status,
          new Date()
        ]
      );
      
      const savedPoint = result[0];
      
      // Emit WebSocket event for real-time updates
      try {
        const vessel = await this.vesselService.findOne(savedPoint.vessel_id);
        if (vessel && this.trackingGateway.server) {
          this.trackingGateway.broadcastPosition(savedPoint, vessel);
        }
      } catch (error) {
        console.error('Failed to broadcast position update:', error);
      }
      
      return savedPoint;
    }
    
    const savedPoint = await this.trackingRepository.save(point);
    
    // Emit WebSocket event for real-time updates
    try {
      const vessel = await this.vesselService.findOne(savedPoint.vessel_id);
      if (vessel && this.trackingGateway.server) {
        this.trackingGateway.broadcastPosition(savedPoint, vessel);
      }
    } catch (error) {
      console.error('Failed to broadcast position update:', error);
    }
    
    return savedPoint;
  }

  async getLatestPositions(): Promise<TrackingPoint[]> {
    // Use a raw SQL query to get the latest position for each vessel with extracted coordinates
    const query = `
      WITH latest_positions AS (
        SELECT DISTINCT ON (vessel_id)
          id,
          vessel_id
        FROM tracking_point
        ORDER BY vessel_id, timestamp DESC
      )
      SELECT 
        tp.*,
        ST_X(tp.position::geometry) as longitude,
        ST_Y(tp.position::geometry) as latitude,
        vessel.id as vessel_id,
        vessel.created as vessel_created,
        vessel.last_updated as vessel_last_updated,
        vessel.name as vessel_name,
        vessel.registration_number as vessel_registration_number,
        vessel.vessel_type as vessel_vessel_type,
        vessel.length_meters as vessel_length_meters,
        vessel.owner_name as vessel_owner_name,
        vessel.owner_contact as vessel_owner_contact,
        vessel.home_port as vessel_home_port,
        vessel.active as vessel_active
      FROM tracking_point tp
      JOIN latest_positions lp ON tp.id = lp.id
      JOIN vessel ON vessel.id = tp.vessel_id
      ORDER BY tp.vessel_id
    `;

    const trackingPoints = await this.trackingRepository.query(query);
    
    // Transform the results to include coordinates and vessel relation
    return trackingPoints.map(point => ({
      ...point,
      coordinates: {
        longitude: point.longitude,
        latitude: point.latitude
      },
      vessel: {
        id: point.vessel_id,
        created: point.vessel_created,
        last_updated: point.vessel_last_updated,
        name: point.vessel_name,
        registration_number: point.vessel_registration_number,
        vessel_type: point.vessel_vessel_type,
        length_meters: point.vessel_length_meters,
        owner_name: point.vessel_owner_name,
        owner_contact: point.vessel_owner_contact,
        home_port: point.vessel_home_port,
        active: point.vessel_active
      }
    }));
  }
}