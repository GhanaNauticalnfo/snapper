// vessel.entity.ts
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { TrackingPoint } from './tracking-point.entity';

@Entity()
export class Vessel {
  @PrimaryGeneratedColumn()
  id: number;

  @CreateDateColumn()
  created: Date;

  @UpdateDateColumn()
  last_updated: Date;

  @Column('varchar', { length: 255 })
  name: string;

  @Column('varchar', { length: 50, unique: true })
  registration_number: string;

  @Column('varchar', { length: 50 })
  vessel_type: string;

  @Column('numeric', { precision: 5, scale: 2, nullable: true })
  length_meters: number;

  @Column('varchar', { length: 255, nullable: true })
  owner_name: string;

  @Column('varchar', { length: 255, nullable: true })
  owner_contact: string;

  @Column('varchar', { length: 100, nullable: true })
  home_port: string;

  @Column('boolean', { default: true })
  active: boolean;

  @OneToMany(() => TrackingPoint, trackingPoint => trackingPoint.vessel)
  tracking_points: TrackingPoint[];
}