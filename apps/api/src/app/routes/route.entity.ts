import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Waypoint } from '@snapper/shared-models';

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
}