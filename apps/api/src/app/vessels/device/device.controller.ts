import { Controller, Get, Post, Body, Param, Delete, Query, NotFoundException } from '@nestjs/common';
import { 
  ApiTags, ApiOperation, ApiResponse, ApiParam, 
  ApiQuery, ApiBearerAuth, ApiBody 
} from '@nestjs/swagger';
import { DeviceAuthService } from './device-auth.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Device } from './device.entity';
import { DeviceInputDto } from './dto/device-input.dto';
import { DeviceResponseDto } from './dto/device-response.dto';
import { DeviceActivationDto } from './dto/device-activation.dto';

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
  @ApiQuery({ name: 'include_retired', required: false, type: Boolean, description: 'Include retired devices' })
  @ApiQuery({ name: 'vessel_id', required: false, type: Number, description: 'Filter by vessel ID' })
  @ApiResponse({ status: 200, description: 'List of devices retrieved successfully', type: [DeviceResponseDto] })
  async findAll(
    @Query('include_expired') includeExpired?: string | boolean,
    @Query('include_retired') includeRetired?: string | boolean,
    @Query('vessel_id') vesselId?: number
  ): Promise<DeviceResponseDto[]> {
    const query = this.deviceRepository.createQueryBuilder('device')
      .leftJoinAndSelect('device.vessel', 'vessel');

    if (vesselId) {
      query.andWhere('device.vessel_id = :vesselId', { vesselId });
    }

    // Convert string parameters to boolean
    const shouldIncludeExpired = includeExpired === true || includeExpired === 'true';
    const shouldIncludeRetired = includeRetired === true || includeRetired === 'true';

    if (!shouldIncludeExpired) {
      query.andWhere('device.expires_at IS NULL OR device.expires_at > :now', { now: new Date() });
    }

    if (!shouldIncludeRetired) {
      query.andWhere('device.state != :retiredState', { retiredState: 'retired' });
    }

    const devices = await query.orderBy('device.created_at', 'DESC').getMany();
    return devices.map(device => device.toResponseDto());
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get device by ID', description: 'Retrieve a specific device by its ID' })
  @ApiParam({ name: 'id', description: 'Device ID', type: String })
  @ApiResponse({ status: 200, description: 'Device retrieved successfully', type: DeviceResponseDto })
  @ApiResponse({ status: 404, description: 'Device not found' })
  async findOne(@Param('id') id: string): Promise<DeviceResponseDto> {
    const device = await this.deviceRepository.findOne({
      where: { device_id: id },
      relations: ['vessel'],
    });

    if (!device) {
      throw new NotFoundException('Device not found');
    }

    return device.toResponseDto();
  }

  @Post()
  @ApiOperation({ summary: 'Create new device', description: 'Create a new device with activation token' })
  @ApiBody({ type: DeviceInputDto })
  @ApiResponse({ status: 201, description: 'Device created successfully', type: DeviceResponseDto })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async create(@Body() deviceInput: DeviceInputDto): Promise<DeviceResponseDto> {
    const device = await this.deviceAuthService.createDevice(
      deviceInput.vessel_id,
      deviceInput.expires_in_days || 30
    );

    return device.toResponseDto(true);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete device', description: 'Delete a pending or retired device by its ID. Active devices must be retired first.' })
  @ApiParam({ name: 'id', description: 'Device ID', type: String })
  @ApiResponse({ status: 200, description: 'Device deleted successfully' })
  @ApiResponse({ status: 400, description: 'Cannot delete active device' })
  @ApiResponse({ status: 404, description: 'Device not found' })
  async remove(@Param('id') id: string) {
    await this.deviceAuthService.deleteDevice(id);
    return { success: true };
  }

  @Post(':id/retire')
  @ApiOperation({ summary: 'Retire device', description: 'Retire an active device by changing its state to retired' })
  @ApiParam({ name: 'id', description: 'Device ID', type: String })
  @ApiResponse({ status: 200, description: 'Device retired successfully', type: DeviceResponseDto })
  @ApiResponse({ status: 404, description: 'Active device not found' })
  async retire(@Param('id') id: string): Promise<DeviceResponseDto> {
    const device = await this.deviceAuthService.retireDevice(id);
    return device.toResponseDto();
  }

  @Post(':id/revoke')
  @ApiOperation({ summary: 'Revoke device', description: 'Revoke device access by clearing auth token (deprecated - use retire instead)' })
  @ApiParam({ name: 'id', description: 'Device ID', type: String })
  @ApiResponse({ status: 200, description: 'Device revoked successfully' })
  @ApiResponse({ status: 404, description: 'Device not found' })
  async revoke(@Param('id') id: string) {
    // For backward compatibility, revoke will retire the device
    const device = await this.deviceAuthService.retireDevice(id);
    return { success: true, device: device.toResponseDto() };
  }

  @Post(':id/regenerate')
  @ApiOperation({ summary: 'Regenerate device token', description: 'Create a new device token to replace the existing one' })
  @ApiParam({ name: 'id', description: 'Device ID', type: String })
  @ApiResponse({ status: 200, description: 'Device token regenerated successfully', type: DeviceResponseDto })
  @ApiResponse({ status: 404, description: 'Device not found' })
  async regenerate(@Param('id') id: string): Promise<DeviceResponseDto> {
    const existingDevice = await this.deviceRepository.findOne({
      where: { device_id: id }
    });

    if (!existingDevice) {
      throw new NotFoundException('Device not found');
    }

    // Create new device with 3-day expiration
    const newDevice = await this.deviceAuthService.createDevice(
      existingDevice.vessel_id, 
      3
    );

    // Delete the old device using the service method
    await this.deviceAuthService.deleteDevice(id);

    return newDevice.toResponseDto(true);
  }

  @Post('activate')
  @ApiOperation({ summary: 'Activate device', description: 'Activate a device using an activation token' })
  @ApiBody({ type: DeviceActivationDto })
  @ApiResponse({ status: 200, description: 'Device activated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid activation token' })
  @ApiResponse({ status: 410, description: 'Activation token expired' })
  async activate(@Body() activationDto: DeviceActivationDto) {
    return await this.deviceAuthService.activateDevice(activationDto.activation_token);
  }
}