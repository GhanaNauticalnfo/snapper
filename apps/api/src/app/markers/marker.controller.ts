import { Controller, Get, Post, Put, Delete, Body, Param } from '@nestjs/common';
import { MarkerService } from './marker.service';
import { Marker } from './marker.entity';

@Controller('markers')
export class MarkerController {
  constructor(private readonly markerService: MarkerService) {}

  @Get()
  findAll(): Promise<Marker[]> {
    return this.markerService.findAll();
  }

  @Get('enabled')
  findEnabled(): Promise<Marker[]> {
    return this.markerService.findEnabled();
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<Marker> {
    return this.markerService.findOne(+id);
  }

  @Post()
  create(@Body() markerData: Partial<Marker>): Promise<Marker> {
    return this.markerService.create(markerData);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() markerData: Partial<Marker>): Promise<Marker> {
    return this.markerService.update(+id, markerData);
  }

  @Delete(':id')
  remove(@Param('id') id: string): Promise<void> {
    return this.markerService.remove(+id);
  }
}