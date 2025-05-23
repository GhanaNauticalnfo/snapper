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
  async findAll(@Query('include_expired') includeExpired?: boolean) {
    const query = this.deviceTokenRepository.createQueryBuilder('token')
      .leftJoinAndSelect('token.vessel', 'vessel');

    if (!includeExpired) {
      query.where('token.expires_at IS NULL OR token.expires_at > :now', { now: new Date() });
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
}