import { Controller, Get, Post, Put, Delete, Body, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { ResourceSettingsService } from './resource-settings.service';
import { SettingTypeInputDto } from './dto/setting-type-input.dto';
import { SettingTypeResponseDto } from './dto/setting-type-response.dto';
import { ResourceSettingInputDto } from './dto/resource-setting-input.dto';
import { ResourceSettingsMapResponseDto } from './dto/resource-setting-response.dto';

@ApiTags('resource-settings')
@Controller('settings')
export class ResourceSettingsController {
  constructor(private readonly resourceSettingsService: ResourceSettingsService) {}

  @Get('types/:resourceType')
  @ApiOperation({ summary: 'Get all setting types for a resource type' })
  @ApiParam({ 
    name: 'resourceType', 
    enum: ['vessel', 'route', 'landing_site', 'vessel_type'],
    description: 'Type of resource'
  })
  @ApiResponse({ status: 200, description: 'List of setting types', type: [SettingTypeResponseDto] })
  async getSettingTypes(
    @Param('resourceType') resourceType: string
  ): Promise<SettingTypeResponseDto[]> {
    return this.resourceSettingsService.findAllSettingTypes(resourceType);
  }

  @Post('types/:resourceType')
  @ApiOperation({ summary: 'Create a new setting type for a resource type' })
  @ApiParam({ 
    name: 'resourceType', 
    enum: ['vessel', 'route', 'landing_site', 'vessel_type'],
    description: 'Type of resource'
  })
  @ApiResponse({ status: 201, description: 'Setting type created', type: SettingTypeResponseDto })
  async createSettingType(
    @Param('resourceType') resourceType: string,
    @Body() dto: SettingTypeInputDto
  ): Promise<SettingTypeResponseDto> {
    return this.resourceSettingsService.createSettingType(resourceType, dto);
  }

  @Put('types/:resourceType/:settingKey')
  @ApiOperation({ summary: 'Update a setting type' })
  @ApiParam({ 
    name: 'resourceType', 
    enum: ['vessel', 'route', 'landing_site', 'vessel_type'],
    description: 'Type of resource'
  })
  @ApiParam({ name: 'settingKey', description: 'Setting key (1, 2, 3, etc.)' })
  @ApiResponse({ status: 200, description: 'Setting type updated', type: SettingTypeResponseDto })
  async updateSettingType(
    @Param('resourceType') resourceType: string,
    @Param('settingKey') settingKey: string,
    @Body() dto: SettingTypeInputDto
  ): Promise<SettingTypeResponseDto> {
    return this.resourceSettingsService.updateSettingType(resourceType, settingKey, dto);
  }

  @Delete('types/:resourceType/:settingKey')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a setting type (cascades to all resource settings)' })
  @ApiParam({ 
    name: 'resourceType', 
    enum: ['vessel', 'route', 'landing_site', 'vessel_type'],
    description: 'Type of resource'
  })
  @ApiParam({ name: 'settingKey', description: 'Setting key (1, 2, 3, etc.)' })
  @ApiResponse({ status: 204, description: 'Setting type deleted' })
  async deleteSettingType(
    @Param('resourceType') resourceType: string,
    @Param('settingKey') settingKey: string
  ): Promise<void> {
    await this.resourceSettingsService.deleteSettingType(resourceType, settingKey);
  }

  @Get('resources/:resourceType/:resourceId')
  @ApiOperation({ summary: 'Get all settings for a specific resource' })
  @ApiParam({ 
    name: 'resourceType', 
    enum: ['vessel', 'route', 'landing_site', 'vessel_type'],
    description: 'Type of resource'
  })
  @ApiParam({ name: 'resourceId', description: 'ID of the resource' })
  @ApiResponse({ status: 200, description: 'Resource settings', type: ResourceSettingsMapResponseDto })
  async getResourceSettings(
    @Param('resourceType') resourceType: string,
    @Param('resourceId') resourceId: string
  ): Promise<ResourceSettingsMapResponseDto> {
    return this.resourceSettingsService.getResourceSettings(resourceType, parseInt(resourceId));
  }

  @Put('resources/:resourceType/:resourceId')
  @ApiOperation({ summary: 'Update settings for a specific resource' })
  @ApiParam({ 
    name: 'resourceType', 
    enum: ['vessel', 'route', 'landing_site', 'vessel_type'],
    description: 'Type of resource'
  })
  @ApiParam({ name: 'resourceId', description: 'ID of the resource' })
  @ApiResponse({ status: 200, description: 'Settings updated', type: ResourceSettingsMapResponseDto })
  async updateResourceSettings(
    @Param('resourceType') resourceType: string,
    @Param('resourceId') resourceId: string,
    @Body() dto: ResourceSettingInputDto
  ): Promise<ResourceSettingsMapResponseDto> {
    return this.resourceSettingsService.updateResourceSettings(
      resourceType, 
      parseInt(resourceId), 
      dto
    );
  }

  @Delete('resources/:resourceType/:resourceId/:settingKey')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a specific setting for a resource' })
  @ApiParam({ 
    name: 'resourceType', 
    enum: ['vessel', 'route', 'landing_site', 'vessel_type'],
    description: 'Type of resource'
  })
  @ApiParam({ name: 'resourceId', description: 'ID of the resource' })
  @ApiParam({ name: 'settingKey', description: 'Setting key to delete' })
  @ApiResponse({ status: 204, description: 'Setting deleted' })
  async deleteResourceSetting(
    @Param('resourceType') resourceType: string,
    @Param('resourceId') resourceId: string,
    @Param('settingKey') settingKey: string
  ): Promise<void> {
    await this.resourceSettingsService.deleteResourceSetting(
      resourceType,
      parseInt(resourceId),
      settingKey
    );
  }
}