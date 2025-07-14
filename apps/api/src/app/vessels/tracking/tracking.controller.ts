import { 
  Controller, Get, Post, Body, Param, 
  HttpException, HttpStatus, Query, UseGuards, Req, Res
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Response } from 'express';
import { TrackingService } from './tracking.service';
import { TelemetryExportService, TelemetryExportFilters } from './telemetry-export.service';
import { VesselTelemetryInputDto } from './dto/vessel-telemetry-input.dto';
import { VesselTelemetryResponseDto } from './dto/vessel-telemetry-response.dto';
import { VesselService } from '../vessel.service';
import { DeviceAuthGuard } from '../device';
import { Public } from '../../auth/decorators';

@ApiTags('vessel-telemetry')
@Controller('vessels')
export class TrackingController {
  constructor(
    private readonly trackingService: TrackingService,
    private readonly vesselService: VesselService,
    private readonly telemetryExportService: TelemetryExportService
  ) {}

  @Get('telemetry/latest')
  @ApiOperation({ 
    summary: 'Get latest telemetry data for all vessels',
    description: 'Returns the most recent telemetry records for all vessels, including position, speed, heading, battery level, signal strength, and status'
  })
  @ApiResponse({ status: 200, type: [VesselTelemetryResponseDto] })
  async getLatestPositions(): Promise<VesselTelemetryResponseDto[]> {
    return this.trackingService.getLatestPositions();
  }

  @Get(':vesselId/telemetry')
  @ApiOperation({ 
    summary: 'Get telemetry history for a specific vessel',
    description: 'Returns historical telemetry records for the specified vessel, including position, speed, heading, battery level, signal strength, and status. Supports time range filtering and result limiting.'
  })
  @ApiParam({ name: 'vesselId', type: Number })
  @ApiResponse({ status: 200, type: [VesselTelemetryResponseDto] })
  async getVesselTelemetry(
    @Param('vesselId') vesselId: string,
    @Query('limit') limit?: string,
    @Query('start') startTime?: string,
    @Query('end') endTime?: string
  ): Promise<VesselTelemetryResponseDto[]> {
    const vessel = await this.vesselService.findOne(+vesselId);
    
    if (!vessel) {
      throw new HttpException('Vessel not found', HttpStatus.NOT_FOUND);
    }
    
    if (startTime && endTime) {
      return this.trackingService.findByVesselAndTimeRange(
        +vesselId,
        new Date(startTime),
        new Date(endTime)
      );
    } else {
      return this.trackingService.findByVessel(+vesselId, limit ? +limit : 100);
    }
  }

  @Get(':vesselId/telemetry/latest')
  @ApiOperation({ 
    summary: 'Get latest telemetry data for a specific vessel',
    description: 'Returns the most recent telemetry record including position, speed, heading, battery level, signal strength, and status for the specified vessel'
  })
  @ApiParam({ name: 'vesselId', type: Number })
  @ApiResponse({ status: 200, type: VesselTelemetryResponseDto })
  async getVesselLatestPosition(
    @Param('vesselId') vesselId: string
  ): Promise<VesselTelemetryResponseDto> {
    const vessel = await this.vesselService.findOne(+vesselId);
    
    if (!vessel) {
      throw new HttpException('Vessel not found', HttpStatus.NOT_FOUND);
    }

    const latest = await this.trackingService.getVesselLatestPosition(+vesselId);
    if (!latest) {
      throw new HttpException('No telemetry data found for this vessel', HttpStatus.NOT_FOUND);
    }

    return latest;
  }

  @Post(':vesselId/telemetry')
  @ApiOperation({ 
    summary: 'Report new telemetry data for a vessel',
    description: 'Submit new telemetry data including position, speed, heading, battery level, signal strength, and status for the specified vessel'
  })
  @ApiParam({ name: 'vesselId', type: Number })
  @ApiResponse({ status: 201, type: VesselTelemetryResponseDto })
  async reportPosition(
    @Param('vesselId') vesselId: string,
    @Body() trackingData: VesselTelemetryInputDto
  ): Promise<VesselTelemetryResponseDto> {
    const vessel = await this.vesselService.findOne(+vesselId);
    
    if (!vessel) {
      throw new HttpException('Vessel not found', HttpStatus.NOT_FOUND);
    }

    return this.trackingService.create(+vesselId, trackingData);
  }

