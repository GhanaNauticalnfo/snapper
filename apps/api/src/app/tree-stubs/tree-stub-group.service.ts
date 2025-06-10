import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TreeStubGroup } from './tree-stub-group.entity';
import { TreeStubGroupInputDto } from './dto/tree-stub-group-input.dto';
import { TreeStubGroupResponseDto } from './dto/tree-stub-group-response.dto';

@Injectable()
export class TreeStubGroupService {
  constructor(
    @InjectRepository(TreeStubGroup)
    private treeStubGroupRepository: Repository<TreeStubGroup>,
  ) {}

  async findAll(): Promise<TreeStubGroupResponseDto[]> {
    const groups = await this.treeStubGroupRepository.find({
      relations: ['tree_stubs'],
      order: { created_at: 'DESC' }
    });
    return groups.map(group => group.toResponseDto());
  }

  async findOne(id: number): Promise<TreeStubGroupResponseDto> {
    const group = await this.treeStubGroupRepository.findOne({
      where: { id },
      relations: ['tree_stubs']
    });
    
    if (!group) {
      throw new NotFoundException(`Tree stub group with ID ${id} not found`);
    }
    
    return group.toResponseDto();
  }

  async create(createTreeStubGroupDto: TreeStubGroupInputDto): Promise<TreeStubGroupResponseDto> {
    const group = this.treeStubGroupRepository.create(createTreeStubGroupDto);
    const savedGroup = await this.treeStubGroupRepository.save(group);
    
    return await this.findOne(savedGroup.id);
  }

  async update(id: number, updateTreeStubGroupDto: TreeStubGroupInputDto): Promise<TreeStubGroupResponseDto> {
    const group = await this.treeStubGroupRepository.findOne({ where: { id } });
    if (!group) {
      throw new NotFoundException(`Tree stub group with ID ${id} not found`);
    }

    Object.assign(group, updateTreeStubGroupDto);
    await this.treeStubGroupRepository.save(group);
    
    return await this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    const result = await this.treeStubGroupRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Tree stub group with ID ${id} not found`);
    }
  }
}