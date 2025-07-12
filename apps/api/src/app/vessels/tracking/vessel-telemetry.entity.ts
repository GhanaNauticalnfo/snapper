import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Vessel } from '../vessel.entity';
import { VesselTelemetryResponseDto } from './dto/vessel-telemetry-response.dto';
import { GeoPoint } from '@ghanawaters/shared-models';

@Entity('vessel_telemetry')
export class VesselTelemetry {
  @PrimaryGeneratedColumn()
  id: number;

  @CreateDateColumn()
  created: Date;

  @Column('timestamptz')
  @Index()
  timestamp: Date;

  @Column('integer')
  vessel_id: number;

  @ManyToOne(() => Vessel)
  @JoinColumn({ name: 'vessel_id' })
  vessel: Vessel;

  @Column({
    type: 'geography',
    spatialFeatureType: 'Point',
    srid: 4326,
  })
  @Index({ spatial: true })
  position: GeoPoint;

  @Column('numeric', { precision: 5, scale: 2, nullable: true })
  speed_knots: number;

  @Column('numeric', { precision: 5, scale: 1, nullable: true })
  heading_degrees: number;

  @Column('varchar', { length: 50, nullable: true })
  device_id: string;

  @Column('varchar', { length: 20, nullable: true })
  status: string;

  toResponseDto(): VesselTelemetryResponseDto {
    return {
      id: this.id,
      created: this.created,
      timestamp: this.timestamp,
      vessel_id: this.vessel_id,
      position: this.position,
      speed_knots: this.speed_knots,
      heading_degrees: this.heading_degrees,
      device_id: this.device_id,
      status: this.status,
    };
  }
}