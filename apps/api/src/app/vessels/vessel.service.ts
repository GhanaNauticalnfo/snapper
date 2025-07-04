// vessel.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Vessel } from './vessel.entity';
import { Device } from './device';
import { VesselTelemetry } from './tracking/vessel-telemetry.entity';
import { VesselType } from './type/vessel-type.entity';
import { CreateVesselDto } from './dto/create-vessel.dto';
import { UpdateVesselDto } from './dto/update-vessel.dto';
import { VesselResponseDto } from './dto/vessel-response.dto';
import { GeoPoint } from '@ghanawaters/shared-models';
import { ResourceSettingsService } from '../resource-settings/resource-settings.service';

@Injectable()
export class VesselService {
  constructor(
    @InjectRepository(Vessel)
    private vesselRepository: Repository<Vessel>,
    @InjectRepository(Device)
    private deviceRepository: Repository<Device>,
    @InjectRepository(VesselTelemetry)
    private trackingRepository: Repository<VesselTelemetry>,
    @InjectRepository(VesselType)
    private vesselTypeRepository: Repository<VesselType>,
    private resourceSettingsService: ResourceSettingsService,
  ) {}

  async findAll(): Promise<VesselResponseDto[]> {
    const vessels = await this.vesselRepository.find({
      relations: ['vessel_type'],
      order: {
        name: 'ASC'
      }
    });
    
    const result = [];
    for (const vessel of vessels) {
      const settings = await this.resourceSettingsService.getSettingsForResource('vessel', vessel.id);
      result.push(vessel.toResponseDto(undefined, settings));
    }
    
    return result;
  }

  async findAllWithLatestPositions(): Promise<VesselResponseDto[]> {
    const vessels = await this.vesselRepository.find({
      relations: ['vessel_type', 'latest_position'],
      order: {
        name: 'ASC'
      }
    });

    const result = [];
    for (const vessel of vessels) {
      let coordinates = undefined;
      
      // Get coordinates if latest position exists
      if (vessel.latest_position) {
        const coordsResult = await this.trackingRepository.query(
          'SELECT ST_X(position::geometry) as longitude, ST_Y(position::geometry) as latitude FROM vessel_telemetry WHERE id = $1',
          [vessel.latest_position.id]
        );
        
        if (coordsResult[0]) {
          coordinates = {
            type: 'Point',
            coordinates: [coordsResult[0].longitude, coordsResult[0].latitude]
          } as GeoPoint;
        }
      }
      
      const settings = await this.resourceSettingsService.getSettingsForResource('vessel', vessel.id);
      result.push(vessel.toResponseDto(coordinates, settings));
    }
    
    return result;
  }

  async findOne(id: number): Promise<VesselResponseDto> {
    const vessel = await this.vesselRepository.findOne({ 
      where: { id },
      relations: ['vessel_type', 'latest_position']
    });
    
    if (!vessel) return null;
    
    let coordinates = undefined;
    
    // Get coordinates if latest position exists
    if (vessel.latest_position) {
      const coordsResult = await this.trackingRepository.query(
        'SELECT ST_X(position::geometry) as longitude, ST_Y(position::geometry) as latitude FROM vessel_telemetry WHERE id = $1',
        [vessel.latest_position.id]
      );
      
      if (coordsResult[0]) {
        coordinates = {
          type: 'Point',
          coordinates: [coordsResult[0].longitude, coordsResult[0].latitude]
        } as GeoPoint;
      }
    }
    
    const settings = await this.resourceSettingsService.getSettingsForResource('vessel', vessel.id);
    return vessel.toResponseDto(coordinates, settings);
  }

  async findOneEntity(id: number): Promise<Vessel> {
    return this.vesselRepository.findOne({ 
      where: { id },
      relations: ['vessel_type']
    });
  }



  async create(createVesselDto: CreateVesselDto): Promise<VesselResponseDto> {
    console.log('=== VESSEL SERVICE CREATE DEBUG ===');
    console.log('Creating vessel:', JSON.stringify(createVesselDto, null, 2));
    console.log('Timestamp:', new Date().toISOString());
    
    // Find the vessel type
    const vesselType = await this.vesselTypeRepository.findOne({
      where: { id: createVesselDto.vessel_type_id }
    });

    if (!vesselType) {
      throw new BadRequestException(`Vessel type with ID ${createVesselDto.vessel_type_id} not found`);
    }

    // Create vessel with the vessel type relation
    const vessel = this.vesselRepository.create({
      ...createVesselDto,
      vessel_type: vesselType
    });
    
    const savedVessel = await this.vesselRepository.save(vessel);
    console.log('DEBUG: Vessel saved with ID:', savedVessel.id);
    
    // Check if any devices exist for this vessel (should be none!)
    const deviceCount = await this.deviceRepository.count({ where: { vessel_id: savedVessel.id } });
    console.log('DEBUG: Device count after vessel creation:', deviceCount);
    if (deviceCount > 0) {
      console.log('WARNING: Devices found for newly created vessel!');
      const devices = await this.deviceRepository.find({ where: { vessel_id: savedVessel.id } });
      devices.forEach(d => {
        console.log(`  - Device ${d.device_id}: state=${d.state}, created=${d.created_at}`);
      });
    }
    
    // Reload with relations
    const vesselWithRelations = await this.vesselRepository.findOne({
      where: { id: savedVessel.id },
      relations: ['vessel_type']
    });
    console.log('=== END VESSEL SERVICE CREATE DEBUG ===');
    return vesselWithRelations.toResponseDto();
  }

  async update(id: number, updateVesselDto: UpdateVesselDto): Promise<VesselResponseDto> {
    const updateData: any = { ...updateVesselDto };
    
    // If vessel_type_id is provided, find and set the vessel type relation
    if (updateVesselDto.vessel_type_id) {
      const vesselType = await this.vesselTypeRepository.findOne({
        where: { id: updateVesselDto.vessel_type_id }
      });

      if (!vesselType) {
        throw new BadRequestException(`Vessel type with ID ${updateVesselDto.vessel_type_id} not found`);
      }

      updateData.vessel_type = vesselType;
      delete updateData.vessel_type_id;
    }

    await this.vesselRepository.update(id, updateData);
    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    // Use a transaction to ensure all related data is deleted atomically
    await this.vesselRepository.manager.transaction(async manager => {
      // First, clear the latest_position_id from the vessel to break the circular reference
      await manager.update(Vessel, { id }, { latest_position_id: null });
      console.log(`Cleared latest_position_id for vessel ${id}`);
      
      // Then, count and delete all tracking points for this vessel
      const trackingCount = await manager.count(VesselTelemetry, { where: { vessel_id: id } });
      if (trackingCount > 0) {
        await manager.delete(VesselTelemetry, { vessel_id: id });
        console.log(`Deleted ${trackingCount} vessel telemetry records for vessel ${id}`);
      }
      
      // Next, count and delete all devices associated with this vessel
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