import { Controller, Get, Post, Body, Param, Delete, Query, NotFoundException, HttpCode } from '@nestjs/common';
import { 
  ApiTags, ApiOperation, ApiResponse, ApiParam, 
  ApiQuery, ApiBearerAuth, ApiBody 
} from '@nestjs/swagger';
import { DeviceAuthService } from './device-auth.service';
import { Public } from '../../auth/decorators';
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
    console.log('=== DEVICE CONTROLLER GET ===');
    console.log('GET /api/devices request');
    console.log('Query params:', { includeExpired, includeRetired, vesselId });
    console.log('Timestamp:', new Date().toISOString());
    const query = this.deviceRepository.createQueryBuilder('device')
      .leftJoinAndSelect('device.vessel', 'vessel');

    if (vesselId) {
      query.andWhere('device.vessel_id = :vesselId', { vesselId });
    }

    // Convert string parameters to boolean
    const shouldIncludeExpired = includeExpired === true || includeExpired === 'true';
    const shouldIncludeRetired = includeRetired === true || includeRetired === 'true';

    if (!shouldIncludeExpired) {
      query.andWhere('(device.expires_at IS NULL OR device.expires_at > :now)', { now: new Date() });
    }

    if (!shouldIncludeRetired) {
      query.andWhere('device.state != :retiredState', { retiredState: 'retired' });
    }

    const devices = await query.orderBy('device.created_at', 'DESC').getMany();
    console.log(`DEBUG: Found ${devices.length} devices for vessel ${vesselId}`);
    devices.forEach(d => {
      console.log(`  - Device ${d.device_id}: vessel_id=${d.vessel_id}, state=${d.state}`);
    });
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
    console.log('=== DEVICE CONTROLLER CREATE ===');
    console.log('Received POST /api/devices request');
    console.log('Request body:', JSON.stringify(deviceInput, null, 2));
    console.log('Request timestamp:', new Date().toISOString());
    
    const device = await this.deviceAuthService.createDevice(
      deviceInput.vessel_id,
      deviceInput.expires_in_days || 30
    );

    console.log('Device created, returning response');
    console.log('=== END DEVICE CONTROLLER CREATE ===');
    
    return device.toResponseDto(true);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete device', description: 'Delete or retire a device. Active devices are automatically retired (preserved in database), while pending and retired devices are deleted completely.' })
  @ApiParam({ name: 'id', description: 'Device ID', type: String })
  @ApiResponse({ status: 200, description: 'Device deleted or retired successfully' })
  @ApiResponse({ status: 404, description: 'Device not found' })
  async remove(@Param('id') id: string) {
    await this.deviceAuthService.deleteDevice(id);
    return { success: true };
  }



  @Post('activate')
  @Public() // Device activation must be public for Android app
  @HttpCode(200)
  @ApiOperation({ summary: 'Activate device', description: 'Activate a device using an activation token' })
  @ApiBody({ type: DeviceActivationDto })
  @ApiResponse({ status: 200, description: 'Device activated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid activation token' })
  @ApiResponse({ status: 410, description: 'Activation token expired' })
  async activate(@Body() activationDto: DeviceActivationDto) {
    return await this.deviceAuthService.activateDevice(activationDto.activation_token);
  }
}