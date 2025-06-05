// vessel.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Vessel } from './vessel.entity';
import { Device } from './device.entity';
import { TrackingPoint } from './tracking-point.entity';

@Injectable()
export class VesselService {
  constructor(
    @InjectRepository(Vessel)
    private vesselRepository: Repository<Vessel>,
    @InjectRepository(Device)
    private deviceRepository: Repository<Device>,
    @InjectRepository(TrackingPoint)
    private trackingRepository: Repository<TrackingPoint>,
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
    // Use a transaction to ensure all related data is deleted atomically
    await this.vesselRepository.manager.transaction(async manager => {
      // First, count and delete all tracking points for this vessel
      const trackingCount = await manager.count(TrackingPoint, { where: { vessel_id: id } });
      if (trackingCount > 0) {
        await manager.delete(TrackingPoint, { vessel_id: id });
        console.log(`Deleted ${trackingCount} tracking points for vessel ${id}`);
      }
      
      // Then, count and delete all devices associated with this vessel
      const deviceCount = await manager.count(Device, { where: { vessel_id: id } });
      if (deviceCount > 0) {
        await manager.delete(Device, { vessel_id: id });
        console.log(`Deleted ${deviceCount} devices for vessel ${id}`);
      }
      
      // Finally, delete the vessel itself
      await manager.delete(Vessel, { id });
      console.log(`Deleted vessel ${id} and all associated data`);
    });
  }
}