import { Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { TreeStubGroupService } from './tree-stub-group.service';
import { TreeStubGroupInputDto } from './dto/tree-stub-group-input.dto';
import { TreeStubGroupResponseDto } from './dto/tree-stub-group-response.dto';

@ApiTags('tree-stub-groups')
@Controller('tree-stub-groups')
export class TreeStubGroupController {
  constructor(private readonly treeStubGroupService: TreeStubGroupService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new tree stub group' })
  @ApiResponse({ status: 201, description: 'Tree stub group created successfully', type: TreeStubGroupResponseDto })
  create(@Body() createTreeStubGroupDto: TreeStubGroupInputDto): Promise<TreeStubGroupResponseDto> {
    return this.treeStubGroupService.create(createTreeStubGroupDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all tree stub groups' })
  @ApiResponse({ status: 200, description: 'List of tree stub groups', type: [TreeStubGroupResponseDto] })
  findAll(): Promise<TreeStubGroupResponseDto[]> {
    return this.treeStubGroupService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a tree stub group by ID' })
  @ApiResponse({ status: 200, description: 'Tree stub group details', type: TreeStubGroupResponseDto })
  @ApiResponse({ status: 404, description: 'Tree stub group not found' })
  findOne(@Param('id', ParseIntPipe) id: number): Promise<TreeStubGroupResponseDto> {
    return this.treeStubGroupService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a tree stub group' })
  @ApiResponse({ status: 200, description: 'Tree stub group updated successfully', type: TreeStubGroupResponseDto })
  @ApiResponse({ status: 404, description: 'Tree stub group not found' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateTreeStubGroupDto: TreeStubGroupInputDto
  ): Promise<TreeStubGroupResponseDto> {
    return this.treeStubGroupService.update(id, updateTreeStubGroupDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a tree stub group' })
  @ApiResponse({ status: 200, description: 'Tree stub group deleted successfully' })
  @ApiResponse({ status: 404, description: 'Tree stub group not found' })
  remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.treeStubGroupService.remove(id);
  }
}