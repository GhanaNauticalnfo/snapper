// vessel.entity.ts
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, OneToMany, ManyToOne, JoinColumn } from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { VesselTelemetry } from './tracking/vessel-telemetry.entity';
import { VesselType } from './type/vessel-type.entity';
import { VesselResponseDto } from './dto/vessel-response.dto';
import { GeoPoint } from '@snapper/shared-models';

@Entity()
export class Vessel {
  @PrimaryGeneratedColumn()
  @ApiProperty({ description: 'Unique identifier for the vessel', example: 1 })
  id: number;

  @CreateDateColumn()
  @ApiProperty({ description: 'Timestamp when the vessel was created', type: Date })
  created: Date;

  @UpdateDateColumn()
  @ApiProperty({ description: 'Timestamp when the vessel was last updated', type: Date })
  last_updated: Date;

  @Column('varchar', { length: 255 })
  @ApiProperty({ description: 'Name of the vessel', example: 'MV Ghana Star' })
  name: string;

  @ManyToOne(() => VesselType, vesselType => vesselType.vessels, { nullable: false })
  @JoinColumn({ name: 'vessel_type_id' })
  @ApiProperty({ description: 'Vessel type', type: () => VesselType })
  vessel_type: VesselType;

  @Column('numeric', { precision: 5, scale: 2, nullable: true })
  @ApiPropertyOptional({ description: 'Length of the vessel in meters', example: 25.5 })
  length_meters: number;

  @Column('varchar', { length: 255, nullable: true })
  @ApiPropertyOptional({ description: 'Name of the vessel owner', example: 'Ghana Maritime Co. Ltd.' })
  owner_name: string;

  @Column('varchar', { length: 255, nullable: true })
  @ApiPropertyOptional({ description: 'Contact information for the vessel owner', example: '+233 20 123 4567' })
  owner_contact: string;

  @Column('varchar', { length: 100, nullable: true })
  @ApiPropertyOptional({ description: 'Home port of the vessel', example: 'Tema' })
  home_port: string;


  @Column('integer', { nullable: true })
  latest_position_id: number;

  @ManyToOne(() => VesselTelemetry)
  @JoinColumn({ name: 'latest_position_id' })
  @ApiPropertyOptional({ description: 'Latest tracking position for this vessel', type: () => VesselTelemetry })
  latest_position: VesselTelemetry;

  toResponseDto(coordinates?: GeoPoint, settings?: Record<string, string>): VesselResponseDto {
    const dto: VesselResponseDto = {
      id: this.id,
      created: this.created,
      last_updated: this.last_updated,
      name: this.name,
      vessel_type: this.vessel_type?.toResponseDto(),
      length_meters: this.length_meters,
      owner_name: this.owner_name,
      owner_contact: this.owner_contact,
      home_port: this.home_port,
    };


    // Include latest position data if available
    if (this.latest_position) {
      dto.latest_position_timestamp = this.latest_position.timestamp;
      dto.latest_position_speed = this.latest_position.speed_knots;
      dto.latest_position_heading = this.latest_position.heading_degrees;
      
      if (coordinates) {
        dto.latest_position_coordinates = coordinates;
      }
    }

    // Include settings if provided
    if (settings) {
      dto.settings = settings;
    }

    return dto;
  }
}