  // Special endpoint for device authentication - uses device's vessel_id
  @Post('telemetry/report')
  @Public() // Allow device bearer tokens to bypass Keycloak auth
  @UseGuards(DeviceAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Report telemetry data from authenticated device',
    description: 'Submit telemetry data including position, speed, heading, battery level, signal strength, and status from an authenticated device. The vessel is automatically determined from the device authentication.'
  })
  @ApiResponse({ status: 201, type: VesselTelemetryResponseDto })
  async reportPositionFromDevice(
    @Body() trackingData: VesselTelemetryInputDto,
    @Req() req: any
  ): Promise<VesselTelemetryResponseDto> {
    const device = req.device;
    return this.trackingService.create(device.vessel_id, trackingData, device.device_id);
  }

  @Get('telemetry/export/stats')
  @ApiOperation({
    summary: 'Get telemetry export statistics',
    description: 'Returns statistics about available telemetry data including total records and date range. Useful for determining export scope before downloading.'
  })
  @ApiQuery({ name: 'startDate', required: false, description: 'Start date for filtering (ISO string)', type: String })
  @ApiQuery({ name: 'endDate', required: false, description: 'End date for filtering (ISO string)', type: String })
  @ApiQuery({ name: 'vesselIds', required: false, description: 'Comma-separated vessel IDs to filter', type: String })
  @ApiQuery({ name: 'vesselTypeIds', required: false, description: 'Comma-separated vessel type IDs to filter', type: String })
  @ApiResponse({ 
    status: 200, 
    description: 'Export statistics',
    schema: {
      type: 'object',
      properties: {
        totalRecords: { type: 'number' },
        dateRange: {
          type: 'object',
          properties: {
            min: { type: 'string', format: 'date-time' },
            max: { type: 'string', format: 'date-time' }
          }
        }
      }
    }
  })
  async getTelemetryExportStats(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('vesselIds') vesselIds?: string,
    @Query('vesselTypeIds') vesselTypeIds?: string
  ) {
    const filters: Partial<TelemetryExportFilters> = {};
    
    if (startDate) filters.startDate = new Date(startDate);
    if (endDate) filters.endDate = new Date(endDate);
    if (vesselIds) filters.vesselIds = vesselIds.split(',').map(id => parseInt(id.trim()));
    if (vesselTypeIds) filters.vesselTypeIds = vesselTypeIds.split(',').map(id => parseInt(id.trim()));

    return this.telemetryExportService.getExportStats(filters);
  }

  @Get('telemetry/export')
  @ApiOperation({
    summary: 'Export telemetry data as zipped CSV',
    description: 'Downloads telemetry data as a zipped CSV file. Supports filtering by date range, specific vessels, and vessel types. Data is streamed to handle large datasets efficiently.'
  })
  @ApiQuery({ name: 'startDate', required: true, description: 'Start date for export (ISO string)', type: String })
  @ApiQuery({ name: 'endDate', required: true, description: 'End date for export (ISO string)', type: String })
  @ApiQuery({ name: 'vesselIds', required: false, description: 'Comma-separated vessel IDs to include', type: String })
  @ApiQuery({ name: 'vesselTypeIds', required: false, description: 'Comma-separated vessel type IDs to include', type: String })
  @ApiResponse({ 
    status: 200, 
    description: 'Zipped CSV file download',
    headers: {
      'Content-Type': { description: 'application/zip' },
      'Content-Disposition': { description: 'attachment; filename="telemetry-export-YYYY-MM-DD.zip"' }
    }
  })
  async exportTelemetryData(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Res() response: Response,
    @Query('vesselIds') vesselIds?: string,
    @Query('vesselTypeIds') vesselTypeIds?: string
  ): Promise<void> {
    if (!startDate || !endDate) {
      throw new HttpException('startDate and endDate are required', HttpStatus.BAD_REQUEST);
    }

    const filters: TelemetryExportFilters = {
      startDate: new Date(startDate),
      endDate: new Date(endDate)
    };

    if (vesselIds) {
      filters.vesselIds = vesselIds.split(',').map(id => parseInt(id.trim()));
    }

    if (vesselTypeIds) {
      filters.vesselTypeIds = vesselTypeIds.split(',').map(id => parseInt(id.trim()));
    }

    try {
      await this.telemetryExportService.streamTelemetryExport(filters, response);
    } catch (error) {
      console.error('Export error:', error);
      if (!response.headersSent) {
        throw new HttpException('Failed to export telemetry data', HttpStatus.INTERNAL_SERVER_ERROR);
      }
    }
  }
}