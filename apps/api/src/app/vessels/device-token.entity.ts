import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Vessel } from './vessel.entity';

@Entity('device_tokens')
export class DeviceToken {
  @PrimaryGeneratedColumn('uuid')
  device_id: string;

  @Column({ unique: true })
  device_token: string;

  @Column({ unique: true })
  activation_token: string;

  @Column({ nullable: true })
  auth_token: string;

  @Column({ default: false })
  is_activated: boolean;

  @Column({ type: 'timestamp', nullable: true })
  activated_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  expires_at: Date;

  @ManyToOne(() => Vessel, { nullable: true })
  @JoinColumn({ name: 'vessel_id' })
  vessel: Vessel;

  @Column({ nullable: true })
  vessel_id: number;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}