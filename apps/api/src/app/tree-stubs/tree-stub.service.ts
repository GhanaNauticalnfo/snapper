import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TreeStub } from './tree-stub.entity';
import { TreeStubInputDto } from './dto/tree-stub-input.dto';
import { TreeStubResponseDto } from './dto/tree-stub-response.dto';

@Injectable()
export class TreeStubService {
  constructor(
    @InjectRepository(TreeStub)
    private treeStubRepository: Repository<TreeStub>,
  ) {}

  async findAll(): Promise<TreeStubResponseDto[]> {
    const stubs = await this.treeStubRepository.find({
      order: { created_at: 'DESC' }
    });
    return stubs.map(stub => stub.toResponseDto());
  }

  async findByGroup(groupId: number): Promise<TreeStubResponseDto[]> {
    const stubs = await this.treeStubRepository.find({
      where: { group_id: groupId },
      order: { created_at: 'DESC' }
    });
    return stubs.map(stub => stub.toResponseDto());
  }

  async findOne(id: number): Promise<TreeStubResponseDto> {
    const stub = await this.treeStubRepository.findOne({
      where: { id }
    });
    
    if (!stub) {
      throw new NotFoundException(`Tree stub with ID ${id} not found`);
    }
    
    return stub.toResponseDto();
  }

  async create(createTreeStubDto: TreeStubInputDto): Promise<TreeStubResponseDto> {
    // Convert GeoJSON to PostGIS format if needed
    let geometry = createTreeStubDto.geometry;
    if (createTreeStubDto.geometry.startsWith('{')) {
      // Assume it's GeoJSON, convert to WKT
      const geoJson = JSON.parse(createTreeStubDto.geometry);
      if (geoJson.type === 'Point') {
        geometry = `POINT(${geoJson.coordinates[0]} ${geoJson.coordinates[1]})`;
      } else if (geoJson.type === 'Polygon') {
        const coords = geoJson.coordinates[0].map((coord: number[]) => `${coord[0]} ${coord[1]}`).join(', ');
        geometry = `POLYGON((${coords}))`;
      }
    }

    const stub = this.treeStubRepository.create({
      group_id: createTreeStubDto.group_id,
      geometry: `ST_GeogFromText('${geometry}')`
    });
    
    const savedStub = await this.treeStubRepository.save(stub);
    return await this.findOne(savedStub.id);
  }

  async remove(id: number): Promise<void> {
    const result = await this.treeStubRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Tree stub with ID ${id} not found`);
    }
  }

  async removeByGroup(groupId: number): Promise<void> {
    await this.treeStubRepository.delete({ group_id: groupId });
  }
}