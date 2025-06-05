import { Injectable, UnauthorizedException, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Device } from './device.entity';
import { randomBytes } from 'crypto';

@Injectable()
export class DeviceAuthService {
  constructor(
    @InjectRepository(Device)
    private deviceRepository: Repository<Device>,
  ) {}

  async activateDevice(activationToken: string): Promise<{
    auth_token: string;
    device_token: string;
    device_id: string;
    vessel?: string;
  }> {
    const device = await this.deviceRepository.findOne({
      where: { activation_token: activationToken },
      relations: ['vessel'],
    });

    if (!device) {
      throw new HttpException('Invalid activation token', HttpStatus.NOT_FOUND);
    }

    if (device.is_activated) {
      throw new HttpException('Token already activated', HttpStatus.GONE);
    }

    if (device.expires_at && device.expires_at < new Date()) {
      throw new HttpException('Activation token expired', HttpStatus.GONE);
    }

    // Generate auth token
    const authToken = this.generateToken(64);
    
    // Activate device
    device.is_activated = true;
    device.activated_at = new Date();
    device.auth_token = authToken;
    
    await this.deviceRepository.save(device);

    return {
      auth_token: authToken,
      device_token: device.device_token,
      device_id: device.device_id,
      vessel: device.vessel?.name,
    };
  }

  async validateDevice(authToken: string): Promise<Device> {
    const device = await this.deviceRepository.findOne({
      where: { 
        auth_token: authToken,
        is_activated: true 
      },
      relations: ['vessel'],
    });

    if (!device) {
      throw new UnauthorizedException('Invalid device token');
    }

    return device;
  }

  async createDevice(vesselId?: number, expiresInDays: number = 30): Promise<Device> {
    const device = new Device();
    device.device_token = this.generateToken(32);
    device.activation_token = this.generateToken(16);
    device.vessel_id = vesselId;
    
    if (expiresInDays > 0) {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiresInDays);
      device.expires_at = expiresAt;
    }

    return await this.deviceRepository.save(device);
  }

  private generateToken(length: number): string {
    return randomBytes(length).toString('base64url');
  }
}