// tracking-point.entity.ts
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { Vessel } from './vessel.entity';

@Entity('tracking_point')
export class TrackingPoint {
  @PrimaryGeneratedColumn()
  id: number;

  @CreateDateColumn()
  created: Date;

  @Column('timestamptz')
  timestamp: Date;

  @Column('integer')
  vessel_id: number;

  @ManyToOne(() => Vessel, vessel => vessel.tracking_points)
  @JoinColumn({ name: 'vessel_id' })
  vessel: Vessel;

  @Column({
    type: 'geography',
    spatialFeatureType: 'Point',
    srid: 4326,
  })
  @Index({ spatial: true })
  position: any; // Using 'any' for PostGIS geography type

  @Column('numeric', { precision: 5, scale: 2, nullable: true })
  speed_knots: number;

  @Column('numeric', { precision: 5, scale: 1, nullable: true })
  heading_degrees: number;

  @Column('integer', { nullable: true })
  battery_level: number;

  @Column('integer', { nullable: true })
  signal_strength: number;

  @Column('varchar', { length: 50, nullable: true })
  device_id: string;

  @Column('varchar', { length: 20, nullable: true })
  status: string;
}