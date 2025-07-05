import { Controller, Get, Post, Body, Param, Delete, ParseIntPipe, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { TreeStubService } from './tree-stub.service';
import { TreeStubInputDto } from './dto/tree-stub-input.dto';
import { TreeStubResponseDto } from './dto/tree-stub-response.dto';

@ApiTags('tree-stubs')
@Controller('tree-stubs')
export class TreeStubController {
  constructor(private readonly treeStubService: TreeStubService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new tree stub' })
  @ApiResponse({ status: 201, description: 'Tree stub created successfully', type: TreeStubResponseDto })
  create(@Body() createTreeStubDto: TreeStubInputDto): Promise<TreeStubResponseDto> {
    return this.treeStubService.create(createTreeStubDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all tree stubs or filter by group' })
  @ApiQuery({ name: 'group_id', required: false, description: 'Filter by group ID' })
  @ApiResponse({ status: 200, description: 'List of tree stubs', type: [TreeStubResponseDto] })
  findAll(@Query('group_id') groupId?: string): Promise<TreeStubResponseDto[]> {
    if (groupId) {
      return this.treeStubService.findByGroup(parseInt(groupId));
    }
    return this.treeStubService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a tree stub by ID' })
  @ApiResponse({ status: 200, description: 'Tree stub details', type: TreeStubResponseDto })
  @ApiResponse({ status: 404, description: 'Tree stub not found' })
  findOne(@Param('id', ParseIntPipe) id: number): Promise<TreeStubResponseDto> {
    return this.treeStubService.findOne(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a tree stub' })
  @ApiResponse({ status: 200, description: 'Tree stub deleted successfully' })
  @ApiResponse({ status: 404, description: 'Tree stub not found' })
  remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.treeStubService.remove(id);
  }

  @Delete('group/:groupId')
  @ApiOperation({ summary: 'Delete all tree stubs in a group' })
  @ApiResponse({ status: 200, description: 'Tree stubs deleted successfully' })
  removeByGroup(@Param('groupId', ParseIntPipe) groupId: number): Promise<void> {
    return this.treeStubService.removeByGroup(groupId);
  }
}