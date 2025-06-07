// tracking.controller.ts
import { 
    Controller, Get, Post, Body, Param, 
    HttpException, HttpStatus, Query, UseGuards, Req
  } from '@nestjs/common';
  import { TrackingService } from './tracking.service';
  import { TrackingPoint } from './tracking-point.entity';
  import { VesselService } from './vessel.service';
  import { CreateTrackingPointDto } from './tracking-point.dto';
  import { DeviceAuthService } from './device-auth.service';
  import { DeviceAuthGuard } from './device-auth.guard';
  
  @Controller('tracking')
  export class TrackingController {
    constructor(
      private readonly trackingService: TrackingService,
      private readonly vesselService: VesselService,
      private readonly deviceAuthService: DeviceAuthService
    ) {}
  
    @Get()
    async findAll(): Promise<TrackingPoint[]> {
      return this.trackingService.findAll();
    }
  
    @Get('latest')
    async getLatestPositions(): Promise<TrackingPoint[]> {
      return this.trackingService.getLatestPositions();
    }
  
    @Get(':id')
    async findOne(@Param('id') id: string): Promise<TrackingPoint> {
      const point = await this.trackingService.findOne(+id);
      
      if (!point) {
        throw new HttpException('Tracking point not found', HttpStatus.NOT_FOUND);
      }
      
      return point;
    }
  
    @Post()
    async create(@Body() createTrackingDto: CreateTrackingPointDto): Promise<TrackingPoint> {
      try {
        // Ensure vessel exists
        const vessel = await this.vesselService.findOne(createTrackingDto.vessel_id);
        
        if (!vessel) {
          throw new HttpException(
            'Vessel not found',
            HttpStatus.NOT_FOUND
          );
        }
        
        // Set timestamp to now if not provided
        if (!createTrackingDto.timestamp) {
          createTrackingDto.timestamp = new Date();
        }
        
        return await this.trackingService.create(createTrackingDto);
      } catch (error) {
        if (error instanceof HttpException) {
          throw error;
        }
        
        throw new HttpException(
          'Error creating tracking point',
          HttpStatus.BAD_REQUEST
        );
      }
    }
  
    @Post('batch')
    async createBatch(@Body() trackingPoints: CreateTrackingPointDto[]): Promise<{ success: boolean, count: number }> {
      try {
        let successCount = 0;
        
        for (const point of trackingPoints) {
          // Ensure vessel exists
          const vessel = await this.vesselService.findOne(point.vessel_id);
          
          if (!vessel) {
            continue; // Skip points for non-existent vessels
          }
          
          // Set timestamp to now if not provided
          if (!point.timestamp) {
            point.timestamp = new Date();
          }
          
          await this.trackingService.create(point);
          successCount++;
        }
        
        return {
          success: true,
          count: successCount
        };
      } catch (error) {
        throw new HttpException(
          'Error creating tracking points batch',
          HttpStatus.BAD_REQUEST
        );
      }
    }

    @Post('activate')
    async activateDevice(@Body() body: { activation_token: string }) {
      return await this.deviceAuthService.activateDevice(body.activation_token);
    }

    @Post('report')
    @UseGuards(DeviceAuthGuard)
    async reportPosition(@Body() body: any, @Req() req: any): Promise<TrackingPoint> {
      const device = req.device;
      
      // Map Android format to our format
      const trackingData: CreateTrackingPointDto = {
        vessel_id: device.vessel_id,
        latitude: body.latitude,
        longitude: body.longitude,
        timestamp: new Date(body.timestamp),
        speed: body.speed || null,
        course: body.bearing || null,
        altitude: body.altitude || null,
        accuracy: body.accuracy || null,
        provider: body.provider || null
      };

      return await this.trackingService.create(trackingData);
    }

    @Post('test-update')
    async testPositionUpdate(@Body() body: { vessel_id: number; latitude: number; longitude: number; speed?: number; heading?: number }): Promise<{ success: boolean; message: string }> {
      try {
        const trackingData: CreateTrackingPointDto = {
          vessel_id: body.vessel_id,
          latitude: body.latitude,
          longitude: body.longitude,
          timestamp: new Date(),
          speed_knots: body.speed || Math.random() * 20, // Random speed between 0-20 knots
          heading_degrees: body.heading || Math.random() * 360, // Random heading
          status: 'Active'
        };

        await this.trackingService.create(trackingData);
        
        return {
          success: true,
          message: `Position update sent for vessel ${body.vessel_id} at ${body.latitude}, ${body.longitude}`
        };
      } catch (error) {
        return {
          success: false,
          message: `Failed to update position: ${error.message}`
        };
      }
    }
  }