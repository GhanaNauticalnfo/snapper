import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, Length } from 'class-validator';

export class DeviceActivationDto {
  @ApiProperty({ 
    description: 'Activation token for the device', 
    example: 'abc123def456',
    minLength: 1
  })
  @IsString()
  @IsNotEmpty()
  @Length(1, 255)
  activation_token: string;
}