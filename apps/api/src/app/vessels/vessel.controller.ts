// vessel.controller.ts
import { 
    Controller, Get, Post, Body, Param, Put, 
    Delete, HttpException, HttpStatus, Query 
  } from '@nestjs/common';
  import { 
    ApiTags, ApiOperation, ApiResponse, ApiParam, 
    ApiQuery, ApiBearerAuth, ApiBody 
  } from '@nestjs/swagger';
  import { VesselService } from './vessel.service';
  import { Vessel } from './vessel.entity';
  import { TrackingService } from './tracking.service';
  
  @ApiTags('vessels')
  @Controller('vessels')
  export class VesselController {
    constructor(
      private readonly vesselService: VesselService,
      private readonly trackingService: TrackingService
    ) {}
  
    @Get()
    @ApiOperation({ summary: 'Get all vessels', description: 'Retrieve a list of all vessels or only active vessels' })
    @ApiQuery({ name: 'active', required: false, type: Boolean, description: 'Filter for active vessels only' })
    @ApiResponse({ status: 200, description: 'List of vessels retrieved successfully', type: [Vessel] })
    async findAll(@Query('active') active?: string): Promise<Vessel[]> {
      if (active === 'true') {
        return this.vesselService.findActive();
      }
      return this.vesselService.findAll();
    }
  
    @Get(':id')
    @ApiOperation({ summary: 'Get vessel by ID', description: 'Retrieve a specific vessel by its ID' })
    @ApiParam({ name: 'id', description: 'Vessel ID', type: Number })
    @ApiResponse({ status: 200, description: 'Vessel retrieved successfully', type: Vessel })
    @ApiResponse({ status: 404, description: 'Vessel not found' })
    async findOne(@Param('id') id: string): Promise<Vessel> {
      const vessel = await this.vesselService.findOne(+id);
      
      if (!vessel) {
        throw new HttpException('Vessel not found', HttpStatus.NOT_FOUND);
      }
      
      return vessel;
    }
  
    @Get(':id/tracking')
    async getVesselTracking(
      @Param('id') id: string,
      @Query('limit') limit?: string,
      @Query('start') startTime?: string,
      @Query('end') endTime?: string
    ) {
      const vessel = await this.vesselService.findOne(+id);
      
      if (!vessel) {
        throw new HttpException('Vessel not found', HttpStatus.NOT_FOUND);
      }
      
      if (startTime && endTime) {
        return this.trackingService.findByVesselAndTimeRange(
          +id,
          new Date(startTime),
          new Date(endTime)
        );
      } else {
        return this.trackingService.findByVessel(+id, limit ? +limit : 100);
      }
    }
  
    @Post()
    @ApiOperation({ summary: 'Create new vessel', description: 'Create a new vessel with the provided data' })
    @ApiBody({ type: Vessel, description: 'Vessel data' })
    @ApiResponse({ status: 201, description: 'Vessel created successfully', type: Vessel })
    @ApiResponse({ status: 409, description: 'Vessel with this registration number already exists' })
    @ApiResponse({ status: 400, description: 'Bad request' })
    async create(@Body() createVesselDto: Partial<Vessel>): Promise<Vessel> {
      try {
        // Check if vessel with same registration already exists
        if (createVesselDto.registration_number) {
          const existing = await this.vesselService.findByRegistration(
            createVesselDto.registration_number
          );
          
          if (existing) {
            throw new HttpException(
              'Vessel with this registration number already exists',
              HttpStatus.CONFLICT
            );
          }
        }
        
        return await this.vesselService.create(createVesselDto);
      } catch (error) {
        if (error instanceof HttpException) {
          throw error;
        }
        throw new HttpException(
          'Error creating vessel',
          HttpStatus.BAD_REQUEST
        );
      }
    }
  
    @Put(':id')
    async update(
      @Param('id') id: string,
      @Body() updateVesselDto: Partial<Vessel>
    ): Promise<Vessel> {
      try {
        const vessel = await this.vesselService.findOne(+id);
        
        if (!vessel) {
          throw new HttpException('Vessel not found', HttpStatus.NOT_FOUND);
        }
        
        // Check registration number uniqueness if it's being updated
        if (updateVesselDto.registration_number && 
            updateVesselDto.registration_number !== vessel.registration_number) {
          const existing = await this.vesselService.findByRegistration(
            updateVesselDto.registration_number
          );
          
          if (existing) {
            throw new HttpException(
              'Vessel with this registration number already exists',
              HttpStatus.CONFLICT
            );
          }
        }
        
        return await this.vesselService.update(+id, updateVesselDto);
      } catch (error) {
        if (error instanceof HttpException) {
          throw error;
        }
        throw new HttpException(
          'Error updating vessel',
          HttpStatus.BAD_REQUEST
        );
      }
    }
  
    @Delete(':id')
    @ApiOperation({ 
      summary: 'Delete vessel and all associated data', 
      description: 'Permanently deletes a vessel and all related devices, tracking data, and other associated information' 
    })
    @ApiParam({ name: 'id', description: 'Vessel ID', type: Number })
    @ApiResponse({ status: 200, description: 'Vessel and all associated data deleted successfully' })
    @ApiResponse({ status: 404, description: 'Vessel not found' })
    @ApiResponse({ status: 500, description: 'Error deleting vessel' })
    async remove(@Param('id') id: string): Promise<{ message: string; deletedData: string[] }> {
      const vessel = await this.vesselService.findOne(+id);
      
      if (!vessel) {
        throw new HttpException('Vessel not found', HttpStatus.NOT_FOUND);
      }
      
      try {
        await this.vesselService.remove(+id);
        
        return {
          message: `Vessel "${vessel.name}" (ID: ${id}) and all associated data have been permanently deleted`,
          deletedData: [
            'Vessel record',
            'All associated devices and authentication tokens',
            'All tracking data and position history',
            'Any navigation data linked to this vessel'
          ]
        };
      } catch (error) {
        console.error(`Error deleting vessel ${id}:`, error);
        throw new HttpException(
          'Failed to delete vessel and associated data',
          HttpStatus.INTERNAL_SERVER_ERROR
        );
      }
    }
  }