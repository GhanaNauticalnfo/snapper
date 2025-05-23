// vessel.entity.ts
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TrackingPoint } from './tracking-point.entity';

@Entity()
export class Vessel {
  @PrimaryGeneratedColumn()
  @ApiProperty({ description: 'Unique identifier for the vessel', example: 1 })
  id: number;

  @CreateDateColumn()
  @ApiProperty({ description: 'Timestamp when the vessel was created', type: Date })
  created: Date;

  @UpdateDateColumn()
  @ApiProperty({ description: 'Timestamp when the vessel was last updated', type: Date })
  last_updated: Date;

  @Column('varchar', { length: 255 })
  @ApiProperty({ description: 'Name of the vessel', example: 'MV Ghana Star' })
  name: string;

  @Column('varchar', { length: 50, unique: true })
  @ApiProperty({ description: 'Unique registration number of the vessel', example: 'GH-123-45' })
  registration_number: string;

  @Column('varchar', { length: 50 })
  @ApiProperty({ description: 'Type of vessel', example: 'Cargo', enum: ['Cargo', 'Passenger', 'Fishing', 'Tanker', 'Other'] })
  vessel_type: string;

  @Column('numeric', { precision: 5, scale: 2, nullable: true })
  @ApiPropertyOptional({ description: 'Length of the vessel in meters', example: 25.5 })
  length_meters: number;

  @Column('varchar', { length: 255, nullable: true })
  @ApiPropertyOptional({ description: 'Name of the vessel owner', example: 'Ghana Maritime Co. Ltd.' })
  owner_name: string;

  @Column('varchar', { length: 255, nullable: true })
  @ApiPropertyOptional({ description: 'Contact information for the vessel owner', example: '+233 20 123 4567' })
  owner_contact: string;

  @Column('varchar', { length: 100, nullable: true })
  @ApiPropertyOptional({ description: 'Home port of the vessel', example: 'Tema' })
  home_port: string;

  @Column('boolean', { default: true })
  @ApiProperty({ description: 'Whether the vessel is currently active', example: true })
  active: boolean;

  @OneToMany(() => TrackingPoint, trackingPoint => trackingPoint.vessel)
  @ApiPropertyOptional({ description: 'Tracking points associated with this vessel', type: [TrackingPoint] })
  tracking_points: TrackingPoint[];
}