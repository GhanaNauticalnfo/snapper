import { Controller, Get, Post, Body, Param, Delete, Query } from '@nestjs/common';
import { DeviceAuthService } from './device-auth.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DeviceToken } from './device-token.entity';

@Controller('device-tokens')
export class DeviceTokenController {
  constructor(
    private readonly deviceAuthService: DeviceAuthService,
    @InjectRepository(DeviceToken)
    private deviceTokenRepository: Repository<DeviceToken>,
  ) {}

  @Get()
  async findAll(
    @Query('include_expired') includeExpired?: boolean,
    @Query('vessel_id') vesselId?: number
  ) {
    const query = this.deviceTokenRepository.createQueryBuilder('token')
      .leftJoinAndSelect('token.vessel', 'vessel');

    if (vesselId) {
      query.andWhere('token.vessel_id = :vesselId', { vesselId });
    }

    if (!includeExpired) {
      query.andWhere('token.expires_at IS NULL OR token.expires_at > :now', { now: new Date() });
    }

    return await query.orderBy('token.created_at', 'DESC').getMany();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return await this.deviceTokenRepository.findOne({
      where: { device_id: id },
      relations: ['vessel'],
    });
  }

  @Post()
  async create(@Body() body: { vessel_id?: number; expires_in_days?: number }) {
    const deviceToken = await this.deviceAuthService.createDeviceToken(
      body.vessel_id,
      body.expires_in_days || 30
    );

    // Generate the activation URL
    const activationUrl = `ghmaritimeapp://auth?token=${deviceToken.activation_token}`;

    return {
      ...deviceToken,
      activation_url: activationUrl,
    };
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.deviceTokenRepository.delete({ device_id: id });
    return { success: true };
  }

  @Post(':id/revoke')
  async revoke(@Param('id') id: string) {
    await this.deviceTokenRepository.update(
      { device_id: id },
      { auth_token: null, is_activated: false }
    );
    return { success: true };
  }

  @Post(':id/regenerate')
  async regenerate(@Param('id') id: string) {
    const existingToken = await this.deviceTokenRepository.findOne({
      where: { device_id: id }
    });

    if (!existingToken) {
      throw new Error('Token not found');
    }

    // Create new token with 3-day expiration
    const newToken = await this.deviceAuthService.createDeviceToken(
      existingToken.vessel_id, 
      3
    );

    // Delete the old token
    await this.deviceTokenRepository.delete({ device_id: id });

    // Generate the activation URL
    const activationUrl = `ghmaritimeapp://auth?token=${newToken.activation_token}`;

    return {
      ...newToken,
      activation_url: activationUrl,
    };
  }
}