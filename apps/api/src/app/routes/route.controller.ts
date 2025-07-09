import { Controller, Get, Post, Put, Delete, Body, Param, ParseIntPipe, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBadRequestResponse } from '@nestjs/swagger';
import { RouteService } from './route.service';
import { RouteResponseDto } from './dto/route-response.dto';
import { RouteInputDto } from './dto/route-input.dto';

@ApiTags('routes')
@Controller('routes')
export class RouteController {
  constructor(private readonly routeService: RouteService) {}

  @Get()
  @ApiOperation({ summary: 'Get all routes' })
  @ApiResponse({ status: 200, description: 'Returns all routes', type: [RouteResponseDto] })
  findAll(): Promise<RouteResponseDto[]> {
    return this.routeService.findAll();
  }


  @Get(':id')
  @ApiOperation({ summary: 'Get a route by id' })
  @ApiResponse({ status: 200, description: 'Returns the route', type: RouteResponseDto })
  @ApiResponse({ status: 404, description: 'Route not found' })
  findOne(@Param('id', ParseIntPipe) id: number): Promise<RouteResponseDto> {
    return this.routeService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new route' })
  @ApiResponse({ status: 201, description: 'Route created successfully', type: RouteResponseDto })
  @ApiBadRequestResponse({ 
    description: 'Validation failed. Possible errors:\n' +
      '- Route must have at least 2 waypoints\n' +
      '- Waypoint orders must be unique within the route\n' +
      '- Route waypoints cannot all be at the same location\n' +
      '- Invalid latitude/longitude values\n' +
      '- Route is too short (waypoints too close together)\n' +
      '- GeoJSON conversion failed'
  })
  async create(@Body() routeInput: RouteInputDto): Promise<RouteResponseDto> {
    const route = await this.routeService.create(routeInput);
    return route.toResponseDto();
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a route' })
  @ApiResponse({ status: 200, description: 'Route updated successfully', type: RouteResponseDto })
  @ApiResponse({ status: 404, description: 'Route not found' })
  @ApiBadRequestResponse({ 
    description: 'Validation failed. Possible errors:\n' +
      '- Route must have at least 2 waypoints\n' +
      '- Waypoint orders must be unique within the route\n' +
      '- Route waypoints cannot all be at the same location\n' +
      '- Invalid latitude/longitude values\n' +
      '- Route is too short (waypoints too close together)\n' +
      '- GeoJSON conversion failed'
  })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() routeInput: RouteInputDto,
  ): Promise<RouteResponseDto> {
    const route = await this.routeService.update(id, routeInput);
    return route.toResponseDto();
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a route' })
  @ApiResponse({ status: 204, description: 'Route deleted successfully' })
  @ApiResponse({ status: 404, description: 'Route not found' })
  remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.routeService.remove(id);
  }
}