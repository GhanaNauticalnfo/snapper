import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Vessel } from '../vessel.entity';
import { VesselTypeResponseDto } from './dto/vessel-type-response.dto';

@Entity()
export class VesselType {
  @PrimaryGeneratedColumn()
  @ApiProperty({ description: 'Unique identifier for the vessel type', example: 1 })
  id: number;

  @Column('varchar', { length: 30, unique: true })
  @ApiProperty({ description: 'Name of the vessel type', example: 'Cargo' })
  name: string;

  @Column({ default: '#3B82F6' })
  @ApiProperty({ description: 'Color for the vessel type in hex format', example: '#3B82F6' })
  color: string;

  @CreateDateColumn()
  @ApiProperty({ description: 'Timestamp when the vessel type was created', type: Date })
  created_at: Date;

  @UpdateDateColumn()
  @ApiProperty({ description: 'Timestamp when the vessel type was last updated', type: Date })
  updated_at: Date;

  @OneToMany(() => Vessel, vessel => vessel.vessel_type)
  vessels: Vessel[];

  toResponseDto(settings?: Record<string, string>): VesselTypeResponseDto {
    const dto: VesselTypeResponseDto = {
      id: this.id,
      name: this.name,
      color: this.color,
      created_at: this.created_at.toISOString(),
      updated_at: this.updated_at.toISOString(),
      vessel_count: this.vessels?.length || 0
    };

    if (settings) {
      dto.settings = settings;
    }

    return dto;
  }
}