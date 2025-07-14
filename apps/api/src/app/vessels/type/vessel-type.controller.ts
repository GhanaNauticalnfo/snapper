import { Controller, Get, Post, Put, Delete, Body, Param, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody } from '@nestjs/swagger';
import { VesselTypeService } from './vessel-type.service';
import { VesselTypeInputDto } from './dto/vessel-type-input.dto';
import { VesselTypeResponseDto } from './dto/vessel-type-response.dto';
import { Public } from '../../auth/decorators';

@ApiTags('vessel-types')
@Controller('vessels/types')
export class VesselTypeController {
  constructor(private readonly vesselTypeService: VesselTypeService) {}

  @Get()
  @Public() // Public access for frontend map
  @ApiOperation({ summary: 'Get all vessel types' })
  @ApiResponse({ status: 200, description: 'List of vessel types', type: [VesselTypeResponseDto] })
  async findAll(): Promise<VesselTypeResponseDto[]> {
    return this.vesselTypeService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a vessel type by ID' })
  @ApiParam({ name: 'id', description: 'Vessel type ID' })
  @ApiResponse({ status: 200, description: 'Vessel type details', type: VesselTypeResponseDto })
  @ApiResponse({ status: 404, description: 'Vessel type not found' })
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<VesselTypeResponseDto> {
    return this.vesselTypeService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new vessel type' })
  @ApiBody({ type: VesselTypeInputDto })
  @ApiResponse({ status: 201, description: 'Vessel type created successfully', type: VesselTypeResponseDto })
  @ApiResponse({ status: 409, description: 'Vessel type name already exists' })
  async create(@Body() vesselTypeDto: VesselTypeInputDto): Promise<VesselTypeResponseDto> {
    return this.vesselTypeService.create(vesselTypeDto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a vessel type' })
  @ApiParam({ name: 'id', description: 'Vessel type ID' })
  @ApiBody({ type: VesselTypeInputDto })
  @ApiResponse({ status: 200, description: 'Vessel type updated successfully', type: VesselTypeResponseDto })
  @ApiResponse({ status: 404, description: 'Vessel type not found' })
  @ApiResponse({ status: 409, description: 'Vessel type name already exists' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() vesselTypeDto: VesselTypeInputDto,
  ): Promise<VesselTypeResponseDto> {
    return this.vesselTypeService.update(id, vesselTypeDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a vessel type' })
  @ApiParam({ name: 'id', description: 'Vessel type ID' })
  @ApiResponse({ status: 200, description: 'Vessel type deleted successfully' })
  @ApiResponse({ status: 400, description: 'Cannot delete default vessel type' })
  @ApiResponse({ status: 404, description: 'Vessel type not found' })
  async remove(@Param('id', ParseIntPipe) id: number): Promise<{ message: string }> {
    await this.vesselTypeService.remove(id);
    return { message: 'Vessel type deleted successfully' };
  }
}