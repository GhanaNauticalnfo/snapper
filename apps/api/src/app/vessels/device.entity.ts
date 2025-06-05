import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Vessel } from './vessel.entity';

@Entity('devices')
export class Device {
  @PrimaryGeneratedColumn('uuid')
  @ApiProperty({ description: 'Unique identifier for the device', example: 'uuid-string' })
  device_id: string;

  @Column({ unique: true })
  @ApiProperty({ description: 'Unique device token for authentication', example: 'device_abc123xyz' })
  device_token: string;

  @Column({ unique: true })
  @ApiProperty({ description: 'One-time activation token for device setup', example: 'activation_xyz789' })
  activation_token: string;

  @Column({ nullable: true })
  @ApiPropertyOptional({ description: 'Authentication token for API access', example: 'auth_def456' })
  auth_token: string;

  @Column({ default: false })
  @ApiProperty({ description: 'Whether the device has been activated', example: true })
  is_activated: boolean;

  @Column({ type: 'timestamp', nullable: true })
  @ApiPropertyOptional({ description: 'Timestamp when device was activated', type: Date })
  activated_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  @ApiPropertyOptional({ description: 'Timestamp when device token expires', type: Date })
  expires_at: Date;

  @ManyToOne(() => Vessel, { nullable: true })
  @JoinColumn({ name: 'vessel_id' })
  @ApiPropertyOptional({ description: 'Associated vessel', type: Vessel })
  vessel: Vessel;

  @Column({ nullable: true })
  @ApiPropertyOptional({ description: 'ID of the associated vessel', example: 1 })
  vessel_id: number;

  @CreateDateColumn()
  @ApiProperty({ description: 'Timestamp when device was created', type: Date })
  created_at: Date;

  @UpdateDateColumn()
  @ApiProperty({ description: 'Timestamp when device was last updated', type: Date })
  updated_at: Date;
}