import { Controller, Get, Post, Body, Param, Delete, Query } from '@nestjs/common';
import { 
  ApiTags, ApiOperation, ApiResponse, ApiParam, 
  ApiQuery, ApiBearerAuth, ApiBody 
} from '@nestjs/swagger';
import { DeviceAuthService } from './device-auth.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Device } from './device.entity';

@ApiTags('devices')
@Controller('devices')
export class DeviceController {
  constructor(
    private readonly deviceAuthService: DeviceAuthService,
    @InjectRepository(Device)
    private deviceRepository: Repository<Device>,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get all devices', description: 'Retrieve a list of all devices with optional filtering' })
  @ApiQuery({ name: 'include_expired', required: false, type: Boolean, description: 'Include expired devices' })
  @ApiQuery({ name: 'vessel_id', required: false, type: Number, description: 'Filter by vessel ID' })
  @ApiResponse({ status: 200, description: 'List of devices retrieved successfully', type: [Device] })
  async findAll(
    @Query('include_expired') includeExpired?: boolean,
    @Query('vessel_id') vesselId?: number
  ) {
    const query = this.deviceRepository.createQueryBuilder('device')
      .leftJoinAndSelect('device.vessel', 'vessel');

    if (vesselId) {
      query.andWhere('device.vessel_id = :vesselId', { vesselId });
    }

    if (!includeExpired) {
      query.andWhere('device.expires_at IS NULL OR device.expires_at > :now', { now: new Date() });
    }

    return await query.orderBy('device.created_at', 'DESC').getMany();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get device by ID', description: 'Retrieve a specific device by its ID' })
  @ApiParam({ name: 'id', description: 'Device ID', type: String })
  @ApiResponse({ status: 200, description: 'Device retrieved successfully', type: Device })
  @ApiResponse({ status: 404, description: 'Device not found' })
  async findOne(@Param('id') id: string) {
    return await this.deviceRepository.findOne({
      where: { device_id: id },
      relations: ['vessel'],
    });
  }

  @Post()
  @ApiOperation({ summary: 'Create new device', description: 'Create a new device with activation token' })
  @ApiBody({ 
    schema: {
      type: 'object',
      properties: {
        vessel_id: { type: 'number', description: 'ID of vessel to associate with device' },
        expires_in_days: { type: 'number', description: 'Number of days until device expires', default: 30 }
      }
    }
  })
  @ApiResponse({ status: 201, description: 'Device created successfully', type: Device })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async create(@Body() body: { vessel_id?: number; expires_in_days?: number }) {
    const device = await this.deviceAuthService.createDevice(
      body.vessel_id,
      body.expires_in_days || 30
    );

    // Generate the activation URL
    const activationUrl = `ghmaritimeapp://auth?token=${device.activation_token}`;

    return {
      ...device,
      activation_url: activationUrl,
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete device', description: 'Delete a device by its ID' })
  @ApiParam({ name: 'id', description: 'Device ID', type: String })
  @ApiResponse({ status: 200, description: 'Device deleted successfully' })
  @ApiResponse({ status: 404, description: 'Device not found' })
  async remove(@Param('id') id: string) {
    await this.deviceRepository.delete({ device_id: id });
    return { success: true };
  }

  @Post(':id/revoke')
  @ApiOperation({ summary: 'Revoke device', description: 'Revoke device access by clearing auth token' })
  @ApiParam({ name: 'id', description: 'Device ID', type: String })
  @ApiResponse({ status: 200, description: 'Device revoked successfully' })
  @ApiResponse({ status: 404, description: 'Device not found' })
  async revoke(@Param('id') id: string) {
    await this.deviceRepository.update(
      { device_id: id },
      { auth_token: null, is_activated: false }
    );
    return { success: true };
  }

  @Post(':id/regenerate')
  @ApiOperation({ summary: 'Regenerate device token', description: 'Create a new device token to replace the existing one' })
  @ApiParam({ name: 'id', description: 'Device ID', type: String })
  @ApiResponse({ status: 200, description: 'Device token regenerated successfully', type: Device })
  @ApiResponse({ status: 404, description: 'Device not found' })
  async regenerate(@Param('id') id: string) {
    const existingDevice = await this.deviceRepository.findOne({
      where: { device_id: id }
    });

    if (!existingDevice) {
      throw new Error('Device not found');
    }

    // Create new device with 3-day expiration
    const newDevice = await this.deviceAuthService.createDevice(
      existingDevice.vessel_id, 
      3
    );

    // Delete the old device
    await this.deviceRepository.delete({ device_id: id });

    // Generate the activation URL
    const activationUrl = `ghmaritimeapp://auth?token=${newDevice.activation_token}`;

    return {
      ...newDevice,
      activation_url: activationUrl,
    };
  }
}