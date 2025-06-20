import { Controller, Get, Post, Put, Delete, Body, Param, ParseIntPipe } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RouteService } from './route.service';
import { Route } from './route.entity';
import { RouteResponseDto } from './dto/route-response.dto';

@ApiTags('routes')
@Controller('routes')
export class RouteController {
  constructor(private readonly routeService: RouteService) {}

  @Get()
  findAll(): Promise<RouteResponseDto[]> {
    return this.routeService.findAll();
  }


  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number): Promise<RouteResponseDto> {
    return this.routeService.findOne(id);
  }

  @Post()
  create(@Body() route: Partial<Route>): Promise<Route> {
    return this.routeService.create(route);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() route: Partial<Route>,
  ): Promise<Route> {
    return this.routeService.update(id, route);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.routeService.remove(id);
  }
}