import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

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
}