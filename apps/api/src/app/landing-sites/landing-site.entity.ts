import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import { GeoPoint } from '@ghanawaters/shared-models';
import { LandingSiteResponseDto } from './dto/landing-site-response.dto';

@Entity('landing_sites')
export class LandingSite {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column({
    type: 'geography',
    spatialFeatureType: 'Point',
    srid: 4326,
    transformer: {
      from: (value: any) => {
        if (!value) return null;
        // TypeORM returns GeoJSON string for geography types
        if (typeof value === 'string') {
          return JSON.parse(value);
        }
        return value;
      },
      to: (value: GeoPoint) => value,
    },
  })
  @Index({ spatial: true })
  location: GeoPoint;

  @Column({ default: 'active' })
  status: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  toResponseDto(settings?: Record<string, string>): LandingSiteResponseDto {
    const dto: LandingSiteResponseDto = {
      id: this.id,
      name: this.name,
      description: this.description,
      location: this.location,
      status: this.status,
      created_at: this.created_at.toISOString(),
      updated_at: this.updated_at.toISOString(),
    };

    if (settings) {
      dto.settings = settings;
    }

    return dto;
  }
}