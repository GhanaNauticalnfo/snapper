import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { HazardResponseDto } from './dto/hazard-response.dto';
import { GeoPointUtils } from '@snapper/shared-models';

@Entity('hazards')
export class Hazard {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column({ type: 'float' })
  lat: number;

  @Column({ type: 'float' })
  lng: number;

  @Column({ type: 'float', nullable: true })
  radius: number; // Radius in meters for the hazard zone

  @Column({ default: 'warning' })
  type: string; // e.g., 'warning', 'danger', 'caution'

  @Column({ default: '#FFA500' }) // Orange color for hazards
  color: string;

  @Column({ default: true })
  enabled: boolean;

  @CreateDateColumn()
  created: Date;

  @UpdateDateColumn()
  last_updated: Date;

  toResponseDto(): HazardResponseDto {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      coordinates: {
        lat: this.lat,
        lng: this.lng
      },
      radius: this.radius,
      type: this.type,
      color: this.color,
      enabled: this.enabled,
      created: this.created,
      last_updated: this.last_updated
    };
  }
}