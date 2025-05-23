import { Controller, Get, Post, Put, Delete, Body, Param } from '@nestjs/common';
import { HazardService } from './hazard.service';
import { Hazard } from './hazard.entity';

@Controller('hazards')
export class HazardController {
  constructor(private readonly hazardService: HazardService) {}

  @Get()
  findAll(): Promise<Hazard[]> {
    return this.hazardService.findAll();
  }

  @Get('enabled')
  findEnabled(): Promise<Hazard[]> {
    return this.hazardService.findEnabled();
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<Hazard> {
    return this.hazardService.findOne(+id);
  }

  @Post()
  create(@Body() hazardData: Partial<Hazard>): Promise<Hazard> {
    return this.hazardService.create(hazardData);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() hazardData: Partial<Hazard>): Promise<Hazard> {
    return this.hazardService.update(+id, hazardData);
  }

  @Delete(':id')
  remove(@Param('id') id: string): Promise<void> {
    return this.hazardService.remove(+id);
  }
}