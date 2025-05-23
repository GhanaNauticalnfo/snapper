import { Injectable, UnauthorizedException, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DeviceToken } from './device-token.entity';
import { randomBytes } from 'crypto';

@Injectable()
export class DeviceAuthService {
  constructor(
    @InjectRepository(DeviceToken)
    private deviceTokenRepository: Repository<DeviceToken>,
  ) {}

  async activateDevice(activationToken: string): Promise<{
    auth_token: string;
    device_token: string;
    device_id: string;
    vessel?: string;
  }> {
    const deviceToken = await this.deviceTokenRepository.findOne({
      where: { activation_token: activationToken },
      relations: ['vessel'],
    });

    if (!deviceToken) {
      throw new HttpException('Invalid activation token', HttpStatus.NOT_FOUND);
    }

    if (deviceToken.is_activated) {
      throw new HttpException('Token already activated', HttpStatus.GONE);
    }

    if (deviceToken.expires_at && deviceToken.expires_at < new Date()) {
      throw new HttpException('Activation token expired', HttpStatus.GONE);
    }

    // Generate auth token
    const authToken = this.generateToken(64);
    
    // Activate device
    deviceToken.is_activated = true;
    deviceToken.activated_at = new Date();
    deviceToken.auth_token = authToken;
    
    await this.deviceTokenRepository.save(deviceToken);

    return {
      auth_token: authToken,
      device_token: deviceToken.device_token,
      device_id: deviceToken.device_id,
      vessel: deviceToken.vessel?.name,
    };
  }

  async validateDeviceToken(authToken: string): Promise<DeviceToken> {
    const deviceToken = await this.deviceTokenRepository.findOne({
      where: { 
        auth_token: authToken,
        is_activated: true 
      },
      relations: ['vessel'],
    });

    if (!deviceToken) {
      throw new UnauthorizedException('Invalid device token');
    }

    return deviceToken;
  }

  async createDeviceToken(vesselId?: number, expiresInDays: number = 30): Promise<DeviceToken> {
    const deviceToken = new DeviceToken();
    deviceToken.device_token = this.generateToken(32);
    deviceToken.activation_token = this.generateToken(16);
    deviceToken.vessel_id = vesselId;
    
    if (expiresInDays > 0) {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiresInDays);
      deviceToken.expires_at = expiresAt;
    }

    return await this.deviceTokenRepository.save(deviceToken);
  }

  private generateToken(length: number): string {
    return randomBytes(length).toString('base64url');
  }
}