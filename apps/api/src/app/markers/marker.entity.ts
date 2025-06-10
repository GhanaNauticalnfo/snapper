import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { MarkerResponseDto } from './dto/marker-response.dto';
import { GeoPointUtils } from '@snapper/shared-models';

@Entity('markers')
export class Marker {
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

  @Column({ default: 'default' })
  icon: string;

  @Column({ default: '#FF0000' })
  color: string;

  @Column({ default: true })
  enabled: boolean;

  @CreateDateColumn()
  created: Date;

  @UpdateDateColumn()
  last_updated: Date;

  toResponseDto(): MarkerResponseDto {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      coordinates: {
        lat: this.lat,
        lng: this.lng
      },
      icon: this.icon,
      color: this.color,
      enabled: this.enabled,
      created: this.created,
      last_updated: this.last_updated
    };
  }
}