import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DeviceResponse, DeviceVesselInfo as IDeviceVesselInfo, DeviceState } from '@ghanawaters/shared-models';

export class DeviceVesselInfo implements IDeviceVesselInfo {
  @ApiProperty({ description: 'Vessel ID', example: 1 })
  id: number;

  @ApiProperty({ description: 'Vessel name', example: 'MV Ghana Star' })
  name: string;
}

export class DeviceResponseDto implements DeviceResponse {
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

  @ApiPropertyOptional({ description: 'Timestamp when device was activated', type: String })
  activated_at?: string;

  @ApiPropertyOptional({ description: 'Timestamp when device token expires', type: String })
  expires_at?: string;

  @ApiPropertyOptional({ description: 'Associated vessel information', type: DeviceVesselInfo })
  vessel?: DeviceVesselInfo;

  @ApiProperty({ description: 'Timestamp when device was created', type: String })
  created_at: string;

  @ApiProperty({ description: 'Timestamp when device was last updated', type: String })
  updated_at: string;

  @ApiPropertyOptional({ description: 'Device activation URL for mobile app', example: 'ghmaritimeapp://auth?token=activation_xyz789' })
  activation_url?: string;
}