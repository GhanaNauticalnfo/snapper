import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Vessel } from '../vessel.entity';
import { DeviceResponseDto } from './dto/device-response.dto';
import { DeviceState } from '@ghanawaters/shared-models';

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

  @Column({
    type: 'enum',
    enum: DeviceState,
    default: DeviceState.PENDING
  })
  @ApiProperty({ 
    description: 'Current state of the device',
    enum: DeviceState,
    example: DeviceState.PENDING
  })
  state: DeviceState;

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

  toResponseDto(includeActivationUrl = false): DeviceResponseDto {
    const response: DeviceResponseDto = {
      device_id: this.device_id,
      device_token: this.device_token,
      activation_token: this.activation_token,
      auth_token: this.auth_token || undefined,
      state: this.state,
      activated_at: this.activated_at?.toISOString() || undefined,
      expires_at: this.expires_at?.toISOString() || undefined,
      created_at: this.created_at.toISOString(),
      updated_at: this.updated_at.toISOString(),
    };

    if (this.vessel) {
      response.vessel = {
        id: this.vessel.id,
        name: this.vessel.name,
      };
    }

    if (includeActivationUrl && this.activation_token) {
      response.activation_url = `ghmaritimeapp://auth?token=${this.activation_token}`;
    }

    return response;
  }
}