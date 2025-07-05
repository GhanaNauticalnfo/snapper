import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DeviceState } from '../device.entity';

export class DeviceVesselInfo {
  @ApiProperty({ description: 'Vessel ID', example: 1 })
  id: number;

  @ApiProperty({ description: 'Vessel name', example: 'MV Ghana Star' })
  name: string;
}

export class DeviceResponseDto {
  @ApiProperty({ description: 'Unique identifier for the device', example: 'uuid-string' })
  device_id: string;

  @ApiProperty({ description: 'Unique device token for authentication', example: 'device_abc123xyz' })
  device_token: string;

  @ApiProperty({ description: 'One-time activation token for device setup', example: 'activation_xyz789' })
  activation_token: string;

  @ApiPropertyOptional({ description: 'Authentication token for API access', example: 'auth_def456' })
  auth_token?: string;


  @ApiProperty({ 
    description: 'Current state of the device',
    enum: DeviceState,
    example: DeviceState.PENDING
  })
  state: DeviceState;

  @ApiPropertyOptional({ description: 'Timestamp when device was activated', type: Date })
  activated_at?: Date;

  @ApiPropertyOptional({ description: 'Timestamp when device token expires', type: Date })
  expires_at?: Date;

  @ApiPropertyOptional({ description: 'Associated vessel information', type: DeviceVesselInfo })
  vessel?: DeviceVesselInfo;

  @ApiProperty({ description: 'Timestamp when device was created', type: Date })
  created_at: Date;

  @ApiProperty({ description: 'Timestamp when device was last updated', type: Date })
  updated_at: Date;

  @ApiPropertyOptional({ description: 'Device activation URL for mobile app', example: 'ghmaritimeapp://auth?token=activation_xyz789' })
  activation_url?: string;
}