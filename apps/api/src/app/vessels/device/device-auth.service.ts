import { Injectable, UnauthorizedException, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Device, DeviceState } from './device.entity';
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

    if (device.state === DeviceState.ACTIVE) {
      throw new HttpException('Token already activated', HttpStatus.GONE);
    }

    if (device.expires_at && device.expires_at < new Date()) {
      throw new HttpException('Activation token expired', HttpStatus.GONE);
    }

    // Generate auth token
    const authToken = this.generateToken(64);
    
    // Activate device
    device.activated_at = new Date();
    device.auth_token = authToken;
    device.state = DeviceState.ACTIVE;
    
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
        state: DeviceState.ACTIVE
      },
      relations: ['vessel'],
    });

    if (!device) {
      throw new UnauthorizedException('Invalid device token');
    }

    return device;
  }

  async createDevice(vesselId?: number, expiresInDays: number = 30): Promise<Device> {
    // Check if vessel already has a pending device
    if (vesselId) {
      const existingDevices = await this.deviceRepository.find({
        where: { vessel_id: vesselId }
      });

      // Check for active devices
      const activeDevices = existingDevices.filter(d => d.state === DeviceState.ACTIVE);
      if (activeDevices.length > 1) {
        throw new HttpException('Vessel already has more than one active device. Please clean up first.', HttpStatus.BAD_REQUEST);
      }

      // Check for pending devices
      const now = new Date();
      const pendingDevices = existingDevices.filter(d => 
        d.state === DeviceState.PENDING && (!d.expires_at || d.expires_at > now)
      );
      
      if (pendingDevices.length > 0) {
        throw new HttpException('Vessel already has a pending device. Please activate or delete it first.', HttpStatus.BAD_REQUEST);
      }
    }

    const device = new Device();
    device.device_token = this.generateToken(32);
    device.activation_token = this.generateToken(16);
    device.vessel_id = vesselId;
    device.state = DeviceState.PENDING;
    
    if (expiresInDays > 0) {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiresInDays);
      device.expires_at = expiresAt;
    }

    return await this.deviceRepository.save(device);
  }

  async getDevicesByVessel(vesselId: number): Promise<{
    active: Device | null;
    pending: Device | null;
    retired: Device[];
  }> {
    const devices = await this.deviceRepository.find({
      where: { vessel_id: vesselId },
      order: { created_at: 'DESC' }
    });

    const now = new Date();
    let active: Device | null = null;
    let pending: Device | null = null;
    const retired: Device[] = [];

    for (const device of devices) {
      if (device.state === DeviceState.ACTIVE && !active) {
        active = device;
      } else if (device.state === DeviceState.PENDING && (!device.expires_at || device.expires_at > now) && !pending) {
        pending = device;
      } else if (device.state === DeviceState.RETIRED) {
        retired.push(device);
      }
    }

    return { active, pending, retired };
  }

  async retireDevice(deviceId: string): Promise<Device> {
    const device = await this.deviceRepository.findOne({
      where: { device_id: deviceId, state: DeviceState.ACTIVE }
    });

    if (!device) {
      throw new HttpException('Active device not found', HttpStatus.NOT_FOUND);
    }

    device.state = DeviceState.RETIRED;
    device.auth_token = null; // Clear auth token when retiring
    
    return await this.deviceRepository.save(device);
  }

  async deleteDevice(deviceId: string): Promise<void> {
    const device = await this.deviceRepository.findOne({
      where: { device_id: deviceId }
    });

    if (!device) {
      throw new HttpException('Device not found', HttpStatus.NOT_FOUND);
    }

    if (device.state === DeviceState.ACTIVE) {
      // Active devices should be retired, not deleted
      throw new HttpException('Cannot delete active device. Retire it instead.', HttpStatus.BAD_REQUEST);
    }

    // Only pending and retired devices can be deleted
    await this.deviceRepository.delete({ device_id: deviceId });
  }

  private generateToken(length: number): string {
    return randomBytes(length).toString('base64url');
  }
}