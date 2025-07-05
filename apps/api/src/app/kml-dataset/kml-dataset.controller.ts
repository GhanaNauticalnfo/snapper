// kml-dataset.controller.ts
import { Controller, Get, Post, Body, Param, Put, Delete, HttpException, HttpStatus } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { KmlDatasetService } from './kml-dataset.service';
import { KmlDataset } from './kml-dataset.entity';

@ApiTags('kml-datasets')
@Controller('kml-datasets')
export class KmlDatasetController {
  constructor(private readonly kmlDatasetService: KmlDatasetService) {}

  @Get()
  async findAll(): Promise<KmlDataset[]> {
    return this.kmlDatasetService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<KmlDataset> {
    const dataset = await this.kmlDatasetService.findOne(+id);
    
    if (!dataset) {
      throw new HttpException('KML dataset not found', HttpStatus.NOT_FOUND);
    }
    
    return dataset;
  }

  @Get('enabled')
  async findAllEnabled(): Promise<{ id: number; last_updated: Date }[]> {
    try {
      return await this.kmlDatasetService.findAllEnabled();
    } catch {
      throw new HttpException('Error fetching enabled KML datasets', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
// kml-dataset.controller.ts - update the create method
@Post()
async create(@Body() body: { kml: string, name: string, enabled?: boolean }): Promise<KmlDataset> {
  try {
    return await this.kmlDatasetService.create(body.kml, body.name, body.enabled);
  } catch {
    throw new HttpException('Error creating KML dataset', HttpStatus.BAD_REQUEST);
  }
}

// kml-dataset.controller.ts - update the update method
@Put(':id')
async update(@Param('id') id: string, @Body() body: { kml?: string, name?: string, enabled?: boolean }): Promise<KmlDataset> {
  try {
    return await this.kmlDatasetService.update(+id, body);
  } catch {
    throw new HttpException('Error updating KML dataset', HttpStatus.BAD_REQUEST);
  }
}

  @Delete(':id')
  async remove(@Param('id') id: string): Promise<void> {
    const dataset = await this.kmlDatasetService.findOne(+id);
    
    if (!dataset) {
      throw new HttpException('KML dataset not found', HttpStatus.NOT_FOUND);
    }
    
    await this.kmlDatasetService.remove(+id);
  }
}