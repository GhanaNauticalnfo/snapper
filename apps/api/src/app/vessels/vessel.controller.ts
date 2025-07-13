// vessel.controller.ts
import { 
    Controller, Get, Post, Body, Param, Put, 
    Delete, HttpException, HttpStatus, Query 
  } from '@nestjs/common';
  import { 
    ApiTags, ApiOperation, ApiResponse, ApiParam, 
    ApiBearerAuth, ApiBody 
  } from '@nestjs/swagger';
  import { VesselService } from './vessel.service';
  import { Vessel } from './vessel.entity';
  import { CreateVesselDto } from './dto/create-vessel.dto';
  import { UpdateVesselDto } from './dto/update-vessel.dto';
  import { VesselResponseDto } from './dto/vessel-response.dto';
import { Public } from '../auth/decorators';
  
  @ApiTags('vessels')
  @Controller('vessels')
  export class VesselController {
    constructor(
      private readonly vesselService: VesselService
    ) {}
  
    @Get()
    @Public() // Public access for frontend map
    @ApiOperation({ summary: 'Get all vessels', description: 'Retrieve a list of all vessels' })
    @ApiResponse({ status: 200, description: 'List of vessels retrieved successfully', type: [VesselResponseDto] })
    async findAll(@Query('includeLatestPosition') includeLatestPosition?: string): Promise<VesselResponseDto[]> {
      if (includeLatestPosition === 'true') {
        return this.vesselService.findAllWithLatestPositions();
      }
      return this.vesselService.findAll();
    }
  
    @Get(':id')
    @Public() // Public access for frontend map
    @ApiOperation({ summary: 'Get vessel by ID', description: 'Retrieve a specific vessel by its ID' })
    @ApiParam({ name: 'id', description: 'Vessel ID', type: Number })
    @ApiResponse({ status: 200, description: 'Vessel retrieved successfully', type: VesselResponseDto })
    @ApiResponse({ status: 404, description: 'Vessel not found' })
    async findOne(@Param('id') id: string): Promise<VesselResponseDto> {
      const vessel = await this.vesselService.findOne(+id);
      
      if (!vessel) {
        throw new HttpException('Vessel not found', HttpStatus.NOT_FOUND);
      }
      
      return vessel;
    }
  
    @Post()
    @ApiOperation({ summary: 'Create new vessel', description: 'Create a new vessel with the provided data' })
    @ApiBody({ type: CreateVesselDto, description: 'Vessel data' })
    @ApiResponse({ status: 201, description: 'Vessel created successfully', type: VesselResponseDto })
    @ApiResponse({ status: 400, description: 'Bad request' })
    async create(@Body() createVesselDto: CreateVesselDto): Promise<VesselResponseDto> {
      try {
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
    @ApiOperation({ summary: 'Update vessel', description: 'Update an existing vessel with the provided data' })
    @ApiParam({ name: 'id', description: 'Vessel ID', type: Number })
    @ApiBody({ type: UpdateVesselDto, description: 'Vessel update data' })
    @ApiResponse({ status: 200, description: 'Vessel updated successfully', type: VesselResponseDto })
    @ApiResponse({ status: 404, description: 'Vessel not found' })
    @ApiResponse({ status: 400, description: 'Bad request' })
    async update(
      @Param('id') id: string,
      @Body() updateVesselDto: UpdateVesselDto
    ): Promise<VesselResponseDto> {
      try {
        const vessel = await this.vesselService.findOne(+id);
        
        if (!vessel) {
          throw new HttpException('Vessel not found', HttpStatus.NOT_FOUND);
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