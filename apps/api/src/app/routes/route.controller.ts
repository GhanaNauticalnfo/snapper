import { Controller, Get, Post, Put, Delete, Body, Param, ParseIntPipe } from '@nestjs/common';
import { RouteService } from './route.service';
import { Route } from './route.entity';

@Controller('routes')
export class RouteController {
  constructor(private readonly routeService: RouteService) {}

  @Get()
  findAll(): Promise<Route[]> {
    return this.routeService.findAll();
  }

  @Get('enabled')
  findEnabled(): Promise<Route[]> {
    return this.routeService.findEnabled();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number): Promise<Route> {
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