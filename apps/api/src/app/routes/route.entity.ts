import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Waypoint } from '@ghanawaters/shared-models';
import { RouteResponseDto } from './dto/route-response.dto';

@Entity('routes')
export class Route {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column('jsonb', { default: [] })
  waypoints: Waypoint[];


  @Column({ default: true })
  enabled: boolean;

  @CreateDateColumn()
  created: Date;

  @UpdateDateColumn()
  last_updated: Date;

  toResponseDto(settings?: Record<string, string>): RouteResponseDto {
    const dto: RouteResponseDto = {
      id: this.id,
      name: this.name,
      description: this.description,
      waypoints: this.waypoints,
      enabled: this.enabled,
      created: this.created.toISOString(),
      last_updated: this.last_updated.toISOString(),
    };

    if (settings) {
      dto.settings = settings;
    }

    return dto;
  }
}