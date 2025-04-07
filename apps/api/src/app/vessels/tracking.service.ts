// tracking.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { TrackingPoint } from './tracking-point.entity';
import { CreateTrackingPointDto } from './tracking-point.dto';

@Injectable()
export class TrackingService {
  constructor(
    @InjectRepository(TrackingPoint)
    private trackingRepository: Repository<TrackingPoint>,
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
      
      return result[0];
    }
    
    return this.trackingRepository.save(point);
  }

  async getLatestPositions(): Promise<TrackingPoint[]> {
    // Use a raw SQL query with proper aliases to get the latest position for each vessel
    const query = `
      WITH latest_positions AS (
        SELECT DISTINCT ON (vessel_id)
          id,
          vessel_id
        FROM tracking_point
        ORDER BY vessel_id, timestamp DESC
      )
      SELECT tp.*
      FROM tracking_point tp
      JOIN latest_positions lp ON tp.id = lp.id
      ORDER BY tp.vessel_id
    `;

    const trackingPoints = await this.trackingRepository.query(query);
    
    // Load vessels for each tracking point to maintain relation
    for (const point of trackingPoints) {
      point.vessel = await this.trackingRepository
        .createQueryBuilder('tp')
        .select('vessel')
        .from('vessel', 'vessel')
        .where('vessel.id = :vesselId', { vesselId: point.vessel_id })
        .getRawOne();
    }
    
    return trackingPoints;
  }
}