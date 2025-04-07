// vessel.controller.ts
import { 
    Controller, Get, Post, Body, Param, Put, 
    Delete, HttpException, HttpStatus, Query 
  } from '@nestjs/common';
  import { VesselService } from './vessel.service';
  import { Vessel } from './vessel.entity';
  import { TrackingService } from './tracking.service';
  
  @Controller('vessels')
  export class VesselController {
    constructor(
      private readonly vesselService: VesselService,
      private readonly trackingService: TrackingService
    ) {}
  
    @Get()
    async findAll(@Query('active') active?: string): Promise<Vessel[]> {
      if (active === 'true') {
        return this.vesselService.findActive();
      }
      return this.vesselService.findAll();
    }
  
    @Get(':id')
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
    async remove(@Param('id') id: string): Promise<void> {
      const vessel = await this.vesselService.findOne(+id);
      
      if (!vessel) {
        throw new HttpException('Vessel not found', HttpStatus.NOT_FOUND);
      }
      
      await this.vesselService.remove(+id);
    }
  }