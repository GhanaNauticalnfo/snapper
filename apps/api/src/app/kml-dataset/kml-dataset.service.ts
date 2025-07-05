// kml-dataset.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { KmlDataset } from './kml-dataset.entity';

@Injectable()
export class KmlDatasetService {
  constructor(
    @InjectRepository(KmlDataset)
    private kmlDatasetRepository: Repository<KmlDataset>,
  ) {}

  async findAll(): Promise<KmlDataset[]> {
    return this.kmlDatasetRepository.find();
  }

  async findOne(id: number): Promise<KmlDataset> {
    return this.kmlDatasetRepository.findOne({ where: { id } });
  }

  // kml-dataset.service.ts - add this new method
async findAllEnabled(): Promise<{ id: number; last_updated: Date }[]> {
    const datasets = await this.kmlDatasetRepository.find({
      select: {
        id: true,
        last_updated: true
      },
      where: {
        enabled: true
      },
      order: {
        last_updated: 'DESC'
      }
    });
    
    return datasets;
  }
  
async create(kmlData: string, name: string, enabled = true): Promise<KmlDataset> {
    const kmlDataset = new KmlDataset();
    kmlDataset.kml = kmlData;
    kmlDataset.name = name;
    kmlDataset.enabled = enabled;
    
    return this.kmlDatasetRepository.save(kmlDataset);
  }
  
  async update(id: number, data: { kml?: string, name?: string, enabled?: boolean }): Promise<KmlDataset> {
    const kmlDataset = await this.findOne(id);
    
    if (!kmlDataset) {
      throw new Error('KML dataset not found');
    }
    
    if (data.kml !== undefined) {
      kmlDataset.kml = data.kml;
    }
    
    if (data.name !== undefined) {
      kmlDataset.name = data.name;
    }
    
    if (data.enabled !== undefined) {
      kmlDataset.enabled = data.enabled;
    }
    
    return this.kmlDatasetRepository.save(kmlDataset);
  }

  async remove(id: number): Promise<void> {
    await this.kmlDatasetRepository.delete(id);
  }
}