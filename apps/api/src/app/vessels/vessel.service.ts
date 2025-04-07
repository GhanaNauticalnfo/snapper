// vessel.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Vessel } from './vessel.entity';

@Injectable()
export class VesselService {
  constructor(
    @InjectRepository(Vessel)
    private vesselRepository: Repository<Vessel>,
  ) {}

  async findAll(): Promise<Vessel[]> {
    return this.vesselRepository.find({
      order: {
        name: 'ASC'
      }
    });
  }

  async findOne(id: number): Promise<Vessel> {
    return this.vesselRepository.findOne({ 
      where: { id },
      relations: ['tracking_points']
    });
  }

  async findByRegistration(registrationNumber: string): Promise<Vessel> {
    return this.vesselRepository.findOne({
      where: { registration_number: registrationNumber }
    });
  }

  async findActive(): Promise<Vessel[]> {
    return this.vesselRepository.find({
      where: { active: true },
      order: {
        name: 'ASC'
      }
    });
  }

  async create(vesselData: Partial<Vessel>): Promise<Vessel> {
    const vessel = this.vesselRepository.create(vesselData);
    return this.vesselRepository.save(vessel);
  }

  async update(id: number, vesselData: Partial<Vessel>): Promise<Vessel> {
    await this.vesselRepository.update(id, vesselData);
    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    await this.vesselRepository.delete(id);
  }
}