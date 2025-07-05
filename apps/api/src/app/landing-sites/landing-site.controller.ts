import { Controller, Get, Post, Put, Delete, Body, Param, ParseIntPipe, Query, ParseFloatPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { LandingSiteService } from './landing-site.service';
import { CreateLandingSiteDto } from './dto/create-landing-site.dto';
import { UpdateLandingSiteDto } from './dto/update-landing-site.dto';
import { LandingSiteResponseDto } from './dto/landing-site-response.dto';

@ApiTags('landing-sites')
@Controller('landing-sites')
export class LandingSiteController {
  constructor(private readonly landingSiteService: LandingSiteService) {}

  @Get()
  @ApiOperation({ summary: 'Get all landing sites' })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Search by name' })
  @ApiResponse({ 
    status: 200, 
    description: 'Returns all landing sites',
    type: [LandingSiteResponseDto] 
  })
  findAll(
    @Query('search') search?: string,
  ): Promise<LandingSiteResponseDto[]> {
    return this.landingSiteService.findAll(search);
  }

  @Get('enabled')
  @ApiOperation({ summary: 'Get all enabled landing sites' })
  @ApiResponse({ 
    status: 200, 
    description: 'Returns all enabled landing sites',
    type: [LandingSiteResponseDto] 
  })
  findEnabled(): Promise<LandingSiteResponseDto[]> {
    return this.landingSiteService.findEnabled();
  }

  @Get('bounds')
  @ApiOperation({ summary: 'Get landing sites within geographic bounds' })
  @ApiQuery({ name: 'minLon', type: Number, example: -3.5 })
  @ApiQuery({ name: 'minLat', type: Number, example: 4.0 })
  @ApiQuery({ name: 'maxLon', type: Number, example: 1.5 })
  @ApiQuery({ name: 'maxLat', type: Number, example: 6.0 })
  @ApiResponse({ 
    status: 200, 
    description: 'Returns landing sites within the specified bounds',
    type: [LandingSiteResponseDto] 
  })
  findByBounds(
    @Query('minLon', ParseFloatPipe) minLon: number,
    @Query('minLat', ParseFloatPipe) minLat: number,
    @Query('maxLon', ParseFloatPipe) maxLon: number,
    @Query('maxLat', ParseFloatPipe) maxLat: number,
  ): Promise<LandingSiteResponseDto[]> {
    return this.landingSiteService.findByBounds(minLon, minLat, maxLon, maxLat);
  }

  @Get('nearest')
  @ApiOperation({ summary: 'Get nearest landing sites to a location' })
  @ApiQuery({ name: 'longitude', type: Number, example: -0.017 })
  @ApiQuery({ name: 'latitude', type: Number, example: 5.619 })
  @ApiQuery({ name: 'limit', type: Number, required: false, default: 5 })
  @ApiResponse({ 
    status: 200, 
    description: 'Returns the nearest landing sites to the specified location',
    type: [LandingSiteResponseDto] 
  })
  findNearest(
    @Query('longitude', ParseFloatPipe) longitude: number,
    @Query('latitude', ParseFloatPipe) latitude: number,
    @Query('limit') limit?: number,
  ): Promise<LandingSiteResponseDto[]> {
    return this.landingSiteService.findNearest(longitude, latitude, limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a landing site by ID' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ 
    status: 200, 
    description: 'Returns the landing site',
    type: LandingSiteResponseDto 
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Landing site not found' 
  })
  findOne(@Param('id', ParseIntPipe) id: number): Promise<LandingSiteResponseDto> {
    return this.landingSiteService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new landing site' })
  @ApiResponse({ 
    status: 201, 
    description: 'Landing site created successfully',
    type: LandingSiteResponseDto 
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Invalid input data' 
  })
  create(@Body() createLandingSiteDto: CreateLandingSiteDto): Promise<LandingSiteResponseDto> {
    return this.landingSiteService.create(createLandingSiteDto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a landing site' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ 
    status: 200, 
    description: 'Landing site updated successfully',
    type: LandingSiteResponseDto 
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Landing site not found' 
  })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateLandingSiteDto: UpdateLandingSiteDto,
  ): Promise<LandingSiteResponseDto> {
    return this.landingSiteService.update(id, updateLandingSiteDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a landing site' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ 
    status: 200, 
    description: 'Landing site deleted successfully' 
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Landing site not found' 
  })
  remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.landingSiteService.remove(id);
  }
}