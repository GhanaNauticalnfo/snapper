import { Controller, Get, Redirect } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AppService } from './app.service';

@ApiTags('health')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({ summary: 'Get API health status' })
  @ApiResponse({ status: 200, description: 'API is healthy' })
  getData() {
    return this.appService.getData();
  }
}